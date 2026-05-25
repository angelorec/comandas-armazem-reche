import React from 'react';
import { ChefHat, ShoppingBag } from 'lucide-react';

export default function CommandLogo() {
  return (
    <div id="app-logo-container" className="flex items-center gap-3">
      <div id="app-logo-badge" className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-yellow-400 text-neutral-950 shadow-lg shadow-yellow-400/20">
        <ChefHat id="logo-icon-chef" className="w-6 h-6 stroke-[2.5]" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-950 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-neutral-900"></span>
        </span>
      </div>
      <div id="app-brand-text" className="flex flex-col">
        <span className="font-sans font-black tracking-wider text-xl text-yellow-400 uppercase leading-none">
          Armazém Reche
        </span>
        <span className="font-sans text-xs font-semibold tracking-widest text-neutral-400 uppercase mt-0.5">
          Painel de Comandas
        </span>
      </div>
    </div>
  );
}
