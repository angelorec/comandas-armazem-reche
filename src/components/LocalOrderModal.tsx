import React, { useState, useEffect } from 'react';
import { NormalizedOrder, NormalizedOrderItem, NormalizedOrderItemAdditional } from '../types';
import { X, Plus, Trash2, ShoppingBag, Edit3, User, Coffee, MapPin, Phone } from 'lucide-react';

// Helper function to remove accents/diacritics and convert to lower case
function removeAccents(str: string): string {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Helper function to clean additional item names
function formatAdditionalName(name: string): string {
  if (!name) return '';
  return name
    .replace(/^Adicional:\s*/i, '')
    .replace(/^Adicional\s+/i, '')
    .replace('Pastel: ', '')
    .replace(' (Marmitex/Lá Minuta)', '')
    .trim();
}

interface LocalOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Partial<NormalizedOrder>) => Promise<void>;
  orderToEdit: NormalizedOrder | null;
}

export default function LocalOrderModal({ isOpen, onClose, onSave, orderToEdit }: LocalOrderModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'retirada' | 'local'>('local');

  // Customer suggestions
  const [savedCustomers, setSavedCustomers] = useState<{
    name: string;
    phone: string;
    address?: {
      street: string;
      number: string;
      neighborhood: string;
      complement: string;
      city: string;
    };
    lastDeliveryType?: 'delivery' | 'retirada' | 'local';
  }[]>([]);
  const [showCustomerNameSuggestions, setShowCustomerNameSuggestions] = useState(false);
  const [showCustomerPhoneSuggestions, setShowCustomerPhoneSuggestions] = useState(false);
  
  // Supabase items fetched cached
  const [dbProducts, setDbProducts] = useState<{ id: any; nome: string; preco: number }[]>([]);
  const [dbAdditionals, setDbAdditionals] = useState<{ id: any; nome: string; preco: number; categoria_id?: number }[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);

  // Address fields
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressCity, setAddressCity] = useState('Pelotas');

  // Items in active creation form
  const [items, setItems] = useState<NormalizedOrderItem[]>([]);
  
  // Fields for currently entering item
  const [selectedProductId, setSelectedProductId] = useState<string | number>('');
  const [itemName, setItemName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemObs, setItemObs] = useState('');
  const [selectedAdditionals, setSelectedAdditionals] = useState<Record<string | number, boolean>>({});
  const [selectedProteinId, setSelectedProteinId] = useState<string | number>('');

  // Editing existing item index
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<'suggerito' | 'pastel' | 'pratos' | 'cheese' | 'doces' | 'todos'>('suggerito');

  // Fetch Supabase products & additionals on open
  useEffect(() => {
    if (isOpen) {
      setLoadingDb(true);
      Promise.all([
        fetch('/api/supabase/products').then(res => {
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            return res.json();
          }
          throw new Error('Fallback para produtos locais.');
        }),
        fetch('/api/supabase/additionals').then(res => {
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            return res.json();
          }
          throw new Error('Fallback para adicionais locais.');
        })
      ])
        .then(([prods, adds]) => {
          setDbProducts(prods || []);
          setDbAdditionals(adds || []);
        })
        .catch(err => {
          console.warn('Usando base local devido a falha de rede/API do Supabase (esperado durante inicialização):', err);
          // Preencher com fallbacks locais basicos caso dê erro de parse (ex. html) ou erro de API
          setDbProducts([
            { id: 1001, nome: 'Marmitex', preco: 27.00 },
            { id: 1002, nome: 'Lá Minuta tradicional', preco: 43.00 },
            { id: 1012, nome: 'Batata Frita', preco: 25.00 },
            { id: 1018, nome: 'Pastel de Frango P', preco: 15.00 },
            { id: 1038, nome: 'Pastel de Carne P', preco: 11.00 },
            { id: 1123, nome: 'Coca-Cola Lata', preco: 6.00 }
          ]);
          setDbAdditionals([
            { id: 2001, nome: 'Bife de Coxão Mole (Marmitex/Lá Minuta)', preco: 0.00, categoria_id: 1 },
            { id: 2002, nome: 'Frango à Parmegiana (Marmitex/Lá Minuta)', preco: 0.00, categoria_id: 1 },
            { id: 2003, nome: 'Chuleta de Contrafilé (Marmitex/Lá Minuta)', preco: 3.05, categoria_id: 1 },
            { id: 2004, nome: 'Bife de Lentilha (Vegetariano) (Marmitex/Lá Minuta)', preco: 0.00, categoria_id: 1 },
            { id: 2009, nome: 'Adicional Bife de Coxão Mole Precoce', preco: 14.00, categoria_id: 2 },
            { id: 2011, nome: 'Adicional Chuleta de Contrafilé', preco: 16.00, categoria_id: 2 },
            { id: 2016, nome: 'Adicional Ovo Frito', preco: 5.00, categoria_id: 3 },
            { id: 2017, nome: 'Talheres Descartáveis', preco: 0.00, categoria_id: 3 },
            { id: 2025, nome: 'Pastel: Queijo', preco: 6.00, categoria_id: 3 },
            { id: 2030, nome: 'Pastel: Cheddar', preco: 7.00, categoria_id: 8 },
            { id: 2034, nome: 'Pastel: Bacon', preco: 7.00, categoria_id: 8 }
          ]);
        })
        .finally(() => {
          setLoadingDb(false);
        });
    }
  }, [isOpen]);

  // Initialize form when modal opens or order changes
  useEffect(() => {
    if (isOpen) {
      // Load saved customers
      const saved = localStorage.getItem('restaurant_saved_customers');
      if (saved) {
        try {
          setSavedCustomers(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading saved customers:', e);
        }
      }

      if (orderToEdit) {
        setCustomerName(orderToEdit.customerName);
        setCustomerPhone(orderToEdit.customerPhone || '');
        setDeliveryType(orderToEdit.deliveryType);
        setItems([...orderToEdit.items]);
        
        // Handle address restoration
        if (orderToEdit.customerAddress) {
          setAddressStreet(orderToEdit.customerAddress.street || '');
          setAddressNumber(orderToEdit.customerAddress.number || '');
          setAddressNeighborhood(orderToEdit.customerAddress.neighborhood || '');
          setAddressComplement(orderToEdit.customerAddress.complement || '');
          setAddressCity(orderToEdit.customerAddress.city || 'Pelotas');
        } else {
          setAddressStreet('');
          setAddressNumber('');
          setAddressNeighborhood('');
          setAddressComplement('');
          setAddressCity('Pelotas');
        }
      } else {
        // Clear form for creation
        setCustomerName('');
        setCustomerPhone('');
        setDeliveryType('local');
        setItems([]);
        setAddressStreet('');
        setAddressNumber('');
        setAddressNeighborhood('');
        setAddressComplement('');
        setAddressCity('Pelotas');
      }
      // Reset input fields
      setItemName('');
      setItemQty(1);
      setItemObs('');
      setSelectedProductId('');
      setSelectedAdditionals({});
      setSelectedProteinId('');
      setEditingItemIdx(null);
      setShowSuggestions(false);
      setCustomPrice('');
    }
  }, [isOpen, orderToEdit]);

  // Auto-switch additionals category based on selected product name
  useEffect(() => {
    if (!itemName.trim()) {
      setActiveCategory('suggerito');
      return;
    }
    const lower = removeAccents(itemName).toLowerCase();
    if (lower.includes('marmita') || lower.includes('marmitex') || lower.includes('minuta')) {
      setActiveCategory('pratos');
    } else if (lower.includes('pastel')) {
      setActiveCategory('pastel');
    }
  }, [itemName]);

  if (!isOpen) return null;

  const lowerName = removeAccents(itemName).toLowerCase();
  const isMarmitaOrMinuta = lowerName.includes('marmita') || lowerName.includes('marmitex') || lowerName.includes('minuta');

  const handleAddOrUpdateItem = () => {
    if (!itemName.trim()) return;

    if (isMarmitaOrMinuta && !selectedProteinId) {
      alert('Por favor, selecione uma proteína para a marmita / lá minuta.');
      return;
    }

    // Resolve base price
    let basePrice = 0;
    if (selectedProductId && selectedProductId !== 'custom') {
      const matched = dbProducts.find(p => p.id.toString() === selectedProductId.toString());
      if (matched) basePrice = Number(matched.preco) || 0;
    } else {
      // Custom price parsed
      basePrice = parseFloat(customPrice) || 0;
    }

    // Resolve additionals selected
    const additionalList: NormalizedOrderItemAdditional[] = [];

    // First, push the protein additional if applicable
    if (isMarmitaOrMinuta && selectedProteinId) {
      const matchedAdd = dbAdditionals.find(a => a.id.toString() === selectedProteinId.toString());
      if (matchedAdd) {
        additionalList.push({
          name: matchedAdd.nome,
          quantity: 1,
          price: Number(matchedAdd.preco) || 0
        });
      }
    }

    // Push other additions selected in the extras grid
    Object.entries(selectedAdditionals).forEach(([id, checked]) => {
      if (checked) {
        const matchedAdd = dbAdditionals.find(a => a.id.toString() === id.toString());
        if (matchedAdd) {
          additionalList.push({
            name: matchedAdd.nome,
            quantity: 1,
            price: Number(matchedAdd.preco) || 0
          });
        }
      }
    });

    const newItem: NormalizedOrderItem = {
      name: itemName.trim(),
      quantity: itemQty,
      price: basePrice,
      observations: itemObs.trim(),
      additionals: additionalList.length > 0 ? additionalList : undefined
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
    setSelectedProductId('');
    setSelectedAdditionals({});
    setSelectedProteinId('');
    setShowSuggestions(false);
    setCustomPrice('');
  };

  const handleEditItem = (idx: number) => {
    const item = items[idx];
    setItemName(item.name);
    setItemQty(item.quantity);
    setItemObs(item.observations || '');
    
    // Auto detect product match from menu list
    const match = dbProducts.find(p => p.nome.toLowerCase() === item.name.toLowerCase());
    if (match) {
      setSelectedProductId(match.id);
      setCustomPrice('');
    } else {
      setSelectedProductId('custom');
      setCustomPrice(item.price ? item.price.toString() : '');
    }

    // Capture additionals mappings separating protein from extra additionals
    const addMap: Record<string | number, boolean> = {};
    let proteinId: string | number = '';
    if (item.additionals) {
      item.additionals.forEach(add => {
        const matchedAdd = dbAdditionals.find(a => a.nome.toLowerCase() === add.name.toLowerCase());
        if (matchedAdd) {
          const isProtein = matchedAdd.categoria_id === 1 || matchedAdd.nome.toLowerCase().includes('(marmitex/lá minuta)');
          if (isProtein) {
            proteinId = matchedAdd.id;
          } else {
            addMap[matchedAdd.id] = true;
          }
        }
      });
    }
    setSelectedProteinId(proteinId);
    setSelectedAdditionals(addMap);
    setEditingItemIdx(idx);
    setShowSuggestions(false);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
    if (editingItemIdx === idx) {
      setEditingItemIdx(null);
      setItemName('');
      setItemQty(1);
      setItemObs('');
      setSelectedProductId('');
      setSelectedAdditionals({});
      setSelectedProteinId('');
      setShowSuggestions(false);
      setCustomPrice('');
    }
  };

  const handleSelectCustomer = (cust: any) => {
    setCustomerName(cust.name);
    setCustomerPhone(cust.phone || '');
    if (cust.lastDeliveryType) {
      setDeliveryType(cust.lastDeliveryType);
    }
    if (cust.address) {
      setAddressStreet(cust.address.street || '');
      setAddressNumber(cust.address.number || '');
      setAddressNeighborhood(cust.address.neighborhood || '');
      setAddressComplement(cust.address.complement || '');
      setAddressCity(cust.address.city || 'Pelotas');
    }
    setShowCustomerNameSuggestions(false);
    setShowCustomerPhoneSuggestions(false);
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

    // Address verification if delivery is selected
    let customerAddressObj = undefined;
    if (deliveryType === 'delivery') {
      if (!addressStreet.trim() || !addressNumber.trim() || !addressNeighborhood.trim()) {
        alert('Por favor, informe o endereço de entrega completo (Rua, Número e Bairro).');
        return;
      }
      customerAddressObj = {
        street: addressStreet.trim(),
        number: addressNumber.trim(),
        neighborhood: addressNeighborhood.trim(),
        complement: addressComplement.trim(),
        city: addressCity.trim(),
        formatted: `${addressStreet.trim()}, ${addressNumber.trim()} - ${addressNeighborhood.trim()}, ${addressCity.trim()}`
      };
    }

    // Calculate sum of active order products and additionals
    const simulatedTotal = items.reduce((sum, item) => {
      const priceBase = item.price || 0;
      const priceAdds = item.additionals?.reduce((s, a) => s + (a.price || 0) * a.quantity, 0) || 0;
      return sum + (priceBase + priceAdds) * item.quantity;
    }, 0);

    const data: Partial<NormalizedOrder> = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryType,
      items,
      paymentMethod: orderToEdit?.paymentMethod || 'A Definir', // Retires payment picker but satisfies data model
      total: simulatedTotal,
      subtotal: simulatedTotal,
      customerAddress: customerAddressObj
    };

    // Save or update customer in localStorage list
    if (deliveryType === 'delivery' || deliveryType === 'retirada') {
      const phoneClean = customerPhone.trim();
      const nameClean = customerName.trim();
      if (nameClean) {
        let updatedList = [...savedCustomers];
        // Find if already exists by phone (if provided) or name
        const existingIdx = updatedList.findIndex(c => {
          if (phoneClean && c.phone && c.phone === phoneClean) return true;
          return c.name.toLowerCase() === nameClean.toLowerCase();
        });

        const newCust = {
          name: nameClean,
          phone: phoneClean,
          lastDeliveryType: deliveryType,
          ...(deliveryType === 'delivery' ? {
            address: {
              street: addressStreet.trim(),
              number: addressNumber.trim(),
              neighborhood: addressNeighborhood.trim(),
              complement: addressComplement.trim(),
              city: addressCity.trim()
            }
          } : (existingIdx >= 0 && updatedList[existingIdx].address ? { address: updatedList[existingIdx].address } : undefined))
        };

        if (existingIdx >= 0) {
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            ...newCust
          };
        } else {
          updatedList.push(newCust);
        }

        localStorage.setItem('restaurant_saved_customers', JSON.stringify(updatedList));
        setSavedCustomers(updatedList);
      }
    }

    await onSave(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-neutral-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl h-[95vh] sm:h-auto max-h-[96vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-neutral-800 bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-yellow-400" />
            <h3 className="text-sm sm:text-base font-bold text-neutral-100 uppercase tracking-wider">
              {orderToEdit ? 'Editar Comanda/Pedido' : 'Novo Pedido em Loco / Manual'}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Main Info Fields */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* Customer name */}
            <div className="space-y-1.5 col-span-12 md:col-span-7 relative">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-yellow-500" /> Nome do Cliente / Mesa *
              </label>
              <input
                type="text"
                value={customerName}
                onFocus={() => setShowCustomerNameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustomerNameSuggestions(false), 250)}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Exemplo: Mesa 04 (Carlos)"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400/40 rounded-xl px-3 py-2.5 text-xs text-neutral-200 outline-none transition focus:ring-1 focus:ring-yellow-400/20"
                required
              />

              {/* Name Suggestions */}
              {showCustomerNameSuggestions && customerName.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl z-50 divide-y divide-neutral-900">
                  {(() => {
                    const queryNorm = removeAccents(customerName).trim().toLowerCase();
                    const filtered = savedCustomers.filter(c => 
                      removeAccents(c.name).toLowerCase().includes(queryNorm)
                    );

                    if (filtered.length === 0) return null;

                    return filtered.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2.5 text-xs text-neutral-350 hover:bg-yellow-400/10 hover:text-yellow-400 transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <p className="font-bold">{c.name}</p>
                          <p className="text-[10px] text-neutral-500">{c.phone || 'Sem telefone'}</p>
                        </div>
                        <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase font-bold">
                          {c.lastDeliveryType === 'delivery' ? 'Delivery' : c.lastDeliveryType === 'retirada' ? 'Balcão' : 'Local'}
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Customer Phone */}
            <div className="space-y-1.5 col-span-12 md:col-span-5 relative">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-yellow-500" /> Telefone / WhatsApp do Cliente
              </label>
              <input
                type="text"
                value={customerPhone}
                onFocus={() => setShowCustomerPhoneSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustomerPhoneSuggestions(false), 250)}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Ex: (53) 99123-4567"
                required={deliveryType === 'delivery'}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-yellow-400/40 rounded-xl px-3 py-2.5 text-xs text-neutral-200 outline-none transition focus:ring-1 focus:ring-yellow-400/20"
              />

              {/* Phone Suggestions */}
              {showCustomerPhoneSuggestions && customerPhone.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl z-50 divide-y divide-neutral-900">
                  {(() => {
                    const queryClean = customerPhone.replace(/\D/g, '');
                    const filtered = savedCustomers.filter(c => 
                      c.phone && c.phone.replace(/\D/g, '').includes(queryClean)
                    );

                    if (filtered.length === 0) return null;

                    return filtered.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2.5 text-xs text-neutral-350 hover:bg-yellow-400/10 hover:text-yellow-400 transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <p className="font-bold">{c.name}</p>
                          <p className="text-[10px] text-neutral-500">{c.phone}</p>
                        </div>
                        <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase font-bold">
                          {c.lastDeliveryType === 'delivery' ? 'Delivery' : c.lastDeliveryType === 'retirada' ? 'Balcão' : 'Local'}
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* Delivery type selection */}
            <div className="space-y-1.5 col-span-12">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Tipo do Pedido
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['local', 'retirada', 'delivery'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDeliveryType(type)}
                    className={`py-2.5 text-[11px] font-bold rounded-xl transition border cursor-pointer ${
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
                  ? '💡 Comandas em Loco imprimem apenas a via de cozinha (Kitchen) sem preços.'
                  : 'Gera comanda de expedição completa com rota de entrega.'}
              </p>
            </div>

          </div>

          {/* Locked/Unlocked Address Subsection depending on Delivery selection */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${
            deliveryType === 'delivery' 
              ? 'bg-neutral-950/40 border-yellow-550/20 shadow-lg shadow-yellow-400/5' 
              : 'bg-neutral-950/10 border-neutral-850/55 opacity-50'
          }`}>
            <h4 className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
              <MapPin className="w-3.5 h-3.5 text-yellow-500" /> Endereço de Entrega (Delivery)
              {deliveryType !== 'delivery' && (
                <span className="text-[9px] text-yellow-500/80 font-bold ml-1">
                  (Bloqueado - Selecione Delivery para liberar)
                </span>
              )}
            </h4>
            
            <div className="grid grid-cols-12 gap-3.5">
              <div className="col-span-12 sm:col-span-8 space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-400">Rua *</label>
                <input
                  type="text"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="Ex: Avenida Bento Gonçalves"
                  disabled={deliveryType !== 'delivery'}
                  required={deliveryType === 'delivery'}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 disabled:opacity-40 disabled:bg-neutral-950/20 rounded-lg p-2 text-xs text-neutral-200 outline-none transition"
                />
              </div>

              <div className="col-span-12 sm:col-span-4 space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-400">Número *</label>
                <input
                  type="text"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Ex: 4500"
                  disabled={deliveryType !== 'delivery'}
                  required={deliveryType === 'delivery'}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 disabled:opacity-40 disabled:bg-neutral-950/20 rounded-lg p-2 text-xs text-neutral-200 outline-none transition"
                />
              </div>

              <div className="col-span-12 sm:col-span-6 space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-400">Bairro *</label>
                <input
                  type="text"
                  value={addressNeighborhood}
                  onChange={(e) => setAddressNeighborhood(e.target.value)}
                  placeholder="Ex: Fragata"
                  disabled={deliveryType !== 'delivery'}
                  required={deliveryType === 'delivery'}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 disabled:opacity-40 disabled:bg-neutral-950/20 rounded-lg p-2 text-xs text-neutral-200 outline-none transition"
                />
              </div>

              <div className="col-span-12 sm:col-span-6 space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-400">Complemento / Bloco / Ap</label>
                <input
                  type="text"
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                  placeholder="Ex: Ap 101, Bloco C"
                  disabled={deliveryType !== 'delivery'}
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 disabled:opacity-40 disabled:bg-neutral-950/20 rounded-lg p-2 text-xs text-neutral-200 outline-none transition"
                />
              </div>

              <div className="col-span-12 space-y-1">
                <label className="text-[9px] font-bold uppercase text-neutral-400">Cidade / Estado</label>
                <input
                  type="text"
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  disabled={deliveryType !== 'delivery'}
                  placeholder="Pelotas - RS"
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 disabled:opacity-40 disabled:bg-neutral-950/20 rounded-lg p-2 text-xs text-neutral-200 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* ITEM APPENDER FIELDSET */}
          <div className="border-t border-neutral-800 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              {editingItemIdx !== null ? '🖊️ Editando Item do Pedido' : '⚡ Adicionar Produto do Menu (Supabase)'}
            </h4>

            <div className="grid grid-cols-12 gap-3.5 bg-neutral-950/45 p-4 rounded-xl border border-neutral-850/40">
              
              {/* Product Autocomplete Input */}
              <div className="space-y-1 col-span-12 md:col-span-8 relative">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Escolha o Produto (Digite para buscar) *</label>
                {loadingDb ? (
                  <div className="text-xs text-yellow-400 animate-pulse py-2">Carregando menu do Supabase...</div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={itemName}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                      onChange={(e) => {
                        const val = e.target.value;
                        setItemName(val);
                        setShowSuggestions(true);
                        
                        // Check exact database match ignoring accents/casing
                        const valNorm = removeAccents(val).trim();
                        const match = dbProducts.find(p => removeAccents(p.nome).trim() === valNorm);
                        if (match) {
                          setSelectedProductId(match.id);
                        } else {
                          setSelectedProductId('custom');
                        }
                      }}
                      placeholder="Ex: Marmitex, Pastel de Carne..."
                      className="w-full bg-neutral-900 border border-neutral-850 focus:border-yellow-450/40 rounded-lg p-2 text-xs text-neutral-200 outline-none transition"
                    />
                    
                    {/* Suggestions list dropdown */}
                    {showSuggestions && (
                      <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg shadow-2xl z-50 divide-y divide-neutral-900">
                        {(() => {
                          const queryTokens = removeAccents(itemName).trim().split(/\s+/).filter(Boolean);
                          const filtered = dbProducts.filter(p => {
                            if (queryTokens.length === 0) return true;
                            const prodNameNorm = removeAccents(p.nome);
                            return queryTokens.every(token => prodNameNorm.includes(token));
                          });
                          
                          if (filtered.length === 0) {
                            return (
                              <div className="p-3 text-xs text-neutral-500 italic select-none">
                                Nenhum produto correspondente cadastrado. Será considerado item personalizado.
                              </div>
                            );
                          }
                          
                          return filtered.slice(0, 15).map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onMouseDown={() => {
                                setItemName(p.nome);
                                setSelectedProductId(p.id);
                                setShowSuggestions(false);
                              }}
                              className="w-full text-left px-3 py-2.5 text-xs text-neutral-300 hover:bg-yellow-400/10 hover:text-yellow-400 transition flex items-center justify-between pointer-events-auto cursor-pointer"
                            >
                              <span className="font-semibold text-neutral-200">{p.nome}</span>
                              <span className="font-mono text-[10px] text-yellow-500 font-extrabold bg-neutral-900 border border-neutral-850 px-2 py-0.5 rounded">
                                R$ {Number(p.preco).toFixed(2)}
                              </span>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Custom price field for customizable items */}
                {selectedProductId === 'custom' && itemName.trim() !== '' && (
                  <div className="mt-2.5 space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Preço Unitário (Item Personalizado) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-bold select-none">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="Ex: 14.50"
                        className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 rounded-lg p-2.5 pl-9 text-xs text-neutral-200 outline-none"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity picker */}
              <div className="space-y-1 col-span-12 md:col-span-4">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Quantidade</label>
                <div className="flex items-center bg-neutral-900 rounded-lg border border-neutral-800 p-1 h-9">
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

              {/* Protein dropdown listbox for Marmitex / Lá Minuta */}
              {isMarmitaOrMinuta && (
                <div className="space-y-1 col-span-12 animate-fade-in">
                  <label className="text-[11px] font-extrabold text-yellow-400 uppercase tracking-wider block flex items-center gap-1.5">
                    🥩 Escolha a Proteína (Obrigatório) *
                  </label>
                  <select
                    value={selectedProteinId}
                    onChange={(e) => setSelectedProteinId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-400/40 rounded-lg p-2.5 text-xs text-neutral-200 outline-none transition focus:ring-1 focus:ring-yellow-400/20"
                    required
                  >
                    <option value="">Selecione uma proteína para a marmita / lá minuta...</option>
                    {dbAdditionals
                      .filter(add => add.categoria_id === 1 || add.nome.toLowerCase().includes('(marmitex/lá minuta)'))
                      .map(add => (
                        <option key={add.id} value={add.id}>
                          {add.nome.replace(' (Marmitex/Lá Minuta)', '')} {add.preco > 0 ? `(+R$ ${Number(add.preco).toFixed(2)})` : '(Incluso)'}
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}

              {/* Dynamic Additionals Grid */}
              <div className="space-y-4 col-span-12 mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <label className="text-xs font-extrabold text-neutral-300 uppercase tracking-widest block flex items-center gap-1.5">
                    🍟 Adicionais Extras do Produto
                  </label>
                  
                  {/* Categorization Tabs */}
                  <div className="flex flex-wrap gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-850">
                    {['suggerito', 'pastel', 'pratos', 'cheese', 'doces', 'todos'].map((cat) => {
                      const labels: Record<string, string> = {
                        suggerito: '✨ Sugeridos',
                        pastel: '🥟 Pastéis',
                        pratos: '🍛 Marmita/Lá Minuta',
                        cheese: '🧀 Cheese',
                        doces: '🍫 Doces & Sobremesas',
                        todos: '🔍 Todos'
                      };
                      
                      const isSel = activeCategory === cat;
                      
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setActiveCategory(cat as any);
                          }}
                          className={`text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-sm ${
                            isSel
                                ? 'bg-yellow-400 text-neutral-950 font-black scale-[1.02]'
                                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
                          }`}
                        >
                          {labels[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {dbAdditionals.length === 0 ? (
                  <p className="text-xs text-neutral-500 italic">Nenhum adicional disponível no momento.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800/60 shadow-inner">
                    {(() => {
                      const activeCat = activeCategory;
                      
                      const filteredAdds = dbAdditionals.filter(add => {
                        const lowAdd = add.nome.toLowerCase();
                        
                        // Protein option items (category 1) are parsed inside the select box, not in this extras grid!
                        const isProtein = add.categoria_id === 1 || lowAdd.includes('(marmitex/lá minuta)');
                        if (isProtein) {
                          return false;
                        }

                        if (activeCat === 'cheese') {
                          return add.categoria_id === 8 || add.categoria_id === 3 || add.categoria_id === 7;
                        }

                        if (activeCat === 'suggerito') {
                          // Auto detect product suggestions
                          if (lowerName.includes('pastel')) {
                            return add.categoria_id === 7 || add.categoria_id === 8 || add.categoria_id === 3 || lowAdd.includes('pastel:') || ['prestigio', 'prestígio', 'bolo', 'pudim', 'paçoquinha', 'geleia', 'moça', 'gibi'].some(x => lowAdd.includes(x));
                          }
                          if (isMarmitaOrMinuta) {
                            // Only allow Category_id 2 & 3 for Marmita/La Minuta extra additionals!
                            return add.categoria_id === 2 || add.categoria_id === 3;
                          }
                          // None detected, show basic extras or sweets (exclude pastels and other specific codes)
                          return add.categoria_id === 3 || (!lowAdd.includes('pastel:') && !lowAdd.includes('marmitex/') && !lowAdd.includes('adicional '));
                        }
                        if (activeCat === 'pastel') {
                          return add.categoria_id === 7 || add.categoria_id === 8 || add.categoria_id === 3 || lowAdd.includes('pastel:');
                        }
                        if (activeCat === 'pratos') {
                          // Only include categories 2 and 3 for Marmitex / La Minuta extra additions!
                          return add.categoria_id === 2 || add.categoria_id === 3;
                        }
                        if (activeCat === 'doces') {
                          const isSweetById = add.categoria_id === 5 || add.categoria_id === 6 || (add.categoria_id === 4 && lowAdd !== 'talheres descartáveis');
                          const isSweetByName = ['caseiro', 'paçoquinha', 'geleia', 'moça', 'gibi', 'bolo', 'dois amores', 'pudim', 'trento', 'prestigio', 'bis', 'lacta', 'diamante', 'halls', 'trident', 'chocolate', 'sonho de valsa', 'ouro branco'].some(x => lowAdd.includes(x));
                          return (isSweetById || isSweetByName) && !lowAdd.includes('pastel:') && !lowAdd.includes('marmitex/') && !lowAdd.includes('adicional ');
                        }
                        return true; // todos
                      });

                      if (filteredAdds.length === 0) {
                        return (
                          <div className="col-span-full py-6 text-center text-xs text-neutral-500 italic">
                            Nenhum adicional nesta categoria.
                          </div>
                        );
                      }

                      return filteredAdds.map((add) => {
                        const isSelected = !!selectedAdditionals[add.id];
                        return (
                          <button
                            key={add.id}
                            type="button"
                            onClick={() => {
                              setSelectedAdditionals(prev => ({
                                ...prev,
                                [add.id]: !prev[add.id]
                              }));
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all duration-150 select-none hover:scale-[1.01] active:scale-[0.99] gap-2 ${
                              isSelected
                                ? 'bg-yellow-400/15 border-yellow-400 text-yellow-300 font-extrabold shadow-md shadow-yellow-500/5 scale-[1.01]'
                                : 'bg-neutral-900 border-neutral-850 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                            }`}
                          >
                            <span className="text-xs sm:text-[13px] font-bold leading-tight flex-1 break-words py-0.5">
                              {formatAdditionalName(add.nome)}
                            </span>
                            <span className="text-[10.5px] sm:text-xs font-mono text-yellow-400 bg-neutral-950/90 border border-neutral-850 px-2 py-1 rounded font-extrabold whitespace-nowrap shadow-sm shrink-0">
                              +R$ {Number(add.preco).toFixed(2)}
                            </span>
                          </button>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Observations */}
              <div className="space-y-1 col-span-12 md:col-span-9">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Observações da Cozinha</label>
                <input
                  type="text"
                  value={itemObs}
                  onChange={(e) => setItemObs(e.target.value)}
                  placeholder="Ex: Sem cebola, bem passado, maionese extra..."
                  className="w-full bg-neutral-900 border border-neutral-800 focus:border-yellow-450/40 rounded-lg p-2 text-xs text-neutral-200 outline-none"
                />
              </div>

              {/* Easy add button */}
              <div className="col-span-12 md:col-span-3 flex items-end pt-1 md:pt-0">
                <button
                  type="button"
                  onClick={handleAddOrUpdateItem}
                  disabled={!itemName.trim()}
                  className="w-full h-9 bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-850 disabled:text-neutral-500 text-neutral-950 hover:text-neutral-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 text-neutral-950" />
                  {editingItemIdx !== null ? 'Atualizar' : 'Adicionar'}
                </button>
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
                <ShoppingBag className="w-7 h-7 text-neutral-850 mx-auto mb-1.5 animate-pulse" />
                Nenhum produto adicionado ainda. Lançe acima para compor a comanda.
              </div>
            ) : (
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/30">
                <div className="divide-y divide-neutral-850">
                  {items.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 bg-neutral-900/40 hover:bg-neutral-900/80 transition">
                      
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xs font-bold text-yellow-400">{item.quantity}x</span>
                          <span className="text-xs font-bold text-neutral-100">{item.name}</span>
                          {item.price > 0 && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              (R$ {item.price.toFixed(2)})
                            </span>
                          )}
                        </div>
                        {item.additionals && item.additionals.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.additionals.map((add, addIdx) => (
                              <span key={addIdx} className="text-[9.5px] font-semibold text-yellow-400 bg-yellow-950/20 px-1.5 py-0.5 rounded border border-yellow-950/50">
                                + {formatAdditionalName(add.name)} (+R$ {Number(add.price).toFixed(2)})
                              </span>
                            ))}
                          </div>
                        )}
                        {item.observations && (
                          <p className="text-[10px] text-neutral-400 bg-neutral-100/5 px-2 py-0.5 rounded italic mt-1 max-w-md truncate">
                            Obs: {item.observations}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditItem(idx)}
                          className="p-1 px-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 rounded transition"
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
            className="px-4 py-2 border border-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={items.length === 0 || !customerName.trim()}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 disabled:bg-neutral-850 disabled:text-neutral-500 text-neutral-950 font-extrabold text-xs rounded-xl transition cursor-pointer shadow-md shadow-yellow-450/10 active:scale-95 text-center"
          >
            {orderToEdit ? 'Salvar Alterações' : 'Concluir & Lançar'}
          </button>
        </div>

      </div>
    </div>
  );
}
