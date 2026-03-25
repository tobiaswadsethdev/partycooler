export interface Profile {
  id: string
  email: string
  device_name: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  user_id: string
  name: string
  category: string | null
  sku: string | null
  unit_price: number | null
  reorder_threshold: number
  created_at: string
  updated_at: string
}

export interface InventoryTransaction {
  id: string
  user_id: string
  product_id: string
  transaction_type: 'ingress' | 'egress'
  quantity: number
  notes: string | null
  transaction_date: string
  created_at: string
  product?: Product
}

export interface InventoryStatus {
  id: string
  user_id: string
  product_id: string
  current_quantity: number
  last_updated: string
  product?: Product
}

export interface Alert {
  id: string
  user_id: string
  product_id: string
  alert_type: 'low_stock' | 'expiry_warning'
  is_resolved: boolean
  created_at: string
  resolved_at: string | null
  product?: Product
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface DashboardStats {
  totalProducts: number
  totalItems: number
  lowStockCount: number
  recentTransactions: number
}

export interface ActivitySummary {
  period: 'daily' | 'weekly' | 'monthly'
  totalIngress: number
  totalEgress: number
  netChange: number
  transactionCount: number
}
