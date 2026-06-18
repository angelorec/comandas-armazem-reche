const express = require('express');
const cors = require('cors');
const { printer: ThermalPrinter, types: Types } = require('node-thermal-printer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================================
// CONFIGURAÇÃO DA IMPRESSORA FÍSICA:
// 
// IMPORTANTE:
// - Para impressora na REDE: use TCP (ex: 'tcp://192.168.1.100:9100')
// - Para impressora USB no WINDOWS: use 'printer:NOME_DA_IMPRESSORA'
// - Para impressora USB no LINUX/OSX: use a porta (ex: '/dev/usb/lp0')
// =========================================================================
const PRINTER_INTERFACE = 'printer:EPSON TM-T(180dpi) Receipt6'; 
const PRINTER_TYPE = Types.EPSON; // Use Types.EPSON ou Types.BEMATECH conforme o modelo de sua impressora

const isWindowsNativePrinter = PRINTER_INTERFACE.startsWith('printer:') && process.platform === 'win32';

// Se for impressora local do Windows (inicia com 'printer:'), criamos uma interface customizada em objeto
// para evitar o erro "No driver set!" do node-thermal-printer. Esse objeto intercepta o execute() e grava os bytes cruas
// em um arquivo temporário, que depois é enviado para a impressora via PowerShell.
let actualInterface;
if (isWindowsNativePrinter) {
  actualInterface = {
    execute: function(buffer) {
      return new Promise((resolve, reject) => {
        try {
          const buf = Buffer.from(buffer);
          fs.writeFileSync(path.resolve('printer-job.bin'), buf);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    },
    isPrinterConnected: function() {
      return Promise.resolve(true);
    }
  };
} else {
  actualInterface = PRINTER_INTERFACE;
}

const printer = new ThermalPrinter({
  type: PRINTER_TYPE,
  interface: actualInterface,
  characterSet: 'PC860_PORTUGUESE',
  removeSpecialCharacters: false,
  lineCharacter: "=",
});

/**
 * Função de impressão direta de bytes puros para o Spooler do Windows via PowerShell
 */
function printRawWindows(printerName, filePath) {
  return new Promise((resolve, reject) => {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      return reject(new Error(`Arquivo temporário não encontrado: ${absolutePath}`));
    }
    
    // Script em C# que abre a impressora e envia a sequência de bytes crua
    const psScript = `
$code = @"
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterA", SetLastError=true, CharSet=CharSet.Ansi, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter = new IntPtr(0);
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "RAW ESCPOS";
        di.pDataType = "RAW";
        if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
            if (StartDocPrinter(hPrinter, 1, di)) {
                if (StartPagePrinter(hPrinter)) {
                    IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
                    Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);
                    int dwWritten = 0;
                    WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
                    Marshal.FreeCoTaskMem(pUnmanagedBytes);
                    EndPagePrinter(hPrinter);
                }
                EndDocPrinter(hPrinter);
            }
            ClosePrinter(hPrinter);
        }
        return true;
    }
}
"@
Add-Type -TypeDefinition $code
$bytes = [System.IO.File]::ReadAllBytes('${absolutePath.replace(/\\/g, '\\\\')}')
[RawPrinter]::SendBytesToPrinter('${printerName.replace(/'/g, "''")}', $bytes)
`;

    // Minimiza espaços novos para passagem limpa por linha de comando
    const cleanScript = psScript.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');
    const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "${cleanScript}"`;

    exec(command, (error, stdout, stderr) => {
      // Remover sempre o arquivo de job local temporário
      try {
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (e) {
        // ignore error
      }

      if (error) {
        console.error('[-] Falha executando o spooler do Windows:', stderr || error.message);
        reject(error);
      } else {
        console.log(`[✓] Envio bem-sucedido para a fila de impressão do Windows!`);
        resolve();
      }
    });
  });
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Agente de Impressão Local - Armazém Reche</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f3f4f6;
          color: #1f2937;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background-color: white;
          padding: 2.5rem;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          max-width: 500px;
          text-align: center;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          background-color: #def7ec;
          color: #03543f;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }
        .status-dot {
          width: 8px;
          height: 8px;
          background-color: #31c48d;
          border-radius: 50%;
          margin-right: 0.5rem;
          animation: pulse 2s infinite;
        }
        h1 {
          font-size: 1.5rem;
          margin: 0 0 1rem 0;
          color: #111827;
        }
        p {
          color: #4b5563;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        .url-box {
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          border-radius: 6px;
          font-family: monospace;
          word-break: break-all;
          user-select: all;
          font-size: 0.95rem;
          color: #2563eb;
          font-weight: bold;
        }
        .footer {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 2rem;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(49, 196, 141, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(49, 196, 141, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(49, 196, 141, 0); }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="status-badge">
          <span class="status-dot"></span>
          Agente Local Online
        </div>
        <h1>Armazém Reche</h1>
        <p>O seu Agente de Impressão Térmica Local está rodando com sucesso!</p>
        <p>Copie este link gerado e cole-o nas configurações do seu painel web:</p>
        <div class="url-box" id="url-text"></div>
        <p style="font-size: 0.85rem; color: #6b7280; margin-top: 1rem;">
          <em>Dica: Não feche este terminal de comando para manter a impressora operando.</em>
        </p>
        <div class="footer">
          Conexão Segura ESC/POS &bull; Armazém Reche &copy; 2026
        </div>
      </div>
      <script>
        document.getElementById('url-text').innerText = window.location.href;
      </script>
    </body>
    </html>
  `);
});

app.post('/imprimir', async (req, res) => {
  try {
    const { pedido } = req.body;
    if (!pedido) {
      return res.status(400).json({ erro: 'Dados do pedido ausentes ou mal formatados.' });
    }

    console.log(`\n[+] Recebido pedido #${pedido.numero} de ${pedido.origem}...`);

    const imprimirVia = async (viaType) => {
      printer.clear();
      
      // Cabeçalho centralizado de alta visibilidade
      printer.alignCenter();
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.bold(true);
      
      if (viaType === 'kitchen') {
        printer.println('--- COZINHA ---');
      } else {
        printer.println('== EXPEDICAO ==');
      }
      
      printer.bold(false);
      printer.setTextNormal();
      printer.println(`PEDIDO #${pedido.numero || 'S/N'} (${pedido.origem || 'LOCAL'})`);
      printer.println(`Recepcao: ${pedido.data || ''} ${pedido.hora || ''}`);
      printer.println(`Tipo: ${(pedido.tipoEntrega || 'Nao informado').toUpperCase()}`);
      printer.drawLine();

      // Cliente info
      printer.alignLeft();
      printer.println(`Cliente: ${pedido.cliente || 'Nao informado'}`);
      if (pedido.telefone) {
        printer.println(`Fone: ${pedido.telefone}`);
      }
      
      // Endereço (Apenas para via de entrega/geral)
      if (pedido.endereco && viaType !== 'kitchen') {
        const end = pedido.endereco;
        printer.println(`End: ${end.rua || ''}, ${end.numero || ''}`);
        printer.println(`Bairro: ${end.bairro || ''}`);
        if (end.complemento) {
          printer.println(`Comp: ${end.complemento}`);
        }
        if (end.referencia) {
          printer.println(`Ref: ${end.referencia}`);
        }
      }
      printer.drawLine();

      // Itens da comanda (com tamanho aumentado na cozinha para o chapeiro ver facilmente)
      printer.println('ITENS DO PEDIDO:');
      const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
      itens.forEach(item => {
        let nameToPrint = item.nome || 'Item';
        
        if (viaType === 'kitchen') {
          printer.setTextDoubleHeight();
          printer.bold(true);
          
          // Formatar tamanho do pastel se aplicável (Somente para cozinha)
          const nameLower = nameToPrint.toLowerCase();
          const isPastel = nameLower.includes('pastel') || nameLower.includes('pasteis') || nameLower.includes('pastéis');
          if (isPastel && !nameLower.includes('cm')) {
            const regexP = /\b(p)\b/i;
            const regexM = /\b(m)\b/i;
            const regexG = /\b(g)\b/i;
            const regexS = /\b(s)\b/i;
            
            if (regexP.test(nameToPrint)) {
              nameToPrint = nameToPrint.replace(regexP, '$1 (14cm)');
            } else if (regexM.test(nameToPrint)) {
              nameToPrint = nameToPrint.replace(regexM, '$1 (18cm)');
            } else if (regexG.test(nameToPrint)) {
              nameToPrint = nameToPrint.replace(regexG, '$1 (25cm)');
            } else if (regexS.test(nameToPrint)) {
              nameToPrint = nameToPrint.replace(regexS, '$1 (30cm)');
            }
          }
        }
        
        printer.println(`${item.qtd || 1}x ${nameToPrint}`);
        
        if (viaType === 'kitchen') {
          printer.bold(false);
          printer.setTextNormal();
        }
        
        if (item.obs) {
          printer.println(`   * OBS: ${item.obs}`);
        }
        
        if (item.adicionais && item.adicionais.length > 0) {
          item.adicionais.forEach(ad => {
            printer.println(`   + ${ad}`);
          });
        }
        printer.newLine();
      });

      // Se for expedição, imprime o faturamento e fechamento de conta
      if (viaType !== 'kitchen') {
        printer.drawLine();
        const subtotal = typeof pedido.subtotal === 'number' ? pedido.subtotal : 0;
        const taxaEntrega = typeof pedido.taxaEntrega === 'number' ? pedido.taxaEntrega : 0;
        const desconto = typeof pedido.desconto === 'number' ? pedido.desconto : 0;
        const total = typeof pedido.total === 'number' ? pedido.total : 0;
        const trocoPara = typeof pedido.trocoPara === 'number' ? pedido.trocoPara : 0;

        printer.println(`Subtotal: R$ ${subtotal.toFixed(2)}`);
        printer.println(`Taxa de Entrega: R$ ${taxaEntrega.toFixed(2)}`);
        if (desconto > 0) {
          printer.println(`Desconto: R$ ${desconto.toFixed(2)}`);
        }
        printer.bold(true);
        printer.println(`TOTAL DO PEDIDO: R$ ${total.toFixed(2)}`);
        printer.bold(false);
        printer.println(`Forma de Pagto: ${pedido.pagamento || 'Nao informado'}`);
        if (trocoPara > 0) {
          printer.println(`Troco para: R$ ${trocoPara.toFixed(2)}`);
          printer.println(`Troco a devolver: R$ ${(trocoPara - total).toFixed(2)}`);
        }
      }

      printer.newLine();
      printer.newLine();
      
      // Guilhotina corte
      printer.cut();
    };

    const via = pedido.tipoViacomanda || 'both'; // normal | kitchen | both

    // Executa e envia as vias solicitadas
    if (via === 'both' || via === 'normal') {
      await imprimirVia('normal');
    }
    if (via === 'both' || via === 'kitchen') {
      await imprimirVia('kitchen');
    }

    // Tenta validar conexão antes de enviar (apenas se não for arquivo temporário Windows)
    if (!isWindowsNativePrinter) {
      const isConnected = await printer.isPrinterConnected();
      if (!isConnected) {
        console.warn('[-] Cuidado: Impressora nao respondeu no handshake inicial, continuando envio mesmo assim...');
      }
    }

    await printer.execute();

    if (isWindowsNativePrinter) {
      const printerName = PRINTER_INTERFACE.replace('printer:', '');
      await printRawWindows(printerName, 'printer-job.bin');
    }

    console.log(`[✓] Pedido #${pedido.numero} enviado com sucesso para a impressora!`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[-] Falha no processo de comunicacao com a impressora:', err);
    res.status(500).json({ erro: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`================================================================`);
  console.log(`   ARMAZÉM RECHE - AGENTE LOCAL DE IMPRESSÃO TÉRMICA INICIADO    `);
  console.log(`================================================================`);
  console.log(`[+] Rodando localmente em: http://localhost:${PORT}`);
  console.log(`[+] Interface da impressora configurada: ${PRINTER_INTERFACE}`);
  console.log(`[✦] Pronto para receber impressões seguras de seu painel web!   `);
  console.log(`================================================================`);
});
