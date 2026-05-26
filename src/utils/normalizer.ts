import { NormalizedOrder, NormalizedOrderItem, AddressInfo, OrderPlatform } from '../types';

/**
 * Normalizes an iFood order payload
 */
export function normalizeIFoodOrder(payload: any): NormalizedOrder {
  const id = payload.id || `if-local-${Date.now()}`;
  const displayId = payload.displayId || id.toString().substring(0, 4);
  const createdAt = payload.createdAt || new Date().toISOString();
  
  // Format order time (HH:MM)
  let orderTime = '00:00';
  try {
    const d = new Date(createdAt);
    orderTime = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    // fallback
  }

  const deliveryType = payload.orderType === 'TOGO' ? 'retirada' : 'delivery';
  
  const customerName = payload.customer?.name || 'Cliente iFood';
  const customerPhone = payload.customer?.phone?.number || '';
  
  let customerAddress: AddressInfo | undefined = undefined;
  if (deliveryType === 'delivery' && payload.delivery?.deliveryAddress) {
    const addr = payload.delivery.deliveryAddress;
    customerAddress = {
      street: addr.streetName || '',
      number: addr.streetNumber || 'S/N',
      neighborhood: addr.neighborhood || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.postalCode || '',
      complement: addr.complement || '',
      formatted: addr.formattedAddress || `${addr.streetName || ''}, ${addr.streetNumber || ''} - ${addr.neighborhood || ''}, ${addr.city || ''}`
    };
  }

  const items: NormalizedOrderItem[] = (payload.items || []).map((item: any) => {
    return {
      name: item.name || '',
      quantity: item.quantity || 1,
      price: item.unitPrice || 0,
      observations: item.observations || '',
      additionals: (item.options || []).map((opt: any) => ({
        name: opt.name || '',
        quantity: opt.quantity || 1,
        price: opt.price || 0
      }))
    };
  });

  const subtotal = payload.total?.subTotal || 0;
  const deliveryFee = payload.total?.deliveryFee || 0;
  const discount = payload.total?.benefits || 0;
  const total = payload.total?.orderAmount || (subtotal + deliveryFee - discount);

  // Parse payment details
  let paymentMethod = 'Não Especificado';
  let paymentType: 'ONLINE' | 'OFFLINE' = 'ONLINE';
  let changeFor: number | null = null;

  if (payload.payments?.methods && payload.payments.methods.length > 0) {
    const p = payload.payments.methods[0];
    const methodStr = p.method || '';
    if (methodStr === 'CREDIT') paymentMethod = 'Cartão de Crédito';
    else if (methodStr === 'DEBIT') paymentMethod = 'Cartão de Débito';
    else if (methodStr === 'CASH') paymentMethod = 'Dinheiro';
    else if (methodStr === 'PIX') paymentMethod = 'PIX';
    else paymentMethod = methodStr;

    paymentType = p.type === 'OFFLINE' ? 'OFFLINE' : 'ONLINE';
    if (p.cash?.changeFor) {
      changeFor = p.cash.changeFor;
    }
  }

  return {
    id,
    displayId: `#${displayId}`,
    platform: 'ifood',
    createdAt,
    orderTime,
    deliveryType,
    customerName,
    customerPhone,
    customerAddress,
    items,
    paymentMethod,
    paymentType,
    changeFor,
    subtotal,
    deliveryFee,
    discount,
    total,
    printed: false,
    printedKitchen: false,
    status: 'pending',
    rawPayload: payload
  };
}

/**
 * Normalizes an Anota.ai order payload
 */
export function normalizeAnotaAiOrder(payload: any): NormalizedOrder {
  const id = payload._id || payload.id || `an-local-${Date.now()}`;
  const displayId = payload.shortId ? payload.shortId.replace('#', '') : id.toString().substring(0, 4);
  const createdAt = payload.created_at || payload.createdAt || new Date().toISOString();
  
  let orderTime = '00:00';
  try {
    const d = new Date(createdAt);
    orderTime = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    // fallback
  }

  const deliveryType = payload.type === 'retirada' ? 'retirada' : 'delivery';
  
  const customerName = payload.customer?.name || 'Cliente Anota.ai';
  const customerPhone = payload.customer?.phone || '';
  
  let customerAddress: AddressInfo | undefined = undefined;
  if (deliveryType === 'delivery' && payload.address) {
    const addr = payload.address;
    const formatted = `${addr.street || ''}, ${addr.number || ''} - ${addr.neighborhood || ''}, ${addr.city || ''}`;
    customerAddress = {
      street: addr.street || '',
      number: addr.number || 'S/N',
      neighborhood: addr.neighborhood || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zipCode || addr.cep || '',
      complement: addr.complement || '',
      formatted
    };
  }

  const items: NormalizedOrderItem[] = (payload.items || []).map((item: any) => {
    return {
      name: item.name || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      observations: item.obs || item.observation || '',
      additionals: (item.subitems || item.additionals || []).map((sub: any) => ({
        name: sub.name || '',
        quantity: sub.quantity || 1,
        price: sub.price || 0
      }))
    };
  });

  const deliveryFee = payload.deliveryFee || payload.delivery_fee || 0;
  const total = payload.total || 0;
  
  // Calculate subtotal if not supplied
  let calculatedSubtotal = 0;
  items.forEach(it => {
    calculatedSubtotal += it.price * it.quantity;
    if (it.additionals) {
      it.additionals.forEach(add => {
        calculatedSubtotal += (add.price || 0) * add.quantity;
      });
    }
  });
  const subtotal = payload.subtotal || calculatedSubtotal;
  const discount = payload.discount || 0;

  // Payments
  let paymentMethod = 'Não Especificado';
  let paymentType: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
  let changeFor: number | null = null;

  if (payload.payment) {
    const methodStr = payload.payment.method || '';
    if (methodStr.toLowerCase() === 'pix') paymentMethod = 'PIX';
    else if (methodStr.toLowerCase() === 'dinheiro') paymentMethod = 'Dinheiro';
    else if (methodStr.toLowerCase() === 'debito' || methodStr.toLowerCase() === 'débito') paymentMethod = 'Cartão de Débito';
    else if (methodStr.toLowerCase() === 'credito' || methodStr.toLowerCase() === 'crédito') paymentMethod = 'Cartão de Crédito';
    else paymentMethod = methodStr;

    paymentType = payload.payment.online ? 'ONLINE' : 'OFFLINE';
    if (payload.payment.changeFor && payload.payment.changeFor > 0) {
      changeFor = payload.payment.changeFor;
    }
  }

  return {
    id,
    displayId: `#${displayId}`,
    platform: 'anotai',
    createdAt,
    orderTime,
    deliveryType,
    customerName,
    customerPhone,
    customerAddress,
    items,
    paymentMethod,
    paymentType,
    changeFor,
    subtotal,
    deliveryFee,
    discount,
    total,
    printed: false,
    printedKitchen: false,
    status: 'pending',
    rawPayload: payload
  };
}

