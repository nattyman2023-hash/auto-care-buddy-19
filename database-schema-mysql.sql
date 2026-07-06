-- MySQL-compatible database schema for Auto Care Buddy
-- Converted from Supabase PostgreSQL migrations
-- For Hostinger MySQL database

-- ==================================================
-- Core Tables
-- ==================================================

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(255) PRIMARY KEY,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(255) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  pay_rate DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  skills TEXT,
  postcode VARCHAR(20) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role)
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address VARCHAR(500),
  postcode VARCHAR(20),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service catalog table
CREATE TABLE IF NOT EXISTS service_catalog (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL DEFAULT '',
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_hours DECIMAL(5,2) DEFAULT 1,
  category VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chairs/Stations table
CREATE TABLE IF NOT EXISTS chairs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  zone VARCHAR(100) DEFAULT 'main',
  zones JSON,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id VARCHAR(36) NOT NULL,
  hair_profile_id VARCHAR(36),
  service_catalog_id VARCHAR(36),
  chair_id VARCHAR(36),
  assigned_to VARCHAR(36),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  type VARCHAR(50) NOT NULL DEFAULT 'appointment',
  service_type VARCHAR(50) NOT NULL DEFAULT 'standard',
  urgency VARCHAR(50) NOT NULL DEFAULT 'flexible',
  progress VARCHAR(100),
  source VARCHAR(100),
  notes TEXT,
  pay_type VARCHAR(50) NOT NULL DEFAULT 'hourly',
  pay_amount DECIMAL(10,2),
  deposit_required BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid_at TIMESTAMP,
  stripe_checkout_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  allow_overlap BOOLEAN DEFAULT FALSE,
  manage_token VARCHAR(255),
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (hair_profile_id) REFERENCES hair_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (service_catalog_id) REFERENCES service_catalog(id) ON DELETE SET NULL,
  FOREIGN KEY (chair_id) REFERENCES chairs(id) ON DELETE SET NULL
);

