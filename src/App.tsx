import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Printer, ChefHat, ShoppingBag, TrendingUp, Clock, ArrowRight, Search, 
  Sparkles, CheckCircle2, XCircle, PlusCircle, RotateCcw, FileJson, 
  Calendar, MapPin, Phone, CreditCard, AlertCircle, Filter, 
  Volume2, VolumeX, ChevronDown, ChevronUp, SlidersHorizontal, Trash2, 
  ExternalLink, Layers, RefreshCw, Edit
} from 'lucide-react';
import { NormalizedOrder, OrderPlatform } from './types';
import DashboardStats from './components/DashboardStats';
import OrderSimulator from './components/OrderSimulator';
import CommandLogo from './components/CommandLogo';
import LocalOrderModal from './components/LocalOrderModal';
import ComandaHistoryModal from './components/ComandaHistoryModal';

const formatAddName = (name: string): string => {
  if (!name) return '';
  return name
    .replace(/^Adicional:\s*/i, '')
    .replace(/^Adicional\s+/i, '')
    .replace('Pastel: ', '')
    .replace(' (Marmitex/Lá Minuta)', '')
    .trim();
};

const isProteinAdditional = (name: string): boolean => {
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes('(marmitex/la minuta)') || lower.includes('(marmitex/lá minuta)');
};

