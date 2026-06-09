const express = require('express');
const cors = require('cors');
const { printer: ThermalPrinter, types: Types } = require('node-thermal-printer');

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
const PRINTER_INTERFACE = 'tcp://192.168.1.100:9100'; 
const PRINTER_TYPE = Types.EPSON; // Use Types.EPSON ou Types.BEMATECH conforme o modelo de sua impressora

const printer = new ThermalPrinter({
  type: PRINTER_TYPE,
  interface: PRINTER_INTERFACE,
  characterSet: 'PC860_PORTUGUESE',
  removeSpecialCharacters: false,
  lineCharacter: "=",
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
      printer.println(`PEDIDO #${pedido.numero} (${pedido.origem})`);
      printer.println(`Recepcao: ${pedido.data} ${pedido.hora}`);
      printer.println(`Tipo: ${pedido.tipoEntrega.toUpperCase()}`);
      printer.drawLine();

      // Cliente info
      printer.alignLeft();
      printer.println(`Cliente: ${pedido.cliente}`);
      if (pedido.telefone) {
        printer.println(`Fone: ${pedido.telefone}`);
      }
      
      // Endereço (Apenas para via de entrega/geral)
      if (pedido.endereco && viaType !== 'kitchen') {
        const end = pedido.endereco;
        printer.println(`End: ${end.rua}, ${end.numero}`);
        printer.println(`Bairro: ${end.bairro}`);
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
      pedido.itens.forEach(item => {
        let nameToPrint = item.nome;
        
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
        
        printer.println(`${item.qtd}x ${nameToPrint}`);
        
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
        printer.println(`Subtotal: R$ ${pedido.subtotal.toFixed(2)}`);
        printer.println(`Taxa de Entrega: R$ ${pedido.taxaEntrega.toFixed(2)}`);
        if (pedido.desconto > 0) {
          printer.println(`Desconto: R$ ${pedido.desconto.toFixed(2)}`);
        }
        printer.bold(true);
        printer.println(`TOTAL DO PEDIDO: R$ ${pedido.total.toFixed(2)}`);
        printer.bold(false);
        printer.println(`Forma de Pagto: ${pedido.pagamento}`);
        if (pedido.trocoPara > 0) {
          printer.println(`Troco para: R$ ${pedido.trocoPara.toFixed(2)}`);
          printer.println(`Troco a devolver: R$ ${(pedido.trocoPara - pedido.total).toFixed(2)}`);
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

    // Tenta validar conexão antes de enviar
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.warn('[-] Cuidado: Impressora nao respondeu no handshake inicial, continuando envio mesmo assim...');
    }

    await printer.execute();
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
