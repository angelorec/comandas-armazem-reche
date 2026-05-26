import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, DollarSign, Search, ChevronRight, ChevronDown, RefreshCw, Printer, AlertCircle } from 'lucide-react';
import { NormalizedOrder, OrderPlatform } from '../types';

interface ComandaHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderForReprint: (order: NormalizedOrder) => void;
}

interface SupabaseComanda {
  id: string;
  display_id: string;
  platform: OrderPlatform;
  created_at: string;
  delivery_type: 'delivery' | 'retirada' | 'local';
  customer_name: string;
  customer_phone?: string;
  customer_address?: any;
  items: any[];
  total: number;
  payment_method: string;
  status: 'pending' | 'printed' | 'canceled';
}

export default function ComandaHistoryModal({ isOpen, onClose, onSelectOrderForReprint }: ComandaHistoryModalProps) {
  const [comandas, setComandas] = useState<SupabaseComanda[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  
  // Track expanded dates
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Fetch from backend API
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supabase/comandas');
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Retornou uma resposta não-JSON (por exemplo, HTML ou texto puro).');
        }
        
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          setComandas(json.data);
          setIsFallbackMode(!!json.fallback);
          
          // Auto expand the first date
          if (json.data.length > 0) {
            const firstDate = new Date(json.data[0].created_at).toLocaleDateString('pt-BR');
            setExpandedDates({ [firstDate]: true });
          }
        }
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      console.warn('Error fetching comanda history, using local state or waiting (expected during server boot):', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  // Filter based on search query
  const filteredComandas = useMemo(() => {
    if (!searchQuery.trim()) return comandas;
    const query = searchQuery.toLowerCase();
    return comandas.filter(c => 
      c.customer_name?.toLowerCase().includes(query) || 
      c.display_id?.toLowerCase().includes(query) ||
      c.payment_method?.toLowerCase().includes(query)
    );
  }, [comandas, searchQuery]);

  // Group by Date + calculate daily totals
  const groupedData = useMemo(() => {
    const groups: Record<string, {
      date: string;
      comandas: SupabaseComanda[];
      totalCollected: number;
      ordersCount: number;
    }> = {};

    filteredComandas.forEach(c => {
      const dateStr = new Date(c.created_at).toLocaleDateString('pt-BR');
      if (!groups[dateStr]) {
        groups[dateStr] = {
          date: dateStr,
          comandas: [],
          totalCollected: 0,
          ordersCount: 0
        };
      }
      
      groups[dateStr].comandas.push(c);
      
      // Sum revenue if status !== canceled
      if (c.status !== 'canceled') {
        groups[dateStr].totalCollected += Number(c.total || 0);
        groups[dateStr].ordersCount += 1;
      }
    });

    // Convert to sorted array (newest date first)
    return Object.values(groups).sort((a, b) => {
      const partsA = a.date.split('/');
      const partsB = b.date.split('/');
      const dateA = new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0]));
      const dateB = new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0]));
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredComandas]);

  // Calculate life totals
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let successCount = 0;
    comandas.forEach(c => {
      if (c.status !== 'canceled') {
        totalRevenue += Number(c.total || 0);
        successCount += 1;
      }
    });
    return { totalRevenue, successCount };
  }, [comandas]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const mapToNormalizedOrder = (c: SupabaseComanda): NormalizedOrder => {
    return {
      id: c.id,
      displayId: c.display_id,
      platform: c.platform,
      createdAt: c.created_at,
      orderTime: new Date(c.created_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
      deliveryType: c.delivery_type,
      customerName: c.customer_name,
      customerPhone: c.customer_phone || '',
      customerAddress: c.customer_address || undefined,
      items: c.items || [],
      paymentMethod: c.payment_method || 'PIX',
      paymentType: 'OFFLINE',
      subtotal: c.total,
      deliveryFee: 0,
      total: c.total,
      printed: c.status === 'printed',
      printedKitchen: c.status === 'printed',
      status: c.status,
      rawPayload: c
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-yellow-400" />
            <div>
              <h3 className="text-sm font-black text-neutral-100 uppercase tracking-widest">
                Histórico Geral de Comandas
              </h3>
              <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                Monitoramento por Banco de Dados Supabase (armazem-do-reche)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition disabled:opacity-50"
              title="Recarregar do Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Summary Stats Widgets */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-neutral-950/50 border-b border-neutral-850">
          <div className="bg-neutral-900/85 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Faturamento Histórico</span>
            <span className="text-base font-extrabold text-green-400 font-mono mt-1">R$ {stats.totalRevenue.toFixed(2)}</span>
          </div>
          <div className="bg-neutral-900/85 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Comandas Ativas</span>
            <span className="text-base font-extrabold text-yellow-400 font-mono mt-1">{stats.successCount} concluídas</span>
          </div>
          <div className="col-span-2 md:col-span-1 bg-neutral-900/85 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Conexão do Banco</span>
              <span className={`text-[10px] font-mono font-bold mt-1 inline-flex items-center gap-1.5 ${isFallbackMode ? 'text-yellow-500' : 'text-green-400'}`}>
                ● {isFallbackMode ? 'Redundância Local' : 'Supabase Conectado'}
              </span>
            </div>
            {isFallbackMode && (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
          </div>
        </div>

        {/* Search controls */}
        <div className="p-4 border-b border-neutral-850 bg-neutral-900/30">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por cliente, mesa, código (#348) ou método de pagamento..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400/40 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-200 outline-none transition"
            />
          </div>
        </div>

        {/* List of dates */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
          {loading && comandas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-neutral-500">
              <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin mb-2" />
              <p className="text-xs">Sincronizando registros do histórico comercial...</p>
            </div>
          ) : groupedData.length === 0 ? (
            <div className="text-center p-12 text-neutral-500 text-xs">
              Nenhuma comanda encontrada no banco de dados para os termos informados.
            </div>
          ) : (
            groupedData.map((group) => {
              const isExpanded = !!expandedDates[group.date];
              return (
                <div key={group.date} className="border border-neutral-800 rounded-xl bg-neutral-950/20 overflow-hidden">
                  
                  {/* Date strip bar header */}
                  <div 
                    onClick={() => toggleDate(group.date)}
                    className="flex items-center justify-between p-3 px-4 bg-neutral-950/70 border-b border-neutral-800/60 cursor-pointer hover:bg-neutral-950/100 transition select-none"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-yellow-500" /> : <ChevronRight className="w-4 h-4 text-neutral-550" />}
                      <span className="text-xs font-black text-neutral-250 font-mono uppercase tracking-wider">{group.date}</span>
                      <span className="text-[10px] text-neutral-550 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800">
                        {group.ordersCount} comanda(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-right">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">SUBTOTAL ARRECADADO:</span>
                      <span className="text-xs font-extrabold text-yellow-400 font-mono">
                        R$ {group.totalCollected.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* List of comandas under expanded date */}
                  {isExpanded && (
                    <div className="divide-y divide-neutral-850 bg-neutral-900/10">
                      {group.comandas.map((c) => {
                        const itemsList = c.items || [];
                        const isCanceled = c.status === 'canceled';
                        
                        return (
                          <div key={c.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-neutral-900/40 transition">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                                  isCanceled 
                                    ? 'bg-red-950/40 text-red-400 border border-red-950'
                                    : 'bg-yellow-400 text-neutral-950 font-black'
                                }`}>
                                  {c.display_id}
                                </span>
                                
                                <span className={`text-[9.5px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded ${
                                  c.platform === 'local' ? 'bg-yellow-950/30 text-yellow-400 border border-yellow-900/30' :
                                  c.platform === 'ifood' ? 'bg-red-950/40 text-red-500 border border-red-950' : 
                                  'bg-neutral-900 text-neutral-300'
                                }`}>
                                  {c.platform}
                                </span>

                                <span className="text-[10px] font-bold text-neutral-350">
                                  {c.customer_name}
                                </span>

                                <span className="text-[9.5px] text-neutral-500 font-mono">
                                  ({c.delivery_type})
                                </span>
                              </div>

                              <div className="text-[11px] text-neutral-400 space-y-0.5 pl-1">
                                {itemsList.map((item: any, idx: number) => {
                                  const addText = item.additionals && item.additionals.length > 0 
                                    ? `(+ ${item.additionals.map((a: any) => a.name).join(', ')})`
                                    : '';
                                  return (
                                    <div key={idx} className="font-sans">
                                      • <span className="font-semibold text-neutral-300">{item.quantity}x</span> {item.name} <span className="text-[9px] text-yellow-500/80 font-mono font-normal">{addText}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center justify-between sm:justify-end gap-3.5 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-dashed border-neutral-800/80 sm:border-0">
                              <div className="text-right">
                                <p className="text-[9px] font-bold text-neutral-550 uppercase tracking-widest leading-none">VALOR TOTAL</p>
                                <p className={`text-xs font-black font-mono mt-1 ${isCanceled ? 'line-through text-neutral-550' : 'text-neutral-200'}`}>
                                  R$ {Number(c.total || 0).toFixed(2)}
                                </p>
                              </div>

                              <button
                                onClick={() => {
                                  onSelectOrderForReprint(mapToNormalizedOrder(c));
                                }}
                                className="px-2.5 py-1.5 bg-neutral-800 hover:bg-yellow-400 text-neutral-400 hover:text-neutral-950 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1"
                                title="Visualizar para Reimpressão"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Reimprimir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/40 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 font-extrabold text-xs text-neutral-950 rounded-xl transition cursor-pointer"
          >
            Fechar Histórico
          </button>
        </div>

      </div>
    </div>
  );
}
