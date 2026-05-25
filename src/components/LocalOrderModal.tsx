import React, { useState, useEffect } from 'react';
import { NormalizedOrder, NormalizedOrderItem } from '../types';
import { X, Plus, Trash2, ShoppingBag, Edit3, User, Coffee } from 'lucide-react';

interface LocalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Partial<NormalizedOrder>) => Promise<void>;
  orderToEdit: NormalizedOrder | null;
}

export default function LocalOrderModal({ isOpen, onClose, onSave, orderToEdit }: LocalOrderModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'retirada' | 'local'>('local');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  
  // Items in active creation form
  const [items, setItems] = useState<NormalizedOrderItem[]>([]);
  
  // Field for currently entering item
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemObs, setItemObs] = useState('');

  // Editing existing item index
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // Initialize form when modal opens or order changes
  useEffect(() => {
    if (isOpen) {
      if (orderToEdit) {
        setCustomerName(orderToEdit.customerName);
        setDeliveryType(orderToEdit.deliveryType);
        setPaymentMethod(orderToEdit.paymentMethod || 'Dinheiro');
        setItems([...orderToEdit.items]);
      } else {
        // Clear form for creation
        setCustomerName('');
        setDeliveryType('local');
        setPaymentMethod('Dinheiro');
        setItems([]);
      }
      // Reset input fields
      setItemName('');
      setItemQty(1);
      setItemObs('');
      setEditingItemIdx(null);
    }
  }, [isOpen, orderToEdit]);

  if (!isOpen) return null;

  const handleAddOrUpdateItem = () => {
    if (!itemName.trim()) return;

    const newItem: NormalizedOrderItem = {
      name: itemName.trim(),
      quantity: itemQty,
      price: 0, // kitchen simplified uses price-less structure for floor orders
      observations: itemObs.trim()
    };

    if (editingItemIdx !== null) {
      // Update item
      const updated = [...items];
      updated[editingItemIdx] = newItem;
      setItems(updated);
      setEditingItemIdx(null);
    } else {
      // Add new
      setItems([...items, newItem]);
    }

    // Reset fields
    setItemName('');
    setItemQty(1);
    setItemObs('');
  };

  const handleEditItem = (idx: number) => {
    const item = items[idx];
    setItemName(item.name);
    setItemQty(item.quantity);
    setItemObs(item.observations || '');
    setEditingItemIdx(idx);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
    if (editingItemIdx === idx) {
      setEditingItemIdx(null);
      setItemName('');
      setItemQty(1);
      setItemObs('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (items.length === 0) {
      alert('Adicione pelo menos um item ao pedido.');
      return;
    }

    // Calculate simulated subtotal/total
    const simulatedTotal = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

    const data: Partial<NormalizedOrder> = {
      customerName: customerName.trim(),
      deliveryType,
      items,
      paymentMethod,
      total: simulatedTotal
    };

    await onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-yellow-400" />
            <h3 className="text-base font-bold text-neutral-100 uppercase tracking-wider">
              {orderToEdit ? 'Editar Comanda/Pedido' : 'Novo Pedido em Loco / Manual'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Main Info Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Customer name */}
            <div className="space-y-1.5 col-span-1 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-yellow-500" /> Nome do Cliente *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Exemplo: Mesa 04 (Carlos)"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400/40 rounded-xl px-3 py-2.5 text-xs text-neutral-200 outline-none transition focus:ring-1 focus:ring-yellow-400/20"
                required
              />
            </div>

            {/* Delivery type selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Tipo do Pedido
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['local', 'retirada', 'delivery'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDeliveryType(type)}
                    className={`py-2 text-[10.5px] font-bold rounded-xl transition border cursor-pointer ${
                      deliveryType === type
                        ? 'bg-yellow-400 text-neutral-950 border-yellow-500 font-extrabold shadow-sm'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-850 hover:bg-neutral-900'
                    }`}
                  >
                    {type === 'local' ? 'Em Loco' : type === 'retirada' ? 'No Balcão' : 'Delivery'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                {deliveryType === 'local' 
                  ? '💡 Comandas em Loco imprimem apenas a via de cozinha (Kitchen).'
                  : 'Gera comanda de expedição completa com totais.'}
              </p>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Método de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400/40 rounded-xl px-3 py-2.5 text-xs text-neutral-200 outline-none transition focus:ring-1 focus:ring-yellow-400/20 select-none appearance-none"
              >
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="Cartão de Crédito">Cartão de Crédito</option>
                <option value="Cartão de Débito">Cartão de Débito</option>
                <option value="A Definir">A Definir / Pago</option>
              </select>
            </div>

          </div>

          {/* ITEM APPENDER FIELDSET */}
          <div className="border-t border-neutral-800 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              {editingItemIdx !== null ? '🖊️ Editando Item do Pedido' : '⚡ Adicionar Produto / Pizza / Hambúrguer'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-neutral-950/45 p-4 rounded-xl border border-neutral-850/40">
              
              {/* Product Name */}
              <div className="space-y-1 col-span-1 md:col-span-6">
                <label className="text-[10px] font-bold text-neutral-450 uppercase">Nome / Descrição</label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Ex: Coca Cola 350ml / Hambúrguer Artesanal..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 rounded-lg p-2 text-xs text-neutral-200 outline-none"
                />
              </div>

              {/* Quantity picker */}
              <div className="space-y-1 col-span-1 md:col-span-3">
                <label className="text-[10px] font-bold text-neutral-450 uppercase">Quantidade</label>
                <div className="flex items-center bg-neutral-900 rounded-lg border border-neutral-800 p-1">
                  <button
                    type="button"
                    onClick={() => setItemQty(q => Math.max(1, q - 1))}
                    className="p-1 px-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded font-bold text-sm"
                  >
                    -
                  </button>
                  <span className="flex-1 text-center text-xs font-mono font-bold text-neutral-200">{itemQty}</span>
                  <button
                    type="button"
                    onClick={() => setItemQty(q => q + 1)}
                    className="p-1 px-2.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded font-bold text-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Easy add button */}
              <div className="col-span-1 md:col-span-3 flex items-end">
                <button
                  type="button"
                  onClick={handleAddOrUpdateItem}
                  disabled={!itemName.trim()}
                  className="w-full h-9 bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 hover:text-neutral-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {editingItemIdx !== null ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>

              {/* Observations */}
              <div className="space-y-1 col-span-1 md:col-span-12">
                <label className="text-[10px] font-bold text-neutral-450 uppercase">Observações da Cozinha</label>
                <input
                  type="text"
                  value={itemObs}
                  onChange={(e) => setItemObs(e.target.value)}
                  placeholder="Ex: Sem cebola, bem passado, maionese extra na mesa..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 rounded-lg p-2 text-xs text-neutral-200 outline-none"
                />
              </div>

            </div>
          </div>

          {/* ADDED PRODUCTS LIST TABLE */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Produtos do Pedido ({items.length})
            </label>

            {items.length === 0 ? (
              <div className="bg-neutral-950/20 border border-dashed border-neutral-800/80 rounded-xl p-8 text-center text-neutral-500 text-xs">
                <ShoppingBag className="w-7 h-7 text-neutral-800 mx-auto mb-1.5" />
                Nenhum produto adicionado ainda. Lançe acima para compor a comanda.
              </div>
            ) : (
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/30">
                <div className="divide-y divide-neutral-850">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 bg-neutral-900/40 hover:bg-neutral-900/80 transition">
                      
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs font-bold text-yellow-400">{item.quantity}x</span>
                          <span className="text-xs font-bold text-neutral-200 truncate">{item.name}</span>
                        </div>
                        {item.observations && (
                          <p className="text-[10px] text-neutral-400 bg-neutral-950/30 px-1.5 py-0.5 rounded italic mt-0.5 max-w-md truncate">
                            Obs: {item.observations}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditItem(idx)}
                          className="p-1 px-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 px-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded transition"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </form>

        {/* Footer actions */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-950/40 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={items.length === 0 || !customerName.trim()}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-extrabold text-xs rounded-xl transition cursor-pointer shadow-md shadow-yellow-450/10 active:scale-95"
          >
            {orderToEdit ? 'Salvar Alterações' : 'Concluir & Lançar'}
          </button>
        </div>

      </div>
    </div>
  );
}