export default function App() {
  const [orders, setOrders] = useState<NormalizedOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | OrderPlatform>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'printed' | 'canceled'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'older'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // Local/Manual order creation & editing state
  const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<NormalizedOrder | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSelectOrderFromHistory = (order: NormalizedOrder) => {
    setOrders(prev => {
      const exists = prev.some(o => o.id === order.id);
      if (exists) {
        return prev;
      }
      return [order, ...prev];
    });
    setSelectedOrderId(order.id);
    setIsHistoryOpen(false);
  };
  
  // Custom Print stimulation states
  const [printSimulationRunning, setPrintSimulationRunning] = useState(false);
  const [printSimulationType, setPrintSimulationType] = useState<'normal' | 'kitchen' | 'both' | null>(null);
  const [printSoundEnabled, setPrintSoundEnabled] = useState(true);
  const [showRawPayload, setShowRawPayload] = useState(false);

  // Auto-reload timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch orders from API
  const fetchOrders = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Retornou uma resposta não-JSON (por exemplo, HTML ou texto puro). O servidor pode estar reiniciando.');
        }
        
        const data: NormalizedOrder[] = await res.json();
        setOrders(data);
        
        // Auto-select first order if none selected or the selected one isn't in list anymore
        if (data.length > 0) {
          setSelectedOrderId(prev => {
            if (!prev) return data[0].id;
            const stillExists = data.some(o => o.id === prev);
            return stillExists ? prev : data[0].id;
          });
        } else {
          setSelectedOrderId(null);
        }
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      console.warn('Silent skipping of error fetching orders (e.g. server booting up):', err);
    } finally {
      if (!silent) {
        // Subtle fake timeout delay for delightful UI feedback
        setTimeout(() => setIsRefreshing(false), 200);
      }
    }
  };

  // Setup periodic refresh
  useEffect(() => {
    fetchOrders();
    timerRef.current = setInterval(() => {
      fetchOrders(true);
    }, 5000); // Poll every 5 seconds

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Smooth scroll to preview panel on mobile when an order is selected
  useEffect(() => {
    if (selectedOrderId && window.innerWidth < 1024) {
      const element = document.getElementById('print-visualization-column');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedOrderId]);

  // Web Audio simulated mechanical thermal printer hum
  const playPrinterSound = () => {
    if (!printSoundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Sound timeline beats: buzz - pause - buzz - clck
      const beats = [
        { time: 0, duration: 0.16, freq: 110 },
        { time: 0.18, duration: 0.12, freq: 115 },
        { time: 0.32, duration: 0.16, freq: 110 },
        { time: 0.5, duration: 0.22, freq: 120 },
        { time: 0.74, duration: 0.08, freq: 70 }, // cutter tuck sound
      ];
      
      beats.forEach(beat => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(beat.freq, ctx.currentTime + beat.time);
        
        // Subtle frequency modulator/noise to mimic POS stepper motor rattling
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.value = 52; 
        vibratoGain.gain.value = 24; 
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        
        gain.gain.setValueAtTime(0, ctx.currentTime + beat.time);
        gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + beat.time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + beat.time + beat.duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        vibrato.start(ctx.currentTime + beat.time);
        osc.start(ctx.currentTime + beat.time);
        
        vibrato.stop(ctx.currentTime + beat.time + beat.duration);
        osc.stop(ctx.currentTime + beat.time + beat.duration);
      });
    } catch (error) {
      console.warn("Audio Context print sound blocked:", error);
    }
  };

  // Manual Trigger Print API action & Sound demo
  const handlePrint = async (id: string, type: 'normal' | 'kitchen' | 'both') => {
    setPrintSimulationType(type);
    setPrintSimulationRunning(true);
    playPrinterSound();

    try {
      const res = await fetch(`/api/orders/${id}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (res.ok) {
        // Wait for the delightful visual paper feed animation to finish
        setTimeout(() => {
          setPrintSimulationRunning(false);
          setPrintSimulationType(null);
          fetchOrders(true); // Refetch quietly to update printed checks
        }, 1200);
      } else {
        setPrintSimulationRunning(false);
        setPrintSimulationType(null);
      }
    } catch (error) {
      console.error('Error triggering print:', error);
      setPrintSimulationRunning(false);
      setPrintSimulationType(null);
    }
  };

  // Quick action to trigger OS native print dialog
  const printDirectly = () => {
    window.print();
  };

  // Change order active status
  const handleUpdateStatus = async (id: string, status: 'pending' | 'printed' | 'canceled') => {
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders(true);
      }
    } catch (e) {
      console.error('Error changing order status:', e);
    }
  };

  // Delete individual order helper
  const handleDeleteOrder = async (id: string) => {
    if (confirm('Deseja realmente excluir esta comanda do painel?')) {
      try {
        const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchOrders();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Clear DB entirely helper
  const handleResetOrders = async () => {
    if (confirm('ATENÇÃO: Deseja apagar todas as comandas registradas no histórico do painel?')) {
      try {
        await fetch('/api/orders/reset', { method: 'POST' });
        fetchOrders();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleOpenCreateLocalOrderModal = () => {
    setOrderToEdit(null);
    setIsLocalModalOpen(true);
  };

  const handleOpenEditLocalOrderModal = (order: NormalizedOrder) => {
    setOrderToEdit(order);
    setIsLocalModalOpen(true);
  };

  const handleSaveLocalOrder = async (orderData: Partial<NormalizedOrder>) => {
    try {
      if (orderToEdit) {
        const res = await fetch(`/api/orders/${orderToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        if (res.ok) {
          try {
            const data = await res.json();
            if (data && data.order && data.order.id) {
              setSelectedOrderId(data.order.id);
            }
          } catch (err) {
            console.error('Error parsing response:', err);
          }
          fetchOrders(true);
        }
      } else {
        const res = await fetch('/api/orders/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        if (res.ok) {
          try {
            const data = await res.json();
            if (data && data.order && data.order.id) {
              setSelectedOrderId(data.order.id);
            }
          } catch (err) {
            console.error('Error parsing response:', err);
          }
          fetchOrders(true);
        }
      }
    } catch (e) {
      console.error('Error saving local order:', e);
    }
  };

  // Setup sample mock data helper
  const handleSetupMocks = async () => {
    try {
      await fetch('/api/orders/setup-mocks', { method: 'POST' });
      fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  // Select active order object
  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Grouped history breakdown block requested: "O dashboard terá que conter o histórico de comandas, separadas por dia e horário"
  const groupedOrdersByDate = useMemo(() => {
    // We group all non-pending orders (or all orders in general) in chronological order
    const sorted = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const groups: Record<string, NormalizedOrder[]> = {};
    sorted.forEach(order => {
      let dateKey = 'Outros Dias';
      try {
        const dateObj = new Date(order.createdAt);
        const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        
        // Check if today or yesterday
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (dateObj.toDateString() === today.toDateString()) {
          dateKey = `Hoje (${dayMonth})`;
        } else if (dateObj.toDateString() === yesterday.toDateString()) {
          dateKey = `Ontem (${dayMonth})`;
        } else {
          // Format full date name
          const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
          dateKey = `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayMonth}`;
        }
      } catch (e) {
        // fallback
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(order);
    });

    return Object.entries(groups);
  }, [orders]);

  // Filtered orders list for the active Queue
  const filteredActiveOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Query search (Display ID or Customer Name)
      const matchesSearch = 
        order.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Channel/Platform Filter
      const matchesPlatform = platformFilter === 'all' || order.platform === platformFilter;

      // 3. Status filter
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [orders, searchQuery, platformFilter, statusFilter]);

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 antialiased selection:bg-yellow-400 selection:text-neutral-950 font-sans">
      
      {/* Dynamic LPT Thermal Printing Frame Overlay (Standard CSS print handler overrides actual styles) */}
      {selectedOrder && (
        <div className="hidden print:block printable-section">
          {/* Output depends on what layout wants or we present both side-by-side inside thermal paper wrap */}
          <div className="flex flex-col gap-6 p-4">
            {/* Standard Complete Receipt - Hidden for local tabletop orders */}
            {selectedOrder.deliveryType !== 'local' && (
              <>
                <div className="bg-white text-neutral-900 p-3 font-mono text-xs clean-print-paper leading-tight">
                  <div className="text-center border-b border-dashed border-neutral-400 pb-3 mb-3">
                    <p className="font-bold text-sm">ARMAZÉM RECHE</p>
                    <p className="text-xs uppercase font-black">{selectedOrder.platform} {selectedOrder.displayId}</p>
                    <p className="text-[10px] mt-0.5">{new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="mb-3 space-y-0.5 text-[11px]">
                    <p><strong>MÉTODO:</strong> {selectedOrder.deliveryType === 'retirada' ? 'RETIRADA EM LOCAL' : 'RECEPÇÃO DELIVERY'}</p>
                    <p><strong>CLIENTE:</strong> {selectedOrder.customerName}</p>
                    {selectedOrder.customerPhone && <p><strong>FONE:</strong> {selectedOrder.customerPhone}</p>}
                    {selectedOrder.customerAddress && (
                      <p>
                        <strong>ENDEREÇO:</strong> {selectedOrder.customerAddress.formatted}
                        {selectedOrder.deliveryType === 'delivery' && selectedOrder.customerPhone && (
                          <span className="block font-bold mt-1 text-[10px] text-neutral-800 bg-neutral-100 p-1 rounded">
                            📞 FONE ENTREGA: {selectedOrder.customerPhone}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  
                  <div className="border-b border-dashed border-neutral-400 pb-2 mb-2 space-y-1">
                    <p className="font-bold text-[10px] uppercase text-neutral-500">PRODUTOS</p>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="text-[11px]">
                        <div className="flex justify-between font-bold">
                          <span>{item.quantity.toString().padStart(2, '0')}x {item.name}</span>
                          <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.observations && (
                          <p className="text-[10px] italic text-neutral-700 pl-3">Obs: {item.observations}</p>
                        )}
                        {item.additionals && item.additionals.length > 0 && item.additionals.map((add, addIdx) => (
                          <p key={addIdx} className="text-[10px] text-neutral-600 pl-3">
                            + {add.quantity}x {formatAddName(add.name)} (R$ {((add.price || 0) * add.quantity).toFixed(2)})
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-0.5 text-right font-mono text-[11px]">
                    <p>SUBTOTAL: R$ {selectedOrder.subtotal.toFixed(2)}</p>
                    <p>TAXA: R$ {selectedOrder.deliveryFee.toFixed(2)}</p>
                    {selectedOrder.discount && selectedOrder.discount > 0 ? (
                      <p>DESCONTOS: -R$ {selectedOrder.discount.toFixed(2)}</p>
                    ) : null}
                    <p className="font-bold text-sm border-t border-dashed border-neutral-400 pt-1 mt-1">
                      TOTAL CLIENTE: R$ {selectedOrder.total.toFixed(2)}
                    </p>
                  </div>
                  <div className="mt-2 text-center text-[10px] border-t border-neutral-300 pt-2 text-neutral-600">
                    <p>Plataforma {selectedOrder.platform} • Simulado por Armazém Reche</p>
                  </div>
                </div>

                <div className="h-5 border-b border-dashed border-zinc-450"></div>
              </>
            )}

            {/* Standard Standardized kitchen Receipt (Only specific fields required!) */}
            <div className="bg-white text-neutral-900 p-3 font-mono text-xs clean-print-paper border-2 border-neutral-900 leading-tight">
              <div className="border-b border-neutral-800 pb-2 mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="bg-neutral-950 text-white font-black px-2.5 py-1 text-lg">COD: {selectedOrder.displayId}</span>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-neutral-500 uppercase">HORA EMISSÃO</p>
                    <p className="font-bold text-sm">{selectedOrder.orderTime}</p>
                  </div>
                </div>
                <p className="text-[11px] font-black uppercase mt-2">CLIENTE: {selectedOrder.customerName}</p>
              </div>

              <div className="bg-neutral-150 py-1 text-center font-extrabold uppercase text-xs tracking-wider mb-3 bg-neutral-200">
                {selectedOrder.deliveryType === 'local' ? 'PEDIDO EM LOCO' : selectedOrder.deliveryType === 'retirada' ? 'RETIRADA NO BALCÃO' : 'ENTREGA (DELIVERY)'}
              </div>

              <div className="space-y-3">
                {selectedOrder.items.map((item, idx) => {
                  const protein = item.additionals?.find(add => isProteinAdditional(add.name));
                  const otherAdditionals = item.additionals?.filter(add => !isProteinAdditional(add.name)) || [];
                  const displayName = protein ? `${item.name} (${formatAddName(protein.name)})` : item.name;

                  return (
                    <div key={idx} className="border-b border-neutral-200 pb-2 last:border-b-0">
                      <div className="flex justify-between text-sm font-black">
                        <span>{item.quantity}x {displayName}</span>
                      </div>
                      {otherAdditionals.length > 0 && (
                        <div className="pl-3 mt-1 space-y-0.5 text-xs text-neutral-700 font-semibold bg-neutral-50 p-1">
                          <span className="text-[9px] text-neutral-400 uppercase tracking-wider block font-bold">Adicionais:</span>
                          {otherAdditionals.map((add, addIdx) => (
                            <div key={addIdx}>
                              • {add.quantity}x {formatAddName(add.name)}
                            </div>
                          ))}
                        </div>
                      )}
                      {item.observations && (
                        <div className="mt-1 pl-2 border-l-2 border-yellow-500 text-xs italic font-bold text-neutral-800 bg-yellow-50 p-1">
                          Obs: {item.observations}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-center text-[10px] text-neutral-500 pt-2 border-t border-dashed border-neutral-300">
                <p>--- EXPEDIÇÃO COZINHA ---</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* High Density Header Layout */}
      <header className="bg-neutral-900 text-neutral-100 border-b border-neutral-800 py-3.5 px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center gap-3 sticky top-0 z-50 shadow-lg shadow-neutral-950/20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="bg-neutral-950 text-yellow-400 p-2 font-black text-xl tracking-tighter rounded-lg border border-neutral-850 block md:hidden">
            AR
          </div>
          <h1 className="text-neutral-50 font-extrabold text-xl sm:text-2xl uppercase tracking-tighter flex items-center gap-2">
            <ChefHat className="w-6 h-6 stroke-[2.5] text-yellow-400" />
            Armazém Reche <span className="font-light opacity-70 lowercase text-lg sm:text-xl tracking-normal text-neutral-400">comandas</span>
          </h1>
        </div>

        {/* Integration Status Flags */}
        <div className="flex items-center gap-3.5 flex-wrap text-[11px] font-bold">
          <div className="flex gap-2.5 items-center flex-wrap">
            <span className="flex items-center gap-2 px-2.5 py-1 bg-neutral-950/60 border border-neutral-800/80 rounded-lg text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-red-550 animate-pulse"></span>
              iFood <span className="text-neutral-500 font-normal">INTEGRADO</span>
            </span>
            <span className="flex items-center gap-2 px-2.5 py-1 bg-neutral-950/60 border border-neutral-800/80 rounded-lg text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-violet-550 animate-pulse"></span>
              Anota.ai <span className="text-neutral-500 font-normal">INTEGRADO</span>
            </span>
            <span className="flex items-center gap-2 px-2.5 py-1 bg-neutral-950/60 border border-neutral-800/80 rounded-lg text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-550 animate-pulse"></span>
              Delivery Much <span className="text-neutral-500 font-normal">INTEGRADO</span>
            </span>
          </div>

          {/* Sound toggle controls */}
          <button 
            id="btn-toggle-sounds"
            onClick={() => setPrintSoundEnabled(!printSoundEnabled)}
            className={`p-2 rounded-lg cursor-pointer transition border border-neutral-800 bg-neutral-950/40 ${printSoundEnabled ? 'text-yellow-400 hover:text-yellow-300 hover:bg-neutral-800' : 'text-neutral-600 hover:text-neutral-500'}`}
            title={printSoundEnabled ? 'Silenciar som da impressora' : 'Ativar som da impressora'}
          >
            {printSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <span className="bg-neutral-950 text-yellow-400 font-mono font-bold text-xs px-3 py-1.5 rounded-lg border border-neutral-800">
            {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {/* Prominent High-Visibility Quick-Launcher for Waiters (Mobile only) */}
      <div className="block lg:hidden p-3.5 bg-neutral-950/80 border-b border-neutral-850/70 backdrop-blur sticky top-[68px] z-40 space-y-2">
        <button
          id="btn-create-local-order-mobile"
          type="button"
          onClick={handleOpenCreateLocalOrderModal}
          className="w-full bg-yellow-400 active:bg-yellow-500 text-neutral-950 font-black py-4 px-4 rounded-xl text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-yellow-400/10 hover:shadow-yellow-400/25 active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5 text-neutral-950 stroke-[2.5]" />
          LANÇAR NOVO PEDIDO EM LOCO
        </button>
        <button
          id="btn-open-history-mobile"
          type="button"
          onClick={() => setIsHistoryOpen(true)}
          className="w-full bg-neutral-900 border border-neutral-800 text-yellow-500 hover:text-yellow-400 font-extrabold py-3 px-4 rounded-xl text-xs tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-[0.98]"
        >
          <Calendar className="w-4 h-4 text-yellow-500" />
          HISTÓRICO DE COMANDAS (SUPABASE)
        </button>
      </div>

      {/* Main Grid Viewport */}
      <main className="flex-1 p-4 md:p-6 max-w-[1720px] mx-auto w-full grid grid-cols-1 xl:grid-cols-12 gap-5 overflow-y-auto xl:overflow-hidden">
        
        {/* Full-Width stats overview banner bar */}
        <div className="col-span-1 xl:col-span-12">
          <DashboardStats 
            orders={orders} 
            onRefresh={() => fetchOrders()} 
            isRefreshing={isRefreshing} 
          />

          {/* Quick Sandbox Simulator Toggle Header Banner */}
          <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-2xl px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-neutral-950/15 backdrop-blur-sm">
            <div className="flex items-center gap-3.5">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"></span>
              </span>
              <div>
                <span className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">Painel de Testes & Simulação de Webhook</span>
                <p className="text-xs text-neutral-400 mt-0.5">Injete comanda de modelo iFood, Anota.ai ou Delivery Much para verificar a formatação em tempo real.</p>
              </div>
            </div>
            <button
              id="btn-toggle-simulator"
              onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition border ${
                isSimulatorOpen 
                  ? 'bg-yellow-400 text-neutral-900 border-yellow-500 font-extrabold hover:bg-yellow-500 shadow-md shadow-yellow-400/10' 
                  : 'bg-neutral-950 text-yellow-400 border-neutral-800 hover:border-neutral-700 hover:text-yellow-300 hover:bg-neutral-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {isSimulatorOpen ? 'Ocultar Simulador' : 'Exibir Simulador'}
              {isSimulatorOpen ? <ChevronUp className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>

          {/* Animated Expandable Webhook Tester Box */}
          {isSimulatorOpen && (
            <div className="transition-all duration-300 transform origin-top mb-5 animate-receipt-roll">
              <OrderSimulator onOrderAdded={() => fetchOrders(true)} />
            </div>
          )}
        </div>

        {/* COLUMN 1: LIVE ORDERS LISTING AND QUEUE (Left column, 4 cols width on desktop) */}
        <section id="sidebar-queue-column" className="col-span-1 xl:col-span-4 flex flex-col bg-neutral-900 border border-neutral-800/80 rounded-xl overflow-hidden shadow-lg xl:h-[780px]">
          
          {/* Header Controls for Queue search & filters */}
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/50 space-y-2.5">
            {/* Highly clickable and visible local order wizard launch button */}
            <div className="pt-1 flex flex-col gap-2">
              <button
                id="btn-create-local-order"
                type="button"
                onClick={handleOpenCreateLocalOrderModal}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-neutral-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md shadow-yellow-450/10 hover:shadow-yellow-400/20 active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
                LANÇAR NOVO PEDIDO EM LOCO
              </button>
              <button
                id="btn-open-history"
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="w-full bg-neutral-950 hover:bg-neutral-850 hover:text-white text-yellow-500 font-extrabold py-2 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-800 transition active:scale-[0.98]"
              >
                <Calendar className="w-3.5 h-3.5 text-yellow-500" />
                HISTÓRICO GERENCIA DE COMANDAS
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-850 pt-2.5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                Pedidos Ativos ({filteredActiveOrders.filter(o => o.status === 'pending').length})
              </h2>
              <span className="bg-neutral-800 px-2 py-0.5 rounded text-[10px] font-mono text-neutral-400">
                {filteredActiveOrders.length} listados
              </span>
            </div>

            {/* Live Search Client/Display Id */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
              <input
                id="order-search-input"
                type="text"
                placeholder="Buscar comandas ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400/40 rounded-lg pl-8 p-1.5 text-xs text-neutral-200 outline-none transition focus:ring-1 focus:ring-yellow-400/20"
              />
            </div>

            {/* Quick Filters */}
            <div id="queue-filter-row" className="flex flex-col gap-1.5 pt-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[9px] uppercase text-neutral-400 font-bold tracking-wider">Canais:</span>
                <div className="flex flex-wrap gap-1">
                  {(['all', 'ifood', 'anotai', 'deliverymuch', 'local'] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setPlatformFilter(ch)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition ${
                        platformFilter === ch 
                          ? 'bg-yellow-400 text-neutral-950 font-black' 
                          : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-750'
                      }`}
                    >
                      {ch === 'all' ? 'Ver Todos' : ch === 'local' ? 'Em Loco' : ch.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] uppercase text-neutral-400 font-bold tracking-wider">Status:</span>
                <div className="flex gap-1">
                  {(['all', 'pending', 'printed', 'canceled'] as const).map((stat) => {
                    const labelState: Record<string, string> = {
                      all: 'Todos',
                      pending: 'Pendentes',
                      printed: 'Impressos',
                      canceled: 'Cancelados'
                    };
                    return (
                      <button
                        key={stat}
                        onClick={() => setStatusFilter(stat)}
                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer transition ${
                          statusFilter === stat 
                            ? 'bg-neutral-100 text-neutral-950' 
                            : 'bg-neutral-950 text-neutral-500 hover:text-neutral-350'
                        }`}
                      >
                        {labelState[stat]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Scrolling Comanda Queue List */}
          <div id="comandas-queue-scroller" className="flex-1 overflow-y-auto divide-y divide-neutral-850 bg-neutral-950/20 h-96 xl:h-auto">
            {filteredActiveOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 space-y-2">
                <ShoppingBag className="w-8 h-8 text-neutral-700 mx-auto" />
                <p>Nenhuma comanda encontrada para os filtros atuais.</p>
                <div className="pt-2">
                  <button 
                    onClick={() => {
                      setSearchQuery('');
                      setPlatformFilter('all');
                      setStatusFilter('all');
                    }}
                    className="text-yellow-400 hover:underline font-bold text-[11px]"
                  >
                    Resetar Filtros
                  </button>
                </div>
              </div>
            ) : (
              filteredActiveOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                
                // Color badges for channels
                const channelStyles: Record<OrderPlatform, { bg: string, text: string }> = {
                  ifood: { bg: 'bg-red-500', text: 'text-white' },
                  anotai: { bg: 'bg-violet-600', text: 'text-white' },
                  deliverymuch: { bg: 'bg-emerald-600', text: 'text-white' },
                  local: { bg: 'bg-yellow-400 text-neutral-950 font-black', text: 'text-neutral-950' }
                };

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-3 relative cursor-pointer select-none transition border-l-4 ${
                      isSelected 
                        ? 'bg-neutral-800/80 border-yellow-400' 
                        : 'bg-transparent border-transparent hover:bg-neutral-900/50'
                    }`}
                  >
                    {/* Timestamp & Tag row */}
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex gap-1.5 items-center">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none ${channelStyles[order.platform].bg} ${channelStyles[order.platform].text}`}>
                          {order.platform.toUpperCase()}
                        </span>
                        <span className="font-mono text-xs font-black text-neutral-200">{order.displayId}</span>
                      </div>
                      <span className="font-mono text-[10px] text-neutral-500 flex items-center gap-1.5 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-neutral-600" />
                        {(() => {
                          try {
                            if (order.createdAt) {
                              const d = new Date(order.createdAt);
                              const formattedDate = d.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                timeZone: 'America/Sao_Paulo'
                              });
                              return `${formattedDate} ${order.orderTime}`;
                            }
                          } catch (e) {
                            // Safe fallback
                          }
                          return order.orderTime;
                        })()}
                      </span>
                    </div>

                    {/* Customer & Description brief */}
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs text-neutral-100 truncate">{order.customerName}</p>
                      
                      {/* Delivery badge indicator */}
                      <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        order.deliveryType === 'local'
                          ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                          : order.deliveryType === 'retirada' 
                          ? 'bg-orange-950/50 text-orange-400 border border-orange-900/30' 
                          : 'bg-blue-950/50 text-blue-400 border border-blue-900/30'
                      }`}>
                        {order.deliveryType === 'local' ? 'Em Loco' : order.deliveryType === 'retirada' ? 'Retirada' : '🔐 Delivery'}
                      </span>
                      
                      <p className="text-[11px] text-neutral-450 truncate">
                        {order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                      </p>
                    </div>

                    {/* Status check markers at absolute footer */}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-900 text-[10px]">
                      <span className="font-mono text-neutral-300 font-bold">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="flex gap-1.5">
                        <span className={`px-1 rounded text-[9px] ${order.printed ? 'text-green-400' : 'text-neutral-600'}`} title="Impresso Geral">
                          C: {order.printed ? '✓' : '✗'}
                        </span>
                        <span className={`px-1 rounded text-[9px] ${order.printedKitchen ? 'text-yellow-400' : 'text-neutral-600'}`} title="Impresso Cozinha">
                          K: {order.printedKitchen ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>

                    {/* Pending state glow bar */}
                    {order.status === 'pending' && (
                      <span className="absolute top-2 right-2 flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-yellow-400"></span>
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar quick footer controls */}
          <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center text-xs">
            <span className="text-neutral-500 font-semibold font-mono">Ar. Reche API Feed</span>
            <div className="flex gap-2">
              <button 
                id="btn-trigger-mocks"
                onClick={handleSetupMocks}
                className="text-[10px] bg-neutral-900 hover:bg-neutral-800 text-yellow-500 border border-neutral-800 px-2 py-1 rounded"
              >
                Injetar Amostras
              </button>
              <button
                id="btn-purge-queue"
                onClick={handleResetOrders}
                className="text-[10px] bg-neutral-900 hover:bg-red-950 hover:text-red-400 text-neutral-500 border border-neutral-800 px-2 py-1 rounded transition"
                title="Limpar todas as comandas do banco"
              >
                Esvaziar
              </button>
            </div>
          </div>
        </section>

        {/* COLUMN 2: PRIMARY PRINT PREVIEW PANEL (Center element, 5 cols screen width) */}
        <section id="print-visualization-column" className="col-span-1 xl:col-span-5 flex flex-col bg-neutral-900 border border-neutral-800/80 rounded-xl p-4 md:p-5 justify-between shadow-lg overflow-hidden relative xl:h-[780px]">
          
          <div className="flex items-center justify-between border-b border-neutral-850 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-300">
                Visualização do Cupom Térmico
              </h2>
              <span className="text-[10px] text-neutral-500 tracking-wide font-mono block mt-1">
                {selectedOrder ? `Pedido ID: ${selectedOrder.id}` : 'Nenhum pedido selecionado'}
              </span>
            </div>

            {/* Simulated mechanical visual noise bar */}
            {printSimulationRunning && (
              <div className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-400/30 px-2.5 py-1 rounded-md">
                <div className="flex h-4 items-center">
                  <span className="sound-bar"></span>
                  <span className="sound-bar"></span>
                  <span className="sound-bar"></span>
                  <span className="sound-bar"></span>
                </div>
                <span className="font-mono text-[10px] text-yellow-400 font-black animate-pulse">
                  GRAVANDO...
                </span>
              </div>
            )}
          </div>

          {!selectedOrder ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-neutral-500">
              <Printer className="w-12 h-12 text-neutral-800 mb-2.5" />
              <p className="font-bold text-sm">Selecione uma comanda na fila para visualizar e simular impressão.</p>
              <p className="text-xs text-neutral-600 mt-1 max-w-xs">Qualquer pedido enviado via webhook surgirá imediatamente.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Receipt Preview Selection toggles */}
              <div 
                id="receipt-columns-container" 
                className={`grid gap-4 flex-1 ${selectedOrder.deliveryType === 'local' ? 'grid-cols-1 max-w-sm mx-auto w-full' : 'grid-cols-1 md:grid-cols-2'}`}
              >
                
                {/* 1. Normal Thermal Receipt Mock (All data) - Hidden for local orders */}
                {selectedOrder.deliveryType !== 'local' && (
                  <div id="normal-comanda-container" className="flex flex-col relative">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 mb-2.5 block">
                      Comanda Completa (Via API)
                    </span>

                    <div className={`bg-white text-neutral-950 p-4 font-mono text-[11px] rounded-sm shadow-xl min-h-[360px] max-h-[480px] overflow-y-auto leading-tight relative transition-all border border-neutral-350 ${
                      printSimulationRunning && (printSimulationType === 'normal' || printSimulationType === 'both') 
                        ? 'animate-receipt-roll rotate-1 bg-yellow-50/20' 
                        : ''
                    }`}>
                      {/* Receipts Jagged Cut simulation header */}
                      <div className="absolute top-0 left-0 w-full flex justify-between px-1 bg-neutral-200/50 py-0.5 text-[7px] text-neutral-400 select-none border-b border-dashed border-neutral-350">
                        <span>✂------- TEAR HERE -------✂</span>
                        <span>{selectedOrder.id.substring(0, 8)}</span>
                      </div>

                      <div className="text-center border-b border-dashed border-neutral-400 pb-2 mb-3 mt-2">
                        <p className="font-bold text-sm tracking-tight">ARMAZÉM RECHE</p>
                        <p className="text-xs uppercase font-bold text-red-650 bg-neutral-100 py-0.5 mt-0.5">
                          {selectedOrder.platform.toUpperCase()} #{selectedOrder.displayId}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-1">EMISSÃO: {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}</p>
                      </div>

                      <div className="mb-3 space-y-0.5 text-[10.5px] border-b border-dashed border-neutral-300 pb-2">
                        <p><strong>MODO:</strong> {selectedOrder.deliveryType.toUpperCase()}</p>
                        <p><strong>CLIENTE:</strong> {selectedOrder.customerName}</p>
                        {selectedOrder.customerPhone && <p><strong>FONE:</strong> {selectedOrder.customerPhone}</p>}
                        {selectedOrder.customerAddress && (
                          <div>
                            <p className="font-semibold mt-0.5">ENDEREÇO:</p>
                            <p className="text-[10px] text-neutral-600 pl-1">
                              {selectedOrder.customerAddress.formatted}
                              {selectedOrder.deliveryType === 'delivery' && selectedOrder.customerPhone && (
                                <span className="block font-bold text-[9.5px] text-red-700 bg-red-50/60 px-1.5 py-0.5 rounded-sm mt-1 border border-red-100/40">
                                  📞 FONE ENTREGA: {selectedOrder.customerPhone}
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Products details */}
                      <div className="space-y-2 mb-3 border-b border-dashed border-neutral-300 pb-2">
                        <p className="text-[9px] font-black tracking-widest text-neutral-450 uppercase">PRODUTOS DO PEDIDO</p>
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <div className="flex justify-between font-bold">
                              <span>{item.quantity.toString().padStart(2, '0')}x {item.name}</span>
                              <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            
                            {/* Compls */}
                            {item.additionals && item.additionals.length > 0 && item.additionals.map((add, addIdx) => (
                              <p key={addIdx} className="text-[9.5px] text-neutral-600 pl-3">
                                + {add.quantity}x {formatAddName(add.name)} (R$ {((add.price || 0) * add.quantity).toFixed(2)})
                              </p>
                            ))}

                            {item.observations && (
                              <p className="text-[9.5px] italic text-red-700 bg-red-50 px-1 py-0.5 rounded-sm inline-block mt-0.5">
                                ⚠️ Obs: {item.observations}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Payment & Totals details */}
                      <div className="space-y-1 text-right text-[10.5px]">
                        <p className="text-neutral-500 text-left text-[9px] mb-1 font-semibold uppercase">
                          FORMA: <span className="text-neutral-900 font-bold">{selectedOrder.paymentMethod}</span> ({selectedOrder.paymentType})
                        </p>
                        {selectedOrder.changeFor && (
                          <p className="text-left font-bold text-neutral-700 text-[10px]">
                            Troco para R$ {selectedOrder.changeFor.toFixed(2)} (Troco: R$ {(selectedOrder.changeFor - selectedOrder.total).toFixed(2)})
                          </p>
                        )}
                        
                        <div className="border-t border-neutral-200 pt-1.5 space-y-0.5 font-mono">
                          <p>SUBTOTAL: R$ {selectedOrder.subtotal.toFixed(2)}</p>
                          <p>ENTREGA: R$ {selectedOrder.deliveryFee.toFixed(2)}</p>
                          {selectedOrder.discount && selectedOrder.discount > 0 ? (
                            <p className="text-red-650">DESCONTO: -R$ {selectedOrder.discount.toFixed(2)}</p>
                          ) : null}
                          <p className="font-extrabold text-xs text-neutral-900 border-t border-dashed border-neutral-400 pt-1 mt-1 text-right">
                            TOTAL: R$ {selectedOrder.total.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-dashed border-neutral-300 text-center text-[9px] text-neutral-500">
                        <p>Obrigado pelo seu pedido!</p>
                        <p className="font-mono tracking-tighter mt-1 text-[8px]">POWERED BY ARMAZÉM RECHE</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Standardized kitchen Receipt (Only specific fields required!) */}
                <div id="kitchen-comanda-container" className="flex flex-col relative text-neutral-950">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-400 mb-2.5 block">
                    Comanda Simplificada (KITCHEN)
                  </span>

                  <div className={`bg-yellow-50 text-neutral-950 p-4 font-mono text-xs rounded-sm shadow-xl min-h-[360px] max-h-[480px] overflow-y-auto leading-tight border-2 border-yellow-450 relative transition-all ${
                    printSimulationRunning && (printSimulationType === 'kitchen' || printSimulationType === 'both') 
                      ? 'animate-receipt-roll -rotate-1 bg-yellow-100' 
                      : ''
                  }`}>
                    {/* Tear line simulation */}
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-yellow-450"></div>
                    
                    {/* Simplified Header */}
                    <div className="border-b-2 border-neutral-900 pb-2 mb-3 pt-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="bg-neutral-950 text-white font-black px-2.5 py-1 text-base leading-none">
                          #{selectedOrder.displayId}
                        </span>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-neutral-500 block">HORA</span>
                          <span className="font-black text-sm">{selectedOrder.orderTime}</span>
                        </div>
                      </div>
                      <p className="text-[11px] font-black uppercase text-neutral-900 mt-1 truncate">
                        CLIENTE: {selectedOrder.customerName}
                      </p>
                    </div>

                    {/* Delivery or Collection type */}
                    <div className="bg-neutral-950 text-yellow-400 px-3 py-1 text-center font-extrabold text-xs uppercase tracking-widest mb-3 rounded-sm">
                      {selectedOrder.deliveryType === 'local' ? 'PEDIDO EM LOCO' : selectedOrder.deliveryType === 'retirada' ? 'RETIRADA EM LOJA' : 'ENTREGA (DELIVERY)'}
                    </div>

                    {/* Content Section - ONLY target details: quantities, item itself, additionals, and observation */}
                    <div className="space-y-3 font-semibold text-neutral-900">
                      {selectedOrder.items.map((item, idx) => {
                        const protein = item.additionals?.find(add => isProteinAdditional(add.name));
                        const otherAdditionals = item.additionals?.filter(add => !isProteinAdditional(add.name)) || [];
                        const displayName = protein ? `${item.name} (${formatAddName(protein.name)})` : item.name;

                        return (
                          <div key={idx} className="border-b border-neutral-350 pb-2 last:border-b-0 space-y-1">
                            <div className="flex items-start justify-between">
                              <span className="text-sm font-black tracking-tight flex items-center gap-1">
                                <span className="bg-neutral-900 text-white text-[11px] px-1.5 py-0.2 rounded-sm font-mono mr-1">
                                  {item.quantity}x
                                </span>
                                {displayName}
                              </span>
                            </div>

                            {/* List of additionals */}
                            {otherAdditionals.length > 0 && (
                              <div className="pl-3 py-1 text-xs text-neutral-800 font-semibold bg-yellow-100/60 rounded">
                                <p className="text-[8px] uppercase tracking-wider text-neutral-500 font-bold block mb-0.5">Adicionais:</p>
                                {otherAdditionals.map((add, addIdx) => (
                                  <div key={addIdx} className="font-bold">
                                    + {add.quantity}x {formatAddName(add.name)}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Observations */}
                            {item.observations && (
                              <div className="mt-1 pl-2 border-l-3 border-neutral-950 text-[11px] font-extrabold text-neutral-950 bg-yellow-200/80 px-2 py-1 uppercase rounded-sm">
                                ⚠️ OBS: {item.observations}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Extra disclaimer block */}
                    <div className="mt-4 pt-3.5 border-t border-dashed border-neutral-400 text-center">
                      <p className="font-black text-[10px] tracking-wide text-neutral-500">PRODUÇÃO • COZINHA</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Collapsible raw data drawer */}
              <div className="mt-4 pt-2.5 border-t border-neutral-850">
                <button
                  id="btn-toggle-payload"
                  onClick={() => setShowRawPayload(!showRawPayload)}
                  className="text-neutral-500 hover:text-neutral-300 text-xs flex items-center gap-1.5 py-1"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  {showRawPayload ? 'Ocultar JSON da API' : 'Inspecionar Payload API Original'}
                </button>
                
                {showRawPayload && (
                  <pre className="mt-2 p-3 bg-neutral-950 border border-neutral-850 text-neutral-400 rounded-lg text-[10px] font-mono overflow-auto max-h-40 leading-normal select-all">
                    {JSON.stringify(selectedOrder.rawPayload, null, 2)}
                  </pre>
                )}
              </div>

              {/* Action Buttons: Printing Simulation */}
              <div id="print-action-cluster" className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-neutral-850">
                
                <button
                  id="btn-print-normal"
                  onClick={() => handlePrint(selectedOrder.id, 'normal')}
                  disabled={printSimulationRunning || selectedOrder.deliveryType === 'local'}
                  className="py-2.5 bg-neutral-800 hover:bg-neutral-750 disabled:bg-neutral-905 disabled:text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-neutral-700/60 transition"
                  title={selectedOrder.deliveryType === 'local' ? "Disponível apenas via cozinha para pedidos locais" : "Imprimir via principal completa"}
                >
                  <Printer className="w-4 h-4 text-neutral-300" />
                  Imprimir Completa
                </button>

                <button
                  id="btn-print-kitchen"
                  onClick={() => handlePrint(selectedOrder.id, 'kitchen')}
                  disabled={printSimulationRunning}
                  className="py-2.5 bg-neutral-800 hover:bg-neutral-750 disabled:bg-neutral-900 disabled:text-neutral-500 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-neutral-700/60 transition"
                >
                  <Printer className="w-4 h-4 text-neutral-300" />
                  Imprimir Cozinha
                </button>

                <button
                  id="btn-print-both"
                  onClick={() => handlePrint(selectedOrder.id, 'both')}
                  disabled={printSimulationRunning || selectedOrder.deliveryType === 'local'}
                  className="py-2.5 bg-yellow-400 hover:bg-yellow-500 text-neutral-950 disabled:bg-neutral-850 disabled:text-neutral-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow-md shadow-yellow-450/10"
                  title={selectedOrder.deliveryType === 'local' ? "Disponível apenas via cozinha para pedidos locais" : "Imprimir ambas as vias"}
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Comandas
                </button>

              </div>

              {/* Bottom Quick actions */}
              <div className="flex justify-between items-center gap-2.5 mt-3 pt-3 border-t border-neutral-850/65">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-edit-comanda-quick"
                    onClick={() => handleOpenEditLocalOrderModal(selectedOrder)}
                    className="px-3.5 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Editar informações do pedido"
                  >
                    <Edit className="w-3.5 h-3.5 text-neutral-400" />
                    Editar Pedido
                  </button>

                  <button
                    id="btn-print-physically"
                    onClick={printDirectly}
                    className="px-3.5 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-yellow-400 hover:text-yellow-300 border border-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    title="Imprimir com a impressora física (Diálogo do sistema)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Teste Imp. Física
                  </button>
                </div>
                <button
                  id="btn-delete-comanda-quick"
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  className="p-1.5 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 rounded-lg transition"
                  title="Excluir Comanda permanentemente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </section>

        {/* COLUMN 3: ORDER HISTORY LISTING GROUPED BY DAY AND HOUR (Right column, 3 cols wide on screen) */}
        <section id="history-scroller-column" className="col-span-1 xl:col-span-3 flex flex-col bg-neutral-900 border border-neutral-800/80 rounded-xl overflow-hidden shadow-lg xl:h-[780px]">
          
          <div className="p-3 bg-neutral-900/50 border-b border-neutral-800 space-y-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-350 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-neutral-400" />
              Histórico de Comandas
            </h2>
            <p className="text-[10px] text-neutral-500">Agrupado por dia e Horário de recepção.</p>
          </div>

          <div id="history-days-scroller" className="flex-1 overflow-y-auto p-2 bg-neutral-950/30 divide-y divide-neutral-850/40 h-80 xl:h-auto">
            {groupedOrdersByDate.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-600">
                Sem histórico de comandas.
              </div>
            ) : (
              groupedOrdersByDate.map(([dayKey, dayOrders]) => (
                <div key={dayKey} className="pb-3 pt-2">
                  {/* Day header sticky block */}
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-yellow-400/90 mb-2 pl-1 bg-neutral-900/30 py-1 rounded">
                    {dayKey}
                  </h3>

                  {/* Hourly based items listed here */}
                  <div className="space-y-1.5">
                    {dayOrders.map((histOrder) => {
                      const isActiveSelection = histOrder.id === selectedOrderId;
                      const isCanceled = histOrder.status === 'canceled';
                      const isPrinted = histOrder.status === 'printed';

                      const channelLabel: Record<OrderPlatform, string> = {
                        ifood: 'iF',
                        anotai: 'An',
                        deliverymuch: 'DM',
                        local: 'LC'
                      };

                      const colorLabel: Record<OrderPlatform, string> = {
                        ifood: 'text-red-400 bg-red-950/20',
                        anotai: 'text-violet-400 bg-violet-950/20',
                        deliverymuch: 'text-emerald-400 bg-emerald-950/20',
                        local: 'text-yellow-400 bg-yellow-950/20'
                      };

                      return (
                        <div
                          key={histOrder.id}
                          onClick={() => setSelectedOrderId(histOrder.id)}
                          className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between gap-1.5 ${
                            isActiveSelection 
                              ? 'bg-neutral-800 ring-1 ring-yellow-400/40' 
                              : 'bg-neutral-955 hover:bg-neutral-850'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {/* Small platform symbol badge */}
                            <span className={`text-[9px] font-black w-5 h-5 flex items-center justify-center rounded shrink-0 leading-none ${colorLabel[histOrder.platform]}`}>
                              {channelLabel[histOrder.platform]}
                            </span>

                            <div className="min-w-0">
                              <span className="font-mono text-xs font-bold text-neutral-350 block leading-tight">
                                {histOrder.displayId}
                              </span>
                              <span className="text-[10px] text-neutral-500 block truncate">
                                {histOrder.orderTime} • {histOrder.customerName.split(' ')[0]}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-[11px] font-semibold text-neutral-300 block">
                              R$ {histOrder.total.toFixed(2)}
                            </span>
                            
                            {/* Color labels for print checks */}
                            {isCanceled ? (
                              <span className="text-[9px] text-red-500 font-bold">Cancelado</span>
                            ) : isPrinted ? (
                              <span className="text-[9px] text-green-500 font-bold bg-green-950/20 px-1 rounded">✓ Impresso</span>
                            ) : (
                              <span className="text-[9px] text-yellow-500 font-bold bg-yellow-950/20 px-1 rounded animate-pulse">Pendente</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Quick history statistics brief */}
          <div className="p-3 bg-neutral-900 text-xs border-t border-neutral-800 space-y-2">
            <span className="text-neutral-400 font-bold block uppercase tracking-wider text-[9px]">Histórico Resumo</span>
            <div className="flex justify-between items-center text-neutral-400 text-[11px]">
              <span>Geral Hoje:</span>
              <span className="font-bold text-neutral-200">{orders.filter(o => o.status !== 'canceled').length} comandas</span>
            </div>
            <div className="flex justify-between items-center text-neutral-400 text-[11px]">
              <span>Faturamento:</span>
              <span className="font-bold text-yellow-400 font-mono">
                R$ {orders.filter(o => o.status !== 'canceled').reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </section>

      </main>

      {/* Elegant minimalist footer */}
      <footer className="py-4 px-6 text-center text-xs text-neutral-500 border-t border-neutral-900 bg-neutral-950 mt-12">
        <p>© 2026 Armazém Reche • Todos os direitos reservados. Plataforma de recepção e impressão integrada com iFood, Anota.ai e Delivery Much.</p>
      </footer>

      <LocalOrderModal
        isOpen={isLocalModalOpen}
        onClose={() => {
          setIsLocalModalOpen(false);
          setOrderToEdit(null);
        }}
        onSave={handleSaveLocalOrder}
        orderToEdit={orderToEdit}
      />

      <ComandaHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectOrderForReprint={handleSelectOrderFromHistory}
      />
    </div>
  );
}
