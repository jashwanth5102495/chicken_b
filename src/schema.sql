-- ====================================================================
-- ChickenLink / RestoPilot PostgreSQL Production Schema
-- Pure PostgreSQL Database Schema & Seed Data
-- ====================================================================

-- 1. Shops / Consumers Table (With User ID and Password for Consumer Login)
CREATE TABLE IF NOT EXISTS shops (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL, -- User ID for consumer login
  password VARCHAR(255) NOT NULL,       -- Password created by admin
  name VARCHAR(150) NOT NULL,
  owner_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(100),
  address TEXT NOT NULL,
  area_route VARCHAR(100) NOT NULL,
  credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
  outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  custom_rates JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  name_kn VARCHAR(150),
  name_hi VARCHAR(150),
  name_te VARCHAR(150),
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  current_rate NUMERIC(10, 2) NOT NULL,
  yesterday_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  min_order_qty NUMERIC(8, 2) NOT NULL DEFAULT 1.0,
  step_qty NUMERIC(8, 2) NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Daily Rates History Table
CREATE TABLE IF NOT EXISTS daily_rates (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rate_date DATE NOT NULL,
  rate_per_unit NUMERIC(10, 2) NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, rate_date)
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL UNIQUE,
  shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE NOT NULL,
  delivery_slot VARCHAR(32) NOT NULL DEFAULT 'Morning',
  status VARCHAR(32) NOT NULL DEFAULT 'Placed', -- Placed, Confirmed, Out for delivery, Delivered, Cancelled
  notes TEXT,
  total_ordered_qty NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_delivered_qty NUMERIC(10, 2),
  estimated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  final_amount NUMERIC(12, 2),
  invoice_number VARCHAR(64),
  invoice_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(150) NOT NULL,
  unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  ordered_qty NUMERIC(10, 2) NOT NULL,
  delivered_qty NUMERIC(10, 2),
  unit_rate NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  receipt_no VARCHAR(64) NOT NULL UNIQUE,
  shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_mode VARCHAR(32) NOT NULL DEFAULT 'Cash', -- Cash, UPI, Bank, Cheque
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_no VARCHAR(64),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Ledger Entries Table (Append-only)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id VARCHAR(64) PRIMARY KEY,
  shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  entry_type VARCHAR(32) NOT NULL, -- INVOICE, PAYMENT, ADJUSTMENT
  reference_id VARCHAR(64) NOT NULL,
  reference_no VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  debit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance_after NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Standing Orders Table (Recurring Orders)
CREATE TABLE IF NOT EXISTS standing_orders (
  id VARCHAR(64) PRIMARY KEY,
  shop_id VARCHAR(64) NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_slot VARCHAR(32) NOT NULL DEFAULT 'Morning',
  days_of_week INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name VARCHAR(200) NOT NULL DEFAULT 'Sri Lakshmi Broiler & Poultry Distributors',
  owner_name VARCHAR(100) NOT NULL DEFAULT 'M. Venkatesh',
  phone VARCHAR(32) NOT NULL DEFAULT '+91 98450 99881',
  address TEXT NOT NULL DEFAULT 'No. 42, Wholesale Poultry Market, City Market, Bangalore - 560002',
  gstin VARCHAR(32) DEFAULT '29ABCDE1234F1Z5',
  fssai VARCHAR(32) DEFAULT '11223344556677',
  cutoff_time VARCHAR(10) NOT NULL DEFAULT '21:00',
  delivery_slots TEXT[] NOT NULL DEFAULT '{"Morning", "Afternoon", "Evening"}',
  invoice_prefix VARCHAR(32) NOT NULL DEFAULT 'INV-CKL-',
  invoice_footer TEXT NOT NULL DEFAULT 'Fresh farm chicken delivered daily. Please inspect goods at delivery.',
  upi_id VARCHAR(100) NOT NULL DEFAULT 'lakshmipoultry@okhdfcbank',
  bank_details JSONB NOT NULL DEFAULT '{"bank_name": "HDFC Bank", "account_number": "50200084729184", "ifsc": "HDFC0001234", "branch": "City Market, Bangalore"}'::jsonb,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_shops_username ON shops(username);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_order_items_ord ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_ledger_shop ON ledger_entries(shop_id);
