import React from 'react';
import { NormalizedOrder } from '../types';
import { TrendingUp, FileText, ShoppingCart, RefreshCw, Layers } from 'lucide-react';

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

  const totalCount = orders.length || 1;
  const ifoodPct = Math.round((ifoodCount / totalCount) * 100);
  const anotaiPct = Math.round((anotaiCount / totalCount) * 100);
  const dmPct = Math.round((dmCount / totalCount) * 100);

  return (
    <div id="stats-dashboard-grid" className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Revenue Card */}
      <div id="stat-card-revenue" className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl group-hover:bg-yellow-400/10 transition-colors duration-500"></div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 font-sans text-xs font-medium uppercase tracking-wider">Faturamento Hoje</span>
          <div className="p-2 rounded-lg bg-yellow-400/10 text-yellow-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-1">
          <span className="text-2xl font-mono font-bold text-neutral-50">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-xs text-neutral-500 mt-1">Exclui pedidos cancelados</p>
        </div>
      </div>

      {/* Active Queue Card */}
      <div id="stat-card-active" className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-400/5 rounded-full blur-2xl"></div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 font-sans text-xs font-medium uppercase tracking-wider">Fila Pendente</span>
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
          </span>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-yellow-400">
              {activeOrders.length}
            </span>
            <span className="text-xs font-sans text-neutral-400">comandas ativas</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {printedOrders.length} impressas • {canceledOrders.length} canceladas
          </p>
        </div>
      </div>

      {/* Total Receipt Count */}
      <div id="stat-card-total" className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 font-sans text-xs font-medium uppercase tracking-wider">Total de Comandas</span>
          <button 
            id="btn-manual-sync"
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-yellow-400 hover:bg-neutral-700 transition"
            title="Sincronizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-yellow-400' : ''}`} />
          </button>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-mono font-black text-neutral-50">
              {orders.length}
            </span>
            <span className="text-xs font-sans text-neutral-400">pedidos recebidos</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">Conexão API ativa</p>
        </div>
      </div>

      {/* Platform Breakdown Progress Bars */}
      <div id="stat-card-breakdown" className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col justify-center">
        <span className="text-neutral-400 font-sans text-xs font-medium uppercase tracking-wider mb-2.5 block">
          Divisão por Canal
        </span>
        <div className="space-y-2">
          {/* iFood */}
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              iFood
            </span>
            <span className="font-mono text-neutral-400 font-semibold">{ifoodCount} ({ifoodPct}%)</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full rounded-full" style={{ width: `${orders.length ? ifoodPct : 0}%` }}></div>
          </div>

          {/* Anota.ai */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              Anota.ai
            </span>
            <span className="font-mono text-neutral-400 font-semibold">{anotaiCount} ({anotaiPct}%)</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-violet-500 h-full rounded-full" style={{ width: `${orders.length ? anotaiPct : 0}%` }}></div>
          </div>

          {/* Delivery Much */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Delivery Much
            </span>
            <span className="font-mono text-neutral-400 font-semibold">{dmCount} ({dmPct}%)</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${orders.length ? dmPct : 0}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
