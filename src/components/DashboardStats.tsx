import React from 'react';
import { NormalizedOrder } from '../types';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface StatsProps {
  orders: NormalizedOrder[];
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function DashboardStats({ orders, onRefresh, isRefreshing }: StatsProps) {
  const activeOrders = orders.filter(o => o.status === 'pending');
  const printedOrders = orders.filter(o => o.status === 'printed');
  const canceledOrders = orders.filter(o => o.status === 'canceled');
  
  const totalRevenue = orders
    .filter(o => o.status !== 'canceled')
    .reduce((sum, o) => sum + o.total, 0);

  const ifoodCount = orders.filter(o => o.platform === 'ifood').length;
  const anotaiCount = orders.filter(o => o.platform === 'anotai').length;
  const dmCount = orders.filter(o => o.platform === 'deliverymuch').length;
  const localCount = orders.filter(o => o.platform === 'local').length;

  const totalCount = orders.length || 1;
  const ifoodPct = Math.round((ifoodCount / totalCount) * 100);
  const anotaiPct = Math.round((anotaiCount / totalCount) * 100);
  const dmPct = Math.round((dmCount / totalCount) * 100);
  const localPct = Math.round((localCount / totalCount) * 100);

  return (
    <div id="stats-dashboard-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Revenue Card */}
      <div id="stat-card-revenue" className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-neutral-950/25 relative overflow-hidden transition-all duration-300 hover:border-neutral-700/60 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-450/5 rounded-full blur-2xl group-hover:bg-yellow-450/10 transition-colors duration-500"></div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 font-sans text-xs font-semibold uppercase tracking-wider">Faturamento Hoje</span>
          <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/10">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-2xl font-mono font-bold text-neutral-50 tracking-tight">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-neutral-500 mt-1">Exclui pedidos cancelados</p>
        </div>
      </div>

      {/* Active Queue Card */}
      <div id="stat-card-active" className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-neutral-950/25 relative overflow-hidden transition-all duration-300 hover:border-neutral-700/60 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-450/5 rounded-full blur-2xl"></div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 font-sans text-xs font-semibold uppercase tracking-wider">Fila Pendente</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
          </span>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-yellow-400">
              {activeOrders.length}
            </span>
            <span className="text-xs font-sans text-neutral-400">ativas</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">
            {printedOrders.length} impressas • {canceledOrders.length} canceladas
          </p>
        </div>
      </div>

      {/* Total Receipt Count */}
      <div id="stat-card-total" className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-lg shadow-neutral-950/25 transition-all duration-300 hover:border-neutral-700/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 font-sans text-xs font-semibold uppercase tracking-wider">Total de Comandas</span>
          <button 
            id="btn-manual-sync"
            onClick={onRefresh}
            className="p-1.5 rounded-xl bg-neutral-950/80 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 transition"
            title="Sincronizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-yellow-400' : ''}`} />
          </button>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-bold text-neutral-50">
              {orders.length}
            </span>
            <span className="text-xs font-sans text-neutral-400">pedidos recebidos</span>
          </div>
          <p className="text-[11px] text-neutral-500 mt-1">Conexão webhook ativa</p>
        </div>
      </div>

      {/* Platform Breakdown Progress Bars */}
      <div id="stat-card-breakdown" className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 flex flex-col justify-center shadow-lg shadow-neutral-950/25 transition-all duration-300 hover:border-neutral-700/60">
        <span className="text-neutral-400 font-sans text-xs font-semibold uppercase tracking-wider mb-3 block">
          Divisão por Canal
        </span>
        <div className="space-y-2.5">
          {/* iFood */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
                iFood
              </span>
              <span className="font-mono text-neutral-400 font-medium">{ifoodCount} ({ifoodPct}%)</span>
            </div>
            <div className="w-full bg-neutral-950/60 h-1.5 rounded-full overflow-hidden border border-neutral-850/60">
              <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${orders.length ? ifoodPct : 0}%` }}></div>
            </div>
          </div>

          {/* Anota.ai */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/50"></span>
                Anota.ai
              </span>
              <span className="font-mono text-neutral-400 font-medium">{anotaiCount} ({anotaiPct}%)</span>
            </div>
            <div className="w-full bg-neutral-950/60 h-1.5 rounded-full overflow-hidden border border-neutral-850/60">
              <div className="bg-violet-500 h-full rounded-full transition-all duration-500" style={{ width: `${orders.length ? anotaiPct : 0}%` }}></div>
            </div>
          </div>

          {/* Delivery Much */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
                Delivery Much
              </span>
              <span className="font-mono text-neutral-400 font-medium">{dmCount} ({dmPct}%)</span>
            </div>
            <div className="w-full bg-neutral-950/60 h-1.5 rounded-full overflow-hidden border border-neutral-850/60">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${orders.length ? dmPct : 0}%` }}></div>
            </div>
          </div>

          {/* Pedido Em Loco */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50"></span>
                Pedido Em Loco
              </span>
              <span className="font-mono text-neutral-400 font-medium">{localCount} ({localPct}%)</span>
            </div>
            <div className="w-full bg-neutral-950/60 h-1.5 rounded-full overflow-hidden border border-neutral-850/60">
              <div className="bg-yellow-400 h-full rounded-full transition-all duration-500" style={{ width: `${orders.length ? localPct : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
