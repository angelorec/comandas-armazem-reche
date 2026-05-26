import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { normalizeOrder } from './src/utils/normalizer';
import { NormalizedOrder, OrderPlatform } from './src/types';
import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const PORT = 3000;
const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'orders_db.json')
  : path.join(process.cwd(), 'orders_db.json');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cerlwecimducmrwlysqg.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcmx3ZWNpbWR1Y21yd2x5c3FnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDY0NjUsImV4cCI6MjA5NTM4MjQ2NX0.cGPqr2yDhImbhk9Q_-WLmKa9EHgST9Z9pqvGObXG5xo';

// Sanitize SUPABASE_URL to prevent "Invalid path specified in request URL" errors
let cleanSupabaseUrl = SUPABASE_URL;
try {
  const parsed = new URL(SUPABASE_URL);
  cleanSupabaseUrl = parsed.origin;
} catch (e: any) {
  console.warn('Failed to parse SUPABASE_URL, using original:', e.message);
}

const supabase = createClient(cleanSupabaseUrl, SUPABASE_ANON_KEY);

async function syncOrderToSupabase(order: NormalizedOrder) {
  try {
    const { error } = await supabase.from('comandas').upsert({
      id: order.id,
      display_id: order.displayId,
      platform: order.platform,
      created_at: order.createdAt,
      delivery_type: order.deliveryType,
      customer_name: order.customerName,
      items: order.items,
      total: order.total,
      payment_method: order.paymentMethod,
      status: order.status
    });
    if (error) {
      console.warn(`[Supabase Error] Não foi possível sincronizar a comanda ${order.displayId} (tabela "comandas" pode não existir ainda):`, error.message);
    } else {
      console.log(`[Supabase] Comanda ${order.displayId} sincronizada com sucesso.`);
    }
  } catch (err: any) {
    console.warn(`[Supabase Warning] Sincronização ignorada:`, err?.message);
  }
}

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