/**
 * Normalizes a Delivery Much order payload
 */
export function normalizeDeliveryMuchOrder(payload: any): NormalizedOrder {
  const id = payload.order_id || payload.id || `dm-local-${Date.now()}`;
  const displayId = payload.display_id || id.toString().substring(0, 4);
  const createdAt = payload.created_at || payload.createdAt || new Date().toISOString();
  
  let orderTime = '00:00';
  try {
    const d = new Date(createdAt);
    orderTime = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    // fallback
  }

  const deliveryType = (payload.delivery_type === 'retira' || payload.delivery_type === 'takeout') ? 'retirada' : 'delivery';
  
  const customerName = payload.customer?.name || 'Cliente Delivery Much';
  const customerPhone = payload.customer?.phone || '';
  
  let customerAddress: AddressInfo | undefined = undefined;
  if (deliveryType === 'delivery' && payload.address) {
    const addr = payload.address;
    const formatted = `${addr.street_name || ''}, ${addr.street_number || ''} - ${addr.neighborhood || ''}, ${addr.city || ''}`;
    customerAddress = {
      street: addr.street_name || '',
      number: addr.street_number || 'S/N',
      neighborhood: addr.neighborhood || '',
      city: addr.city || '',
      state: addr.state || '',
      zipCode: addr.zip_code || '',
      complement: addr.complement || '',
      formatted
    };
  }

  const items: NormalizedOrderItem[] = (payload.items || []).map((item: any) => {
    return {
      name: item.name || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      observations: item.note || item.obs || '',
      additionals: (item.complements || item.additionals || []).map((comp: any) => ({
        name: comp.name || '',
        quantity: comp.quantity || 1,
        price: comp.price || 0
      }))
    };
  });

  const subtotal = payload.totals?.subtotal || 0;
  const deliveryFee = payload.totals?.delivery_fee || payload.totals?.deliveryFee || 0;
  const discount = payload.totals?.discount || 0;
  const total = payload.totals?.total || (subtotal + deliveryFee - discount);

  // Payments
  let paymentMethod = 'Não Especificado';
  let paymentType: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
  let changeFor: number | null = null;

  if (payload.payment) {
    paymentMethod = payload.payment.method || 'Não Especificado';
    paymentType = payload.payment.type?.toUpperCase() === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
    if (payload.payment.change && payload.payment.change > 0) {
      changeFor = payload.payment.change;
    }
  }

  return {
    id: id.toString(),
    displayId: `#${displayId}`,
    platform: 'deliverymuch',
    createdAt,
    orderTime,
    deliveryType,
    customerName,
    customerPhone,
    customerAddress,
    items,
    paymentMethod,
    paymentType,
    changeFor,
    subtotal,
    deliveryFee,
    discount,
    total,
    printed: false,
    printedKitchen: false,
    status: 'pending',
    rawPayload: payload
  };
}

/**
 * Normalizes any incoming order payload based on its fields or configured indicators
 */
export function normalizeOrder(payload: any, inferredPlatform?: OrderPlatform): NormalizedOrder {
  // If the user specified a platform or we can detect it
  let platform: OrderPlatform = inferredPlatform || 'ifood';
  
  if (!inferredPlatform) {
    if ('order_id' in payload || 'display_id' in payload || ('totals' in payload && 'subtotal' in payload.totals)) {
      platform = 'deliverymuch';
    } else if ('shortId' in payload || 'created_at' in payload && !('order_id' in payload)) {
      platform = 'anotai';
    } else {
      platform = 'ifood';
    }
  }

  switch (platform) {
    case 'deliverymuch':
      return normalizeDeliveryMuchOrder(payload);
    case 'anotai':
      return normalizeAnotaAiOrder(payload);
    case 'ifood':
    default:
      return normalizeIFoodOrder(payload);
  }
}
