================================================================================
   INSTRUÇÕES DE IMPRESSÃO FÍSICA - ARMAZÉM RECHE (ESTRUTURA PARA O SEU NOTEBOOK)
================================================================================

Este diretório contém o Agente Local de Impressão Térmica ESC/POS completo e pronto. 
Como o seu aplicativo principal roda na nuvem (Vercel ou AI Studio), ele não pode se comunicar
diretamente com portas físicas ou IPs locais do restaurante por questões de segurança (HTTPS).

A solução é o Agente Local rodando no notebook que estará fisicamente conectado à impressora.

Siga estes passos simples hoje à noite ou amanhã no cliente para colocar tudo em funcionamento em 5 minutos!

--------------------------------------------------------------------------------
PASSO 1: BAIXAR E EXTRAIR A PASTA DO AGENTE NO NOTEBOOK DO RESTAURANTE
--------------------------------------------------------------------------------
Pode exportar ou copiar os 2 arquivos essenciais para uma pasta vazia no notebook do cliente:
1. index.js
2. package.json

--------------------------------------------------------------------------------
PASSO 2: INSTALAR AS DEPENDÊNCIAS (No terminal do notebook)
--------------------------------------------------------------------------------
Abra o prompt de comando (CMD ou PowerShell no Windows, ou Terminal no Mac/Linux) dentro da pasta onde copiou os arquivos e rode:

   npm install

Isso instalará automaticamente o express, cors e node-thermal-printer necessários.

--------------------------------------------------------------------------------
PASSO 3: DESCOBRIR A IMPRESSORA E CONFIGURAR NO index.js
--------------------------------------------------------------------------------
Abra o arquivo 'index.js' e ajuste as constantes no início do arquivo:

A) Se for via CABO USB (Comum em notebooks):
   No Windows, adicione a impressora e pegue o nome exato dela no Painel de Controle (Ex: "POS-80", "MP-4200 TH").
   Substitua o PRINTER_INTERFACE por:
   const PRINTER_INTERFACE = 'printer:NOME_DA_SUA_IMPRESSORA';

B) Se for via REDE (Roteador):
   Imprima um autoteste na impressora segurando o botão FEED ao ligá-la para ver o IP dela (Ex: 192.168.1.150).
   Substitua o PRINTER_INTERFACE pelo IP correspondente:
   const PRINTER_INTERFACE = 'tcp://192.168.1.150:9100';

C) Marca da Impressora:
   Ajuste a constante PRINTER_TYPE para o seu modelo:
   - Se for Epson, Elgin, Bematech (ESC/POS compatível):
     const PRINTER_TYPE = Types.EPSON;
   - Se for um modelo específico Bematech com driver antigo:
     const PRINTER_TYPE = Types.BEMATECH;

--------------------------------------------------------------------------------
PASSO 4: INICIAR O AGENTE LOCAL
--------------------------------------------------------------------------------
No terminal da pasta do seu notebook, execute:

   npm start

Você verá a mensagem: "ARMAZÉM RECHE - AGENTE LOCAL DE IMPRESSÃO TÉRMICA INICIADO" na porta 3001.

--------------------------------------------------------------------------------
PASSO 5: CONFIGURAR E EXECUTAR O NGROK (Usando o seu Token fornecido!)
--------------------------------------------------------------------------------
Abra uma OUTRA janela de terminal no notebook e execute as etapas abaixo:

1. Instale o ngrok se ainda não o tiver (baixando de ngrok.com ou via gerenciador de pacotes).
2. Adicione o seu token de autenticação pessoal (fornecido por você):
   
   ngrok config add-authtoken 3EhQM4ctG3bispS1mIhkiOeM3no_4fytcq4X31JBoTDP7VnP2

3. Inicie o túnel direcionando para a porta 3001 do seu agente local:

   ngrok http 3001

4. O ngrok exibirá uma URL segura em "Forwarding" no terminal, parecida com:
   https://xxxx-xxx-xxx.ngrok-free.app

--------------------------------------------------------------------------------
PASSO 6: CONFIGURAR NO PAINEL WEB DO ARMAZÉM RECHE
--------------------------------------------------------------------------------
1. Com o app do Armazém Reche aberto em seu navegador (na Vercel ou AI Studio):
2. Clique no ícone de engrenagem "Engrenagem amarela/cinza" (Configurar Impressora Física Local) no topo superior direito.
3. Ative a chave: "Ativar Impressão Física Direta".
4. No campo "URL do Agente de Impressão", cole a URL gerada pelo ngrok:
   Exemplo: https://xxxx-xxx-xxx.ngrok-free.app
5. Ative a chave "Auto-Imprimir Novas Comandas" caso queira impressão totalmente automática!
6. Clique em "Testar Agente Local" para conferir se a impressora solta o teste!
7. Clique em "Salvar Configurações".

Prontinho! Agora, ao clicar em "Imprimir Via Cozinha" ou ao receber pedidos (automático), a impressão física será disparada instantaneamente!
================================================================================
