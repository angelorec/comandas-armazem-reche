export type OrderPlatform = 'ifood' | 'anotai' | 'deliverymuch' | 'local';

export interface NormalizedOrderItemAdditional {
  name: string;
  quantity: number;
  price?: number;
}

export interface NormalizedOrderItem {
  name: string;
  quantity: number;
  price: number;
  observations?: string;
  additionals?: NormalizedOrderItemAdditional[];
}

export interface AddressInfo {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state?: string;
  zipCode?: string;
  complement?: string;
  formatted?: string;
}

export interface NormalizedOrder {
  id: string; // unique internal tracking ID
  displayId: string; // short, user-friendly order number/id (e.g., #4823)
  platform: OrderPlatform;
  createdAt: string; // ISO String
  orderTime: string; // HH:MM
  deliveryType: 'delivery' | 'retirada' | 'local';
  customerName: string;
  customerPhone?: string;
  customerAddress?: AddressInfo;
  items: NormalizedOrderItem[];
  paymentMethod: string;
  paymentType: 'ONLINE' | 'OFFLINE';
  changeFor?: number | null;
  subtotal: number;
  deliveryFee: number;
  discount?: number;
  total: number;
  printed: boolean;
  printedKitchen: boolean;
  status: 'pending' | 'printed' | 'canceled';
  rawPayload: any; // original payload for visualization and reference
}

// Stats for the system
export interface OrderStats {
  totalOrders: number;
  ifoodCount: number;
  anotaiCount: number;
  deliveryMuchCount: number;
  totalRevenue: number;
}