-- Hair profiles table (vehicles in original schema)
CREATE TABLE IF NOT EXISTS hair_profiles (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id VARCHAR(36) NOT NULL,
  texture VARCHAR(255) DEFAULT '',
  preference VARCHAR(255) DEFAULT '',
  goal VARCHAR(255) DEFAULT '',
  mileage INT,
  mot_expiry DATE,
  last_service_date DATE,
  annual_service_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id VARCHAR(36),
  customer_id VARCHAR(36) NOT NULL,
  items JSON NOT NULL DEFAULT ('[]'),
  labor_hours DECIMAL(5,2) DEFAULT 0,
  labor_rate DECIMAL(10,2) DEFAULT 0,
  travel_cost DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id VARCHAR(36) NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(100),
  signature TEXT,
  stripe_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  invoice_id VARCHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  type VARCHAR(50) NOT NULL DEFAULT 'labor',
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Job notes table
CREATE TABLE IF NOT EXISTS job_notes (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Job photos table
CREATE TABLE IF NOT EXISTS job_photos (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id VARCHAR(36) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  caption VARCHAR(500),
  photo_type VARCHAR(50) DEFAULT 'documentation',
  visible_to_customer BOOLEAN DEFAULT FALSE,
  uploaded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Job addons table
CREATE TABLE IF NOT EXISTS job_addons (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id VARCHAR(36) NOT NULL,
  addon_service_id VARCHAR(36) NOT NULL,
  price_snapshot DECIMAL(10,2) DEFAULT 0,
  duration_minutes_snapshot INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  direction VARCHAR(50) NOT NULL DEFAULT 'incoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id VARCHAR(36),
  mechanic_id VARCHAR(36) NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  duration_seconds INT DEFAULT 0,
  notes TEXT DEFAULT '',
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Swap requests table
CREATE TABLE IF NOT EXISTS swap_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  job_id VARCHAR(36) NOT NULL,
  from_mechanic_id VARCHAR(36) NOT NULL,
  to_mechanic_id VARCHAR(36),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reason TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  employee_id VARCHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL DEFAULT 'other',
  receipt_path VARCHAR(500),
  date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue submissions table
CREATE TABLE IF NOT EXISTS issue_submissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  customer_id VARCHAR(36) NOT NULL,
  hair_profile_id VARCHAR(36),
  description TEXT NOT NULL DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (hair_profile_id) REFERENCES hair_profiles(id) ON DELETE SET NULL
);

-- Issue photos table
CREATE TABLE IF NOT EXISTS issue_photos (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  issue_id VARCHAR(36) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (issue_id) REFERENCES issue_submissions(id) ON DELETE CASCADE
);

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  service_requested VARCHAR(255) DEFAULT '',
  source VARCHAR(100) NOT NULL DEFAULT 'Web',
  status VARCHAR(50) NOT NULL DEFAULT 'New',
  priority VARCHAR(50) NOT NULL DEFAULT 'Medium',
  ai_score INT NOT NULL DEFAULT 0,
  assigned_to VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  lead_id VARCHAR(36) NOT NULL,
  estimated_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  parts_cost_estimate DECIMAL(10,2) NOT NULL DEFAULT 0,
  labor_estimate DECIMAL(10,2) NOT NULL DEFAULT 0,
  valid_until DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  location_type VARCHAR(50) NOT NULL DEFAULT 'garage',
  estimated_date DATE,
  signature TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Quote items table
CREATE TABLE IF NOT EXISTS quote_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  quote_id VARCHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  category VARCHAR(100) NOT NULL DEFAULT 'labor',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
);

-- Lead interactions table
CREATE TABLE IF NOT EXISTS lead_interactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  lead_id VARCHAR(36) NOT NULL,
  type VARCHAR(100) NOT NULL DEFAULT 'Note',
  content TEXT NOT NULL DEFAULT '',
  author_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  staff_id VARCHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'vacation',
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  decline_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'other',
  quantity INT DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  image_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Booking drafts table
CREATE TABLE IF NOT EXISTS booking_drafts (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  session_token VARCHAR(255) NOT NULL DEFAULT (UUID()),
  service_catalog_id VARCHAR(36),
  step INT DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  scheduled_at TIMESTAMP,
  reminder_sent_at TIMESTAMP,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_catalog_id) REFERENCES service_catalog(id) ON DELETE SET NULL
);

-- Cart sessions table
CREATE TABLE IF NOT EXISTS cart_sessions (
  session_id VARCHAR(255) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  reminder_sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id VARCHAR(255) NOT NULL,
  service_catalog_id VARCHAR(36),
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES cart_sessions(session_id) ON DELETE CASCADE,
  FOREIGN KEY (service_catalog_id) REFERENCES service_catalog(id) ON DELETE SET NULL
);

-- ==================================================
-- Email tables (if using email functionality)
-- ==================================================

CREATE TABLE IF NOT EXISTS email_dispatch_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  dedupe_key VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_send_log (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  recipient_email VARCHAR(255) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  message_id VARCHAR(255),
  error_message TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_send_state (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_size INT DEFAULT 50,
  send_delay_ms INT DEFAULT 1000,
  auth_email_ttl_minutes INT DEFAULT 10,
  transactional_email_ttl_minutes INT DEFAULT 30,
  retry_after_until TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================================================
-- Trigger: Auto-sync invoice status to job status
-- ==================================================

DELIMITER //
CREATE TRIGGER invoices_status_sync
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> NEW.status) THEN
    UPDATE jobs SET status = 'paid' WHERE id = NEW.job_id;
  END IF;
END //
DELIMITER ;

-- ==================================================
-- Indexes for performance
-- ==================================================

CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_assigned_to ON jobs(assigned_to);
CREATE INDEX idx_jobs_scheduled_at ON jobs(scheduled_at);
CREATE INDEX idx_invoices_job_id ON invoices(job_id);
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX idx_job_photos_job_id ON job_photos(job_id);
CREATE INDEX idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX idx_time_entries_mechanic_id ON time_entries(mechanic_id);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_hair_profiles_customer_id ON hair_profiles(customer_id);
CREATE INDEX idx_messages_customer_id ON messages(customer_id);
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_job_id ON estimates(job_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_quotes_lead_id ON quotes(lead_id);

-- ==================================================
-- Insert default settings
-- ==================================================

INSERT IGNORE INTO settings (`key`, `value`) VALUES ('vat_registered', 'false');