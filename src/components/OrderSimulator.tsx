import React, { useState } from 'react';
import { OrderPlatform } from '../types';
import { Send, Terminal, Code, Info, Check, Copy, RefreshCw } from 'lucide-react';

interface SimulatorProps {
  onOrderAdded: () => void;
}

const TEMPLATES: Record<OrderPlatform, any> = {
  ifood: {
    id: "76326693-0100-474c-83b3-b77da124803d",
    displayId: "3948",
    createdAt: new Date().toISOString(),
    orderType: "DELIVERY",
    customer: {
      id: "cust-842",
      name: "Guilherme S. Almeida",
      phone: { number: "(11) 99342-8811" }
    },
    delivery: {
      deliveryAddress: {
        formattedAddress: "Rua Marquês de Souza, 421 - Centro, Pelotas - RS",
        streetName: "Rua Marquês de Souza",
        streetNumber: "421",
        neighborhood: "Centro",
        city: "Pelotas",
        state: "RS",
        postalCode: "96015-120",
        complement: "Apto 302"
      }
    },
    items: [
      {
        name: "Hambúrguer Reche Artesanal",
        quantity: 2,
        unitPrice: 28.90,
        totalPrice: 57.80,
        observations: "Ponto da carne: bem passado. Sem picles.",
        options: [
          { name: "Adicional Cheddar Cremoso", quantity: 2, price: 4.50 },
          { name: "Adicional Bacon Picado", quantity: 1, price: 5.00 }
        ]
      },
      {
        name: "Porção de Batata Rústica",
        quantity: 1,
        unitPrice: 16.00,
        totalPrice: 16.00,
        observations: "Enviar maionese de alho extra.",
        options: []
      }
    ],
    total: {
      subTotal: 73.80,
      deliveryFee: 8.00,
      benefits: 5.00,
      orderAmount: 76.80
    },
    payments: {
      methods: [
        {
          value: 76.80,
          currency: "BRL",
          method: "CREDIT",
          type: "ONLINE"
        }
      ]
    }
  },
  anotai: {
    _id: "644917a86f9bb002f2ab56b1",
    shortId: "#084",
    created_at: new Date().toISOString(),
    type: "retirada",
    customer: {
      name: "Alessandra Silveira",
      phone: "53981155099"
    },
    items: [
      {
        name: "Hot Dog Especial Prensado",
        quantity: 3,
        price: 18.50,
        obs: "Um de nós é intolerante à lactose, colocar queijo ralado apenas em dois, por favor!",
        subitems: [
          { name: "Duas Salsichas Extra", quantity: 1, price: 4.00 },
          { name: "Molho de Alho Reche", quantity: 3, price: 1.50 }
        ]
      },
      {
        name: "Coca-Cola Original Plástica 1.5L",
        quantity: 1,
        price: 9.00,
        obs: "Bem gelada"
      }
    ],
    deliveryFee: 0.00,
    payment: {
      method: "pix",
      changeFor: 0,
      online: true
    },
    total: 68.50
  },
  deliverymuch: {
    order_id: 981504,
    display_id: "7219",
    created_at: new Date().toISOString(),
    delivery_type: "delivery",
    customer: {
      name: "Marcos V. Antunes",
      phone: "53991204050"
    },
    address: {
      street_name: "Avenida Bento Gonçalves",
      street_number: "4500",
      neighborhood: "Fragata",
      city: "Pelotas",
      state: "RS",
      zip_code: "96040-000",
      complement: "Bloco C, Ap 101"
    },
    items: [
      {
        name: "Pizza Grande Reche Supreme",
        quantity: 1,
        price: 62.00,
        note: "Borda recheada caprichada.",
        complements: [
          { name: "Borda de Catupiry Original", quantity: 1, price: 9.00 }
        ]
      },
      {
        name: "Guaraná Antarctica Lata 350ml",
        quantity: 2,
        price: 5.50,
        note: ""
      }
    ],
    totals: {
      subtotal: 71.00,
      delivery_fee: 6.50,
      discount: 10.00,
      total: 67.50
    },
    payment: {
      method: "Cartão de Crédito (Máquina)",
      type: "offline",
      change: null
    }
  }
};

