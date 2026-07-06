-- MySQL-compatible database schema for Auto Care Buddy
-- Clean version for Hostinger MySQL import
-- Use this file in phpMyAdmin to create all tables

SET FOREIGN_KEY_CHECKS=0;

-- ==================================================
-- Core Tables
-- ==================================================

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(255) NOT NULL,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  full_name VARCHAR(255) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  pay_rate DECIMAL(10,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  skills TEXT,
  postcode VARCHAR(20) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_user_role (user_id, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address VARCHAR(500),
  postcode VARCHAR(20),
  lat DECIMAL(10,7),
  lng DECIMAL(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Service catalog table
CREATE TABLE IF NOT EXISTS service_catalog (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_hours DECIMAL(5,2) DEFAULT 1,
  category VARCHAR(100) DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chairs/Stations table
CREATE TABLE IF NOT EXISTS chairs (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  zone VARCHAR(100) DEFAULT 'main',
  zones JSON,
  is_active TINYINT(1) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hair profiles table (first, as jobs depends on it)
CREATE TABLE IF NOT EXISTS hair_profiles (
  id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  texture VARCHAR(255) DEFAULT '',
  preference VARCHAR(255) DEFAULT '',
  goal VARCHAR(255) DEFAULT '',
  mileage INT,
  mot_expiry DATE,
  last_service_date DATE,
  annual_service_required TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_hp_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR(36) NOT NULL,
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
  deposit_required TINYINT(1) DEFAULT 0,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid_amount DECIMAL(10,2) DEFAULT 0,
  deposit_paid_at TIMESTAMP NULL,
  stripe_checkout_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  allow_overlap TINYINT(1) DEFAULT 0,
  manage_token VARCHAR(255),
  scheduled_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_j_customer (customer_id),
  KEY idx_j_status (status),
  KEY idx_j_assigned (assigned_to),
  KEY idx_j_scheduled (scheduled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36),
  customer_id VARCHAR(36) NOT NULL,
  items JSON NOT NULL,
  labor_hours DECIMAL(5,2) DEFAULT 0,
  labor_rate DECIMAL(10,2) DEFAULT 0,
  travel_cost DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_e_customer (customer_id),
  KEY idx_e_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(100),
  signature TEXT,
  stripe_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_i_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(36) NOT NULL,
  invoice_id VARCHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  type VARCHAR(50) NOT NULL DEFAULT 'labor',
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ii_invoice (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job notes table
CREATE TABLE IF NOT EXISTS job_notes (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NOT NULL,
  author_id VARCHAR(36),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jn_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job photos table
CREATE TABLE IF NOT EXISTS job_photos (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  caption VARCHAR(500),
  photo_type VARCHAR(50) DEFAULT 'documentation',
  visible_to_customer TINYINT(1) DEFAULT 0,
  uploaded_by VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jp_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Job addons table
CREATE TABLE IF NOT EXISTS job_addons (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NOT NULL,
  addon_service_id VARCHAR(36) NOT NULL,
  price_snapshot DECIMAL(10,2) DEFAULT 0,
  duration_minutes_snapshot INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ja_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  direction VARCHAR(50) NOT NULL DEFAULT 'incoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_m_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36),
  mechanic_id VARCHAR(36) NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  duration_seconds INT DEFAULT 0,
  notes TEXT,
  archived TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_te_job (job_id),
  KEY idx_te_mechanic (mechanic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Swap requests table
CREATE TABLE IF NOT EXISTS swap_requests (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NOT NULL,
  from_mechanic_id VARCHAR(36) NOT NULL,
  to_mechanic_id VARCHAR(36),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_sr_job (job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) NOT NULL,
  employee_id VARCHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL DEFAULT 'other',
  receipt_path VARCHAR(500),
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Issue submissions table
CREATE TABLE IF NOT EXISTS issue_submissions (
  id VARCHAR(36) NOT NULL,
  customer_id VARCHAR(36) NOT NULL,
  hair_profile_id VARCHAR(36),
  description TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_is_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Issue photos table
CREATE TABLE IF NOT EXISTS issue_photos (
  id VARCHAR(36) NOT NULL,
  issue_id VARCHAR(36) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ip_issue (issue_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id VARCHAR(36) NOT NULL,
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_l_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id VARCHAR(36) NOT NULL,
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
  PRIMARY KEY (id),
  KEY idx_q_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quote items table
CREATE TABLE IF NOT EXISTS quote_items (
  id VARCHAR(36) NOT NULL,
  quote_id VARCHAR(36) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  category VARCHAR(100) NOT NULL DEFAULT 'labor',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qi_quote (quote_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lead interactions table
CREATE TABLE IF NOT EXISTS lead_interactions (
  id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  type VARCHAR(100) NOT NULL DEFAULT 'Note',
  content TEXT NOT NULL,
  author_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_li_lead (lead_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id VARCHAR(36) NOT NULL,
  staff_id VARCHAR(36) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'vacation',
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  decline_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'other',
  quantity INT DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  low_stock_threshold INT DEFAULT 10,
  image_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Booking drafts table
CREATE TABLE IF NOT EXISTS booking_drafts (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  session_token VARCHAR(255) NOT NULL,
  service_catalog_id VARCHAR(36),
  step INT DEFAULT 0,
  completed TINYINT(1) DEFAULT 0,
  scheduled_at TIMESTAMP NULL,
  reminder_sent_at TIMESTAMP NULL,
  last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart sessions table
CREATE TABLE IF NOT EXISTS cart_sessions (
  session_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  reminder_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(36) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  service_catalog_id VARCHAR(36),
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ci_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================
-- Email tables
-- ==================================================

CREATE TABLE IF NOT EXISTS email_dispatch_log (
  id VARCHAR(36) NOT NULL,
  dedupe_key VARCHAR(255) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_send_log (
  id VARCHAR(36) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  message_id VARCHAR(255),
  error_message TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_send_state (
  id INT NOT NULL AUTO_INCREMENT,
  batch_size INT DEFAULT 50,
  send_delay_ms INT DEFAULT 1000,
  auth_email_ttl_minutes INT DEFAULT 10,
  transactional_email_ttl_minutes INT DEFAULT 30,
  retry_after_until TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================================================
-- Trigger: Auto-sync invoice status to job status
-- ==================================================

DELIMITER $$
CREATE TRIGGER invoices_status_sync
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    UPDATE jobs SET status = 'paid' WHERE id = NEW.job_id;
  END IF;
END$$
DELIMITER ;

-- ==================================================
-- Insert default settings
-- ==================================================

INSERT IGNORE INTO settings (`key`, `value`) VALUES ('vat_registered', 'false');

SET FOREIGN_KEY_CHECKS=1;