const app = express();
app.use(express.json());
loadDatabase();

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
      syncOrderToSupabase(orders[idx]);
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
      syncOrderToSupabase(orders[idx]);
      res.json({ success: true, order: orders[idx] });
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  });

  // API - Create custom/local order
  app.post('/api/orders/local', (req, res) => {
    try {
      const { customerName, deliveryType, items, paymentMethod, total } = req.body;
      
      const displayIdNum = orders.length > 0 
        ? Math.max(...orders.map(o => {
            const rawId = o.displayId.replace('#', '');
            const parsed = parseInt(rawId);
            return isNaN(parsed) ? 1000 : parsed;
          })) + 1 
        : 1001;

      const newOrder: NormalizedOrder = {
        id: `local-${Date.now()}`,
        displayId: `#${displayIdNum}`,
        platform: 'local',
        createdAt: new Date().toISOString(),
        orderTime: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
        deliveryType: deliveryType || 'local',
        customerName: customerName || 'Pedido Local',
        customerPhone: '',
        customerAddress: req.body.customerAddress,
        items: items || [],
        paymentMethod: paymentMethod || 'Dinheiro',
        paymentType: 'OFFLINE',
        subtotal: total || 0,
        deliveryFee: 0,
        total: total || 0,
        printed: false,
        printedKitchen: false,
        status: 'pending',
        rawPayload: req.body
      };

      orders.unshift(newOrder);
      saveDatabase();
      syncOrderToSupabase(newOrder);
      res.status(201).json({ success: true, order: newOrder });
    } catch (e: any) {
      res.status(400).json({ error: 'Erro ao criar pedido local', message: e?.message });
    }
  });

  // API - Edit custom/local order (or general orders)
  app.put('/api/orders/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { customerName, deliveryType, items, paymentMethod, total, status } = req.body;
      const idx = orders.findIndex(o => o.id === id);
      
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          customerName: customerName !== undefined ? customerName : orders[idx].customerName,
          deliveryType: deliveryType !== undefined ? deliveryType : orders[idx].deliveryType,
          items: items !== undefined ? items : orders[idx].items,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : orders[idx].paymentMethod,
          total: total !== undefined ? total : orders[idx].total,
          subtotal: total !== undefined ? total : orders[idx].subtotal,
          status: status !== undefined ? status : orders[idx].status,
          customerAddress: req.body.customerAddress !== undefined ? req.body.customerAddress : orders[idx].customerAddress,
        };
        saveDatabase();
        syncOrderToSupabase(orders[idx]);
        res.json({ success: true, order: orders[idx] });
      } else {
        res.status(404).json({ error: 'Pedido não encontrado' });
      }
    } catch (e: any) {
      res.status(400).json({ error: 'Erro ao editar pedido', message: e?.message });
    }
  });

  // API - Delete order
  app.delete('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const idx = orders.findIndex(o => o.id === id);
    if (idx !== -1) {
      orders.splice(idx, 1);
      saveDatabase();
      // Keep Supabase updated by deleting too
      supabase.from('comandas').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase delete skipping:', error.message);
      });
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

  // API - Save all mock orders configured
  app.post('/api/orders/setup-mocks', (req, res) => {
    orders = DEFAULT_MOCKS.map(mock => normalizeOrder(mock.payload, mock.platform as OrderPlatform));
    saveDatabase();
    // Sync all seeded mocks to Supabase too
    orders.forEach(syncOrderToSupabase);
    res.json({ success: true, orders });
  });

  // ========== SUPABASE INTEGRATION ROUTES ==========

  // GET - Retrieve menu products from Supabase
  app.get('/api/supabase/products', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      res.json(data || []);
    } catch (err: any) {
      console.warn('Supabase products fetch failed, using fallback:', err.message);
      // Fallback local products so it never crashes with complete menu as requested
      res.json([
        { id: 1001, nome: 'Marmitex', preco: 27.00 },
        { id: 1002, nome: 'Lá Minuta tradicional', preco: 43.00 },
        { id: 1003, nome: 'Bifes de Coxão Mole Precoce', preco: 14.00 },
        { id: 1004, nome: 'Chuleta de Contrafilé', preco: 14.00 },
        { id: 1005, nome: 'Filé de Frango à Parmegiana', preco: 12.00 },
        { id: 1006, nome: 'Frango Grelhado', preco: 13.00 },
        { id: 1007, nome: 'Bife de Lentilha', preco: 12.00 },
        { id: 1008, nome: 'Arroz Branco', preco: 16.00 },
        { id: 1009, nome: 'Feijão', preco: 16.00 },
        { id: 1010, nome: 'Farofinha Caseira', preco: 10.00 },
        { id: 1011, nome: 'Espaguete', preco: 22.00 },
        { id: 1012, nome: 'Batata Frita', preco: 25.00 },
        { id: 1013, nome: 'Polentinha Frita', preco: 25.00 },
        { id: 1014, nome: 'Ovo Frito', preco: 5.00 },
        { id: 1015, nome: 'Saladas', preco: 12.00 },
        { id: 1016, nome: 'Porção 400g Batata Frita', preco: 20.00 },
        { id: 1017, nome: 'Porção 400g Polentinha Frita', preco: 20.00 },
        { id: 1018, nome: 'Pastel de Frango P', preco: 15.00 },
        { id: 1019, nome: 'Pastel de Frango M', preco: 20.00 },
        { id: 1020, nome: 'Pastel de Frango G', preco: 27.00 },
        { id: 1021, nome: 'Pastel de Frango S', preco: 38.00 },
        { id: 1022, nome: 'Pastel de Frango com Catupiry P', preco: 17.00 },
        { id: 1023, nome: 'Pastel de Frango com Catupiry M', preco: 24.00 },
        { id: 1024, nome: 'Pastel de Frango com Catupiry G', preco: 39.00 },
        { id: 1025, nome: 'Pastel de Frango com Catupiry S', preco: 44.00 },
        { id: 1026, nome: 'Pastel de Frango com Queijo P', preco: 17.00 },
        { id: 1027, nome: 'Pastel de Frango com Queijo M', preco: 44.00 },
        { id: 1028, nome: 'Pastel de Frango com Queijo G', preco: 31.00 },
        { id: 1029, nome: 'Pastel de Frango com Queijo S', preco: 39.00 },
        { id: 1030, nome: 'Pastel de Frango Palmito Queijo P', preco: 19.00 },
        { id: 1031, nome: 'Pastel de Frango Palmito Queijo M', preco: 29.00 },
        { id: 1032, nome: 'Pastel de Frango Palmito Queijo G', preco: 42.00 },
        { id: 1033, nome: 'Pastel de Frango Palmito Queijo S', preco: 48.00 },
        { id: 1034, nome: 'Pastel de Frango com Cheddar P', preco: 17.00 },
        { id: 1035, nome: 'Pastel de Frango com Cheddar M', preco: 24.00 },
        { id: 1036, nome: 'Pastel de Frango com Cheddar G', preco: 39.00 },
        { id: 1037, nome: 'Pastel de Frango com Cheddar S', preco: 44.00 },
        { id: 1038, nome: 'Pastel de Carne P', preco: 11.00 },
        { id: 1039, nome: 'Pastel de Carne M', preco: 16.50 },
        { id: 1040, nome: 'Pastel de Carne G', preco: 25.00 },
        { id: 1041, nome: 'Pastel de Carne S', preco: 35.00 },
        { id: 1042, nome: 'Pastel de Carne com Ovo P', preco: 15.00 },
        { id: 1043, nome: 'Pastel de Carne com Ovo M', preco: 17.00 },
        { id: 1044, nome: 'Pastel de Carne com Ovo G', preco: 29.00 },
        { id: 1045, nome: 'Pastel de Carne com Ovo S', preco: 38.00 },
        { id: 1046, nome: 'Pastel de Carne com Queijo P', preco: 17.00 },
        { id: 1047, nome: 'Pastel de Carne com Queijo M', preco: 24.00 },
        { id: 1048, nome: 'Pastel de Carne com Queijo G', preco: 31.00 },
        { id: 1049, nome: 'Pastel de Carne com Queijo S', preco: 34.00 },
        { id: 1050, nome: 'Pastel de Carne com Catupiry P', preco: 17.00 },
        { id: 1051, nome: 'Pastel de Carne com Catupiry M', preco: 24.00 },
        { id: 1052, nome: 'Pastel de Carne com Catupiry G', preco: 31.00 },
        { id: 1053, nome: 'Pastel de Carne com Catupiry S', preco: 34.00 },
        { id: 1054, nome: 'Pastel de Carne com Cheddar P', preco: 17.00 },
        { id: 1055, nome: 'Pastel de Carne com Cheddar M', preco: 24.00 },
        { id: 1056, nome: 'Pastel de Carne com Cheddar G', preco: 39.00 },
        { id: 1057, nome: 'Pastel de Carne com Cheddar S', preco: 44.00 },
        { id: 1058, nome: 'Pastel de Presunto e Queijo P', preco: 17.00 },
        { id: 1059, nome: 'Pastel de Presunto e Queijo M', preco: 23.00 },
        { id: 1060, nome: 'Pastel de Presunto e Queijo G', preco: 27.00 },
        { id: 1061, nome: 'Pastel de Presunto e Queijo S', preco: 28.00 },
        { id: 1062, nome: 'Pastel Presunto Queijo Ovo P', preco: 17.00 },
        { id: 1063, nome: 'Pastel Presunto Queijo Ovo M', preco: 22.00 },
        { id: 1064, nome: 'Pastel Presunto Queijo Ovo G', preco: 30.00 },
        { id: 1065, nome: 'Pastel Presunto Queijo Ovo S', preco: 33.00 },
        { id: 1066, nome: 'Pastel Presunto Queijo Tomate P', preco: 20.00 },
        { id: 1067, nome: 'Pastel Presunto Queijo Tomate M', preco: 26.00 },
        { id: 1068, nome: 'Pastel Presunto Queijo Tomate G', preco: 34.05 },
        { id: 1069, nome: 'Pastel Presunto Queijo Tomate S', preco: 40.00 },
        { id: 1070, nome: 'Pastel Chocolate Preto P', preco: 18.00 },
        { id: 1071, nome: 'Pastel Chocolate Preto M', preco: 24.00 },
        { id: 1072, nome: 'Pastel Chocolate Branco P', preco: 18.00 },
        { id: 1073, nome: 'Pastel Chocolate Branco M', preco: 24.00 },
        { id: 1074, nome: 'Pastel Chocolate Preto e Branco P', preco: 20.00 },
        { id: 1075, nome: 'Pastel Chocolate Preto e Branco M', preco: 26.00 },
        { id: 1076, nome: 'Pastel Chocolate Preto e Morango P', preco: 20.00 },
        { id: 1077, nome: 'Pastel Chocolate Preto e Morango M', preco: 26.00 },
        { id: 1078, nome: 'Pastel Chocolate Branco e Morango P', preco: 20.00 },
        { id: 1079, nome: 'Pastel Chocolate Branco e Morango M', preco: 26.00 },
        { id: 1080, nome: 'Pastel Chocolate Preto Branco Morango P', preco: 24.00 },
        { id: 1081, nome: 'Pastel Chocolate Preto Branco Morango M', preco: 28.00 },
        { id: 1082, nome: 'Pastel Costela P', preco: 20.00 },
        { id: 1083, nome: 'Pastel Costela M', preco: 29.00 },
        { id: 1084, nome: 'Pastel Costela G', preco: 39.00 },
        { id: 1085, nome: 'Pastel Costela S', preco: 44.00 },
        { id: 1086, nome: 'Pastel Costela com Queijo P', preco: 24.00 },
        { id: 1087, nome: 'Pastel Costela com Queijo M', preco: 29.00 },
        { id: 1088, nome: 'Pastel Costela com Queijo G', preco: 39.00 },
        { id: 1089, nome: 'Pastel Costela com Queijo S', preco: 44.00 },
        { id: 1090, nome: 'Pastel Calabresa com Queijo P', preco: 17.00 },
        { id: 1091, nome: 'Pastel Calabresa com Queijo M', preco: 22.00 },
        { id: 1092, nome: 'Pastel Calabresa com Queijo G', preco: 33.00 },
        { id: 1093, nome: 'Pastel Calabresa com Queijo S', preco: 39.00 },
        { id: 1094, nome: 'Pastel Calabresa Queijo Ovo P', preco: 20.00 },
        { id: 1095, nome: 'Pastel Calabresa Queijo Ovo M', preco: 26.00 },
        { id: 1096, nome: 'Pastel Calabresa Queijo Ovo G', preco: 37.00 },
        { id: 1097, nome: 'Pastel Calabresa Queijo Ovo S', preco: 42.00 },
        { id: 1098, nome: 'Pastel Vegetariano Queijo P', preco: 17.00 },
        { id: 1099, nome: 'Pastel Vegetariano Queijo M', preco: 22.00 },
        { id: 1100, nome: 'Pastel Vegetariano Queijo G', preco: 29.00 },
        { id: 1101, nome: 'Pastel Vegetariano Queijo S', preco: 37.00 },
        { id: 1102, nome: 'Pastel Vegetariano Queijo Ovo Brócolis P', preco: 22.00 },
        { id: 1103, nome: 'Pastel Vegetariano Queijo Ovo Brócolis M', preco: 28.00 },
        { id: 1104, nome: 'Pastel Vegetariano Queijo Ovo Brócolis G', preco: 34.00 },
        { id: 1105, nome: 'Pastel Vegetariano Queijo Ovo Brócolis S', preco: 40.00 },
        { id: 1106, nome: 'Cheese Burguer', preco: 24.00 },
        { id: 1107, nome: 'Cheese Salada', preco: 26.00 },
        { id: 1108, nome: 'Cheese Egg', preco: 28.00 },
        { id: 1109, nome: 'Cheese Bacon', preco: 30.00 },
        { id: 1110, nome: 'Cheese Calabresa', preco: 30.00 },
        { id: 1111, nome: 'Cheese Frango', preco: 28.00 },
        { id: 1112, nome: 'Cheese Armazém', preco: 49.00 },
        { id: 1113, nome: 'X Vegetariano', preco: 28.00 },
        { id: 1114, nome: 'X Egg Vegetariano', preco: 27.00 },
        { id: 1115, nome: 'Misto Presunto Queijo', preco: 8.00 },
        { id: 1116, nome: 'Misto Presunto Queijo Tomate', preco: 15.00 },
        { id: 1117, nome: 'Misto Presunto Queijo Tomate Ovo', preco: 20.00 },
        { id: 1118, nome: 'Misto Salame Queijo', preco: 10.00 },
        { id: 1119, nome: 'Misto Salame Queijo Tomate', preco: 16.00 },
        { id: 1120, nome: 'Misto Salame Queijo Tomate Ovo', preco: 22.00 },
        { id: 1121, nome: 'Água sem Gás Puris', preco: 3.00 },
        { id: 1122, nome: 'Água com Gás Puris', preco: 3.00 },
        { id: 1123, nome: 'Coca-Cola Lata', preco: 6.00 },
        { id: 1124, nome: 'Coca-Cola Zero Lata', preco: 6.00 },
        { id: 1125, nome: 'Coca-Cola 2 Litros', preco: 17.00 },
        { id: 1126, nome: 'Coca-Cola Zero 2 Litros', preco: 17.00 },
        { id: 1127, nome: 'Laranjinha 2 Litros', preco: 15.00 },
        { id: 1128, nome: 'Pureza Guaraná 2 Litros', preco: 15.00 },
        { id: 1129, nome: 'Budweiser 330ml', preco: 10.00 },
        { id: 1130, nome: 'Heineken 330ml', preco: 10.00 },
        { id: 1131, nome: 'Suco de Laranja 500ml', preco: 12.00 },
        { id: 1132, nome: 'Suco de Limão 500ml', preco: 12.00 },
        { id: 1133, nome: 'Suco de Maracujá 500ml', preco: 14.00 },
        { id: 1134, nome: 'Coca-Cola 600ml', preco: 12.00 },
        { id: 1135, nome: 'Laranjinha 600ml', preco: 12.00 },
        { id: 1136, nome: 'Pureza Guaraná 600ml', preco: 12.00 },
        { id: 1137, nome: 'Suco Integral de Uva', preco: 10.00 },
        { id: 1138, nome: 'Pureza 1 Litro', preco: 15.00 },
        { id: 1139, nome: 'Laranjinha 1 Litro', preco: 15.00 },
        { id: 1140, nome: 'Croquete', preco: 8.00 },
        { id: 1141, nome: 'Salsicha Simples', preco: 6.00 },
        { id: 1142, nome: 'Salsicha com Catupiry e Queijo', preco: 8.00 },
        { id: 1143, nome: 'Salsicha Empanada', preco: 9.00 },
        { id: 1144, nome: 'Empada de Frango', preco: 9.00 },
        { id: 1145, nome: 'Assado de Carne', preco: 10.00 },
        { id: 1146, nome: 'Assado de Frango', preco: 10.00 },
        { id: 1147, nome: 'Assado de Presunto e Queijo', preco: 10.00 },
        { id: 1148, nome: 'Risoles de Frango', preco: 9.00 },
        { id: 1149, nome: 'Coxinha de Frango com Catupiry', preco: 9.00 },
        { id: 1150, nome: 'Bolinho de Carne', preco: 12.00 },
        { id: 1151, nome: 'Mini Pastel de Carne', preco: 3.00 },
        { id: 1152, nome: 'Pão de Queijo', preco: 4.00 },
        { id: 1153, nome: 'Prestígio Preto', preco: 2.50 },
        { id: 1154, nome: 'Prestígio Branco', preco: 2.50 },
        { id: 1155, nome: 'Bis Extra', preco: 3.50 },
        { id: 1156, nome: 'Bis Oreo', preco: 3.50 },
        { id: 1157, nome: 'Lacta Branco', preco: 3.50 },
        { id: 1158, nome: 'Lacta ao Leite', preco: 3.50 },
        { id: 1159, nome: 'Diamante Negro', preco: 3.50 },
        { id: 1160, nome: 'Lacta Shot', preco: 3.50 },
        { id: 1161, nome: 'Trento Avelã', preco: 2.50 },
        { id: 1162, nome: 'Trento Chocolate', preco: 2.50 },
        { id: 1163, nome: 'Trento Dark 55%', preco: 2.50 },
        { id: 1164, nome: 'Trento Branco Dark', preco: 2.50 },
        { id: 1165, nome: 'Trento Alegro Preto', preco: 3.50 },
        { id: 1166, nome: 'Trento Alegro Branco', preco: 3.50 },
        { id: 1167, nome: 'Sonho de Valsa', preco: 2.00 },
        { id: 1168, nome: 'Ouro Branco', preco: 2.00 },
        { id: 1169, nome: 'Pé de Moça', preco: 3.00 },
        { id: 1170, nome: 'Paçoquinha Tradicional', preco: 1.00 },
        { id: 1171, nome: 'Gibi', preco: 1.00 },
        { id: 1172, nome: 'Geléia de Frutas', preco: 1.00 },
        { id: 1173, nome: 'Halls Extra Forte', preco: 2.50 },
        { id: 1174, nome: 'Halls Menta', preco: 2.50 },
        { id: 1175, nome: 'Halls Cereja', preco: 2.50 },
        { id: 1176, nome: 'Halls Morango', preco: 2.50 },
        { id: 1177, nome: 'Halls Uva Verde', preco: 2.50 },
        { id: 1178, nome: 'Trident Hortelã', preco: 2.50 },
        { id: 1179, nome: 'Trident Menta', preco: 2.50 },
        { id: 1180, nome: 'Trident Melancia', preco: 2.50 },
        { id: 1181, nome: 'Trident Tutti Frutti', preco: 2.50 },
        { id: 1182, nome: 'Trident Morango', preco: 2.50 },
        { id: 1183, nome: 'Trident Canela', preco: 2.50 }
      ]);
    }
  });

  // GET - Retrieve additionals from Supabase
  app.get('/api/supabase/additionals', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('adicionais')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      res.json(data || []);
    } catch (err: any) {
      console.warn('Supabase additionals fetch failed, using fallback:', err.message);
      res.json([
        { id: 2001, nome: 'Bife de Coxão Mole (Marmitex/Lá Minuta)', preco: 0.00 },
        { id: 2002, nome: 'Frango à Parmegiana (Marmitex/Lá Minuta)', preco: 0.00 },
        { id: 2003, nome: 'Chuleta de Contrafilé (Marmitex/Lá Minuta)', preco: 3.00 },
        { id: 2004, nome: 'Bife de Lentilha à Parmegiana (Marmitex/Lá Minuta)', preco: 2.00 },
        { id: 2005, nome: 'Bife de Coxão Mole Acebolado (Marmitex/Lá Minuta)', preco: 3.00 },
        { id: 2006, nome: 'Chuleta de Contrafilé Acebolada (Marmitex/Lá Minuta)', preco: 5.00 },
        { id: 2007, nome: 'Bife de Lentilha (Vegetariano) (Marmitex/Lá Minuta)', preco: 0.00 },
        { id: 2008, nome: 'Filé de Frango Grelhado (Marmitex/Lá Minuta)', preco: 0.00 },
        { id: 2009, nome: 'Adicional Bife de Coxão Mole Precoce', preco: 14.00 },
        { id: 2010, nome: 'Adicional Filé de Frango à Parmegiana', preco: 14.00 },
        { id: 2011, nome: 'Adicional Chuleta de Contrafilé', preco: 16.00 },
        { id: 2012, nome: 'Adicional Bife de Coxão Mole Acebolado', preco: 17.00 },
        { id: 2013, nome: 'Adicional Chuleta de Contrafilé Acebolada', preco: 17.00 },
        { id: 2014, nome: 'Adicional Bife de Lentilha à Parmegiana', preco: 14.00 },
        { id: 2015, nome: 'Adicional Filé de Frango Grelhado', preco: 14.00 },
        { id: 2016, nome: 'Adicional Ovo Frito', preco: 5.00 },
        { id: 2017, nome: 'Talheres Descartáveis', preco: 0.00 },
        { id: 2018, nome: 'Bolo de Prestígio Caseiro', preco: 12.00 },
        { id: 2019, nome: 'Bolo Dois Amores', preco: 12.00 },
        { id: 2020, nome: 'Pudim Caseiro', preco: 13.00 },
        { id: 2021, nome: 'Paçoquinha', preco: 1.50 },
        { id: 2022, nome: 'Geleia (Sinaleira de Monza)', preco: 1.50 },
        { id: 2023, nome: 'Pé de Moça', preco: 3.50 },
        { id: 2024, nome: 'Gibi', preco: 1.50 },
        { id: 2025, nome: 'Pastel: Queijo', preco: 6.00 },
        { id: 2026, nome: 'Pastel: Palmito', preco: 6.00 },
        { id: 2027, nome: 'Pastel: Ovo', preco: 7.00 },
        { id: 2028, nome: 'Pastel: Milho', preco: 5.00 },
        { id: 2029, nome: 'Pastel: Ervilha', preco: 5.00 },
        { id: 2030, nome: 'Pastel: Cheddar', preco: 7.00 },
        { id: 2031, nome: 'Pastel: Catupiry', preco: 7.00 },
        { id: 2032, nome: 'Pastel: Calabresa', preco: 7.00 },
        { id: 2033, nome: 'Pastel: Brócolis', preco: 6.00 },
        { id: 2034, nome: 'Pastel: Bacon', preco: 7.00 },
        { id: 2035, nome: 'Pastel: Azeitona', preco: 5.00 },
        { id: 2036, nome: 'Pastel: Tomate', preco: 5.00 }
      ]);
    }
  });

  // GET - Fetch comanda history (backed by Supabase, with automatic client-side / local in-memory fallbacks)
  app.get('/api/supabase/comandas', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('comandas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({
        fallback: false,
        data: data || []
      });
    } catch (err: any) {
      console.warn('Note: Using local memory list for comanda history fallback:', err?.message);
      res.json({
        fallback: true,
        data: orders.map(o => ({
          id: o.id,
          display_id: o.displayId,
          platform: o.platform,
          created_at: o.createdAt,
          delivery_type: o.deliveryType,
          customer_name: o.customerName,
          items: o.items,
          total: o.total,
          payment_method: o.paymentMethod,
          status: o.status
        }))
      });
    }
  });

  // POST - Explicitly save a comanda to comanda history manually
  app.post('/api/supabase/comandas', async (req, res) => {
    try {
      const order = req.body;
      const { error } = await supabase.from('comandas').upsert({
        id: order.id,
        display_id: order.displayId || order.display_id,
        platform: order.platform,
        created_at: order.createdAt || order.created_at || new Date().toISOString(),
        delivery_type: order.deliveryType || order.delivery_type,
        customer_name: order.customerName || order.customer_name,
        items: order.items,
        total: order.total,
        payment_method: order.paymentMethod || order.payment_method || 'PIX',
        status: order.status || 'pending'
      });
      if (error) throw error;
      res.status(201).json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: 'Erro ao salvar histórico', message: err?.message });
    }
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

// Start dev server / listen or setup build paths if NOT running as serverless function
async function startServer() {
  if (process.env.VERCEL) {
    // Vercel handles static file hosting (Vite dist) automatically. No need to bind listener.
    return;
  }

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

startServer().catch((err) => {
  console.error("Erro fatal ao iniciar servidor:", err);
});

export default app;