export default function OrderSimulator({ onOrderAdded }: SimulatorProps) {
  const [activeTab, setActiveTab] = useState<OrderPlatform>('ifood');
  const [payloadText, setPayloadText] = useState<string>(
    JSON.stringify(TEMPLATES.ifood, null, 2)
  );
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ status: 'success' | 'error', text: string } | null>(null);

  const handleTabChange = (platform: OrderPlatform) => {
    setActiveTab(platform);
    
    // Generate fresh IDs and Date to simulate active scenarios
    const baseTemplate = { ...TEMPLATES[platform] };
    const randId = Math.floor(1000 + Math.random() * 9000);
    
    if (platform === 'ifood') {
      baseTemplate.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      baseTemplate.displayId = randId.toString();
      baseTemplate.createdAt = new Date().toISOString();
    } else if (platform === 'anotai') {
      baseTemplate._id = `an-${Date.now()}`;
      baseTemplate.shortId = `#${randId.toString().substring(0, 3)}`;
      baseTemplate.created_at = new Date().toISOString();
    } else if (platform === 'deliverymuch') {
      baseTemplate.order_id = Date.now();
      baseTemplate.display_id = randId.toString();
      baseTemplate.created_at = new Date().toISOString();
    }

    setPayloadText(JSON.stringify(baseTemplate, null, 2));
    setFeedback(null);
  };

  const handleCopyCurl = () => {
    const appUrl = window.location.origin;
    const curlCommand = `curl -X POST ${appUrl}/api/orders/webhook/${activeTab} \\
  -H "Content-Type: application/json" \\
  -d '${payloadText.replace(/'/g, "'\\''")}'`;

    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      let parsed;
      try {
        parsed = JSON.parse(payloadText);
      } catch (err: any) {
        throw new Error('Formato JSON inválido. Verifique vírgulas e chaves!');
      }

      const response = await fetch(`/api/orders/webhook/${activeTab}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsed),
      });

      const data = await response.json();
      if (response.ok) {
        setFeedback({ status: 'success', text: `Comanda #${data.order?.displayId || ''} injetada com sucesso!` });
        onOrderAdded();
        
        // Randomize template for next tests
        setTimeout(() => {
          handleTabChange(activeTab);
        }, 1200);
      } else {
        throw new Error(data.error || 'Erro desconhecido na API.');
      }
    } catch (err: any) {
      setFeedback({ status: 'error', text: err.message || 'Erro na requisição' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="simulator-container" className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-sans font-bold text-lg text-yellow-400 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-yellow-400 animate-pulse" /> Simulator de Webhooks/API
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Simule o envio real de comandas de integrações iFood, Anota.ai ou Delivery Much.
          </p>
        </div>
        
        {/* Buttons to switch platforms */}
        <div id="sim-tabs" className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          {(['ifood', 'anotai', 'deliverymuch'] as OrderPlatform[]).map((platform) => {
            const labels: Record<OrderPlatform, string> = {
              ifood: 'iFood Webhook',
              anotai: 'Anota.ai API',
              deliverymuch: 'Delivery Much'
            };
            const activeColors: Record<OrderPlatform, string> = {
              ifood: 'text-red-400 border border-red-500/30 bg-red-500/10',
              anotai: 'text-violet-400 border border-violet-500/30 bg-violet-500/10',
              deliverymuch: 'text-emerald-400 border border-emerald-500/30 bg-emerald-500/10'
            };
            return (
              <button
                key={platform}
                onClick={() => handleTabChange(platform)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeTab === platform ? activeColors[platform] : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {labels[platform]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* JSON Sandbox Area */}
        <div id="sim-editor-column" className="lg:col-span-8 flex flex-col">
          <label className="text-xs font-semibold text-neutral-400 mb-1.5 flex items-center justify-between">
            <span>Editor de Carga Útil (Raw JSON)</span>
            <span className="font-mono text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">
              POST /api/orders/webhook/{activeTab}
            </span>
          </label>
          <div className="relative flex-1">
            <textarea
              id="payload-textarea"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              className="w-full h-64 bg-neutral-950 text-neutral-200 font-mono text-xs p-4 rounded-xl border border-neutral-800 focus:outline-none focus:border-yellow-400/50 resize-y transition-colors leading-relaxed"
              spellCheck="false"
            />
          </div>
        </div>

        {/* Info & Simulation trigger area */}
        <div id="sim-info-column" className="lg:col-span-4 flex flex-col justify-between space-y-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-xs space-y-3">
            <span className="font-bold text-neutral-300 flex items-center gap-1.5 leading-none">
              <Code className="w-4 h-4 text-yellow-400" /> Integração de Produção
            </span>
            <p className="text-neutral-400 leading-relaxed">
              O Armazém Reche recebe comandas em tempo real via endpoints webhook. Basta cadastrar em sua plataforma oficial:
            </p>
            <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg space-y-1.5 font-mono text-[10px]">
              <div>
                <span className="text-yellow-500 uppercase font-black">iFood:</span>
                <div className="text-neutral-300 overflow-x-auto select-all whitespace-nowrap mt-0.5 font-semibold">
                  /api/orders/webhook/ifood
                </div>
              </div>
              <div className="border-t border-neutral-800/60 pt-1.5">
                <span className="text-violet-400 uppercase font-black">Anota.ai:</span>
                <div className="text-neutral-300 overflow-x-auto select-all whitespace-nowrap mt-0.5 font-semibold">
                  /api/orders/webhook/anotai
                </div>
              </div>
              <div className="border-t border-neutral-800/60 pt-1.5">
                <span className="text-emerald-400 uppercase font-black">Delivery Much:</span>
                <div className="text-neutral-300 overflow-x-auto select-all whitespace-nowrap mt-0.5 font-semibold">
                  /api/orders/webhook/deliverymuch
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyCurl}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-850 hover:text-yellow-400 border border-neutral-850 text-neutral-300 font-sans font-medium rounded-lg flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-yellow-400" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copiar Comando cURL
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {feedback && (
              <div
                id="simulator-feedback"
                className={`p-3 rounded-lg text-xs leading-relaxed font-sans border flex items-center gap-2 ${
                  feedback.status === 'success'
                    ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                <div className="flex-1 font-medium">{feedback.text}</div>
              </div>
            )}

            <button
              id="btn-simulate-webhook"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-800 text-neutral-950 disabled:text-neutral-500 font-sans font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/10 transition duration-150 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" /> Processando payload...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Injetar Comanda Simulada
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
