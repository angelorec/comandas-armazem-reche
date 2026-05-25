import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { normalizeOrder } from './src/utils/normalizer';
import { NormalizedOrder, OrderPlatform } from './src/types';

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'orders_db.json');

// Realistic Mock Payloads for standard initialization
const DEFAULT_MOCKS = [
  {
    platform: 'ifood',
    payload: {
      id: "76326693-0100-474c-83b3-b77da124803d",
      displayId: "3948",
      createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
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
    }
  },
  {
    platform: 'anotai',
    payload: {
      _id: "644917a86f9bb002f2ab56b1",
      shortId: "#084",
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
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
    }
  },
  {
    platform: 'deliverymuch',
    payload: {
      order_id: 981504,
      display_id: "7219",
      created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
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
  }
];

// In-Memory Order List, synced with JSON DB
let orders: NormalizedOrder[] = [];

// Helper to load database
function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      orders = JSON.parse(data);
      console.log(`Database loaded: ${orders.length} orders retrieved from ${DB_FILE}`);
    } else {
      // Setup with default raw mocks
      orders = DEFAULT_MOCKS.map(mock => normalizeOrder(mock.payload, mock.platform as OrderPlatform));
      // Save it
      saveDatabase();
      console.log(`Database initialized with ${orders.length} standard mock orders.`);
    }
  } catch (error) {
    console.error('Error loading database:', error);
    orders = [];
  }
}

// Helper to save database
function saveDatabase() {
  try {
    // Create directory if not exists
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

async function start() {
  loadDatabase();
  const app = express();
  app.use(express.json());

  // API - Get all orders
  app.get('/api/orders', (req, res) => {
    res.json(orders);
  });

  // API - Get metrics breakdown
  app.get('/api/orders/stats', (req, res) => {
    const totalOrders = orders.length;
    const ifoodCount = orders.filter(o => o.platform === 'ifood').length;
    const anotaiCount = orders.filter(o => o.platform === 'anotai').length;
    const deliveryMuchCount = orders.filter(o => o.platform === 'deliverymuch').length;
    
    const activeOrders = orders.filter(o => o.status === 'pending').length;
    const totalRevenue = orders
      .filter(o => o.status !== 'canceled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    res.json({
      totalOrders,
      ifoodCount,
      anotaiCount,
      deliveryMuchCount,
      activeOrders,
      totalRevenue
    });
  });

  // API - Post manually trigger print state
  app.post('/api/orders/:id/print', (req, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'normal' | 'kitchen' | 'both'
    
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      if (type === 'kitchen') {
        orders[idx].printedKitchen = true;
      } else if (type === 'normal') {
        orders[idx].printed = true;
      } else {
        orders[idx].printed = true;
        orders[idx].printedKitchen = true;
      }
      
      // Update status to printed when both are printed
      if (orders[idx].printed && orders[idx].printedKitchen) {
        orders[idx].status = 'printed';
      } else if (orders[idx].status === 'pending') {
        orders[idx].status = 'printed'; // update to printed as well on first print
      }

      saveDatabase();
      res.json({ success: true, order: orders[idx] });
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });

  // API - Toggle canceled or printed status
  app.post('/api/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'pending' | 'printed' | 'canceled'
    
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders[idx].status = status;
      saveDatabase();
      res.json({ success: true, order: orders[idx] });
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });

  // API - Delete order
  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders.splice(idx, 1);
      saveDatabase();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });

  // API - Reset ALL orders
  app.post('/api/orders/reset', (req, res) => {
    orders = [];
    saveDatabase();
    res.json({ success: true });
  });

  // API - Load Default/Mock orders again (for clean testing)
  app.post('/api/orders/setup-mocks', (req, res) => {
    orders = DEFAULT_MOCKS.map(mock => normalizeOrder(mock.payload, mock.platform as OrderPlatform));
    saveDatabase();
    res.json({ success: true, orders });
  });

  // API Webhook Interfaces for iFood, Anota.ai, and Delivery Much
  // Universal order webhook
  app.post('/api/orders/webhook', (req, res) => {
    try {
      const payload = req.body;
      const platformHeader = req.headers['x-platform'] as string;
      const platform = (platformHeader || 'ifood') as OrderPlatform;
      
      const normalized = normalizeOrder(payload, platform);
      
      // Ensure we don't duplicate id
      const existingIdx = orders.findIndex(o => o.id === normalized.id);
      if (existingIdx !== -1) {
        orders[existingIdx] = { ...normalized, printed: orders[existingIdx].printed, printedKitchen: orders[existingIdx].printedKitchen, status: orders[existingIdx].status };
      } else {
        orders.unshift(normalized); // Add to the front
      }
      
      saveDatabase();
      res.status(201).json({ success: true, message: 'Ordem recebida com sucesso!', order: normalized });
    } catch (e: any) {
      res.status(400).json({ error: 'Falha ao processar a requisição', message: e?.message });
    }
  });

  // iFood Webhook explicitly
  app.post('/api/orders/webhook/ifood', (req, res) => {
    try {
      const payload = req.body;
      const normalized = normalizeOrder(payload, 'ifood');
      
      // Check duplicate
      const existingIdx = orders.findIndex(o => o.id === normalized.id);
      if (existingIdx !== -1) {
        orders[existingIdx] = { ...normalized, printed: orders[existingIdx].printed, printedKitchen: orders[existingIdx].printedKitchen, status: orders[existingIdx].status };
      } else {
        orders.unshift(normalized);
      }
      
      saveDatabase();
      res.status(201).json({ success: true, order: normalized });
    } catch (e: any) {
      res.status(400).json({ error: 'Falha ao processar comanda iFood', message: e?.message });
    }
  });

  // Anota.ai Webhook explicitly
  app.post('/api/orders/webhook/anotai', (req, res) => {
    try {
      const payload = req.body;
      const normalized = normalizeOrder(payload, 'anotai');
      
      // Check duplicate
      const existingIdx = orders.findIndex(o => o.id === normalized.id);
      if (existingIdx !== -1) {
        orders[existingIdx] = { ...normalized, printed: orders[existingIdx].printed, printedKitchen: orders[existingIdx].printedKitchen, status: orders[existingIdx].status };
      } else {
        orders.unshift(normalized);
      }
      
      saveDatabase();
      res.status(201).json({ success: true, order: normalized });
    } catch (e: any) {
      res.status(400).json({ error: 'Falha ao processar comanda Anota.ai', message: e?.message });
    }
  });

  // Delivery Much Webhook explicitly
  app.post('/api/orders/webhook/deliverymuch', (req, res) => {
    try {
      const payload = req.body;
      const normalized = normalizeOrder(payload, 'deliverymuch');
      
      // Check duplicate
      const existingIdx = orders.findIndex(o => o.id === normalized.id);
      if (existingIdx !== -1) {
        orders[existingIdx] = { ...normalized, printed: orders[existingIdx].printed, printedKitchen: orders[existingIdx].printedKitchen, status: orders[existingIdx].status };
      } else {
        orders.unshift(normalized);
      }
      
      saveDatabase();
      res.status(201).json({ success: true, order: normalized });
    } catch (e: any) {
      res.status(400).json({ error: 'Falha ao processar comanda Delivery Much', message: e?.message });
    }
  });

  // Integration of web assets (Vite dev middleware vs Production static serve)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Armazém Reche] Back-end/Front-end executando em http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Erro fatal ao iniciar servidor:", err);
});
