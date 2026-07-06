// App-level types matching the database schema
export type AppRole = 'super_admin' | 'admin' | 'mechanic' | 'customer';

export interface LeaveRequest {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  type: string;
  reason: string | null;
  status: string;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  profile?: Profile;
}
export type JobStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'paid';
export type JobType = 'mobile' | 'garage';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'archived';
export type MessageDirection = 'inbound' | 'outbound';
export type ServiceType = 'service' | 'repair' | 'diagnostics';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  pay_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  postcode: string;
  lat: number | null;
  lng: number | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HairProfile {
  id: string;
  customer_id: string;
  preference: string;
  texture: string;
  goal: string;
  created_at: string;
  updated_at: string;
}
// Back-compat alias — some legacy imports still reference Vehicle
export type Vehicle = HairProfile;

export interface Job {
  id: string;
  customer_id: string;
  hair_profile_id: string | null;
  assigned_to: string | null;
  status: JobStatus;
  type: JobType;
  service_type: ServiceType;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string;
  urgency: string;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: Customer;
  hair_profile?: HairProfile;
}

export interface JobNote {
  id: string;
  job_id: string;
  author_id: string | null;
  content: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  job_id: string;
  total: number;
  vat: number;
  status: InvoiceStatus;
  stripe_id: string | null;
  signature: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  job?: Job;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  type: 'parts' | 'labor' | 'misc';
  description: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Message {
  id: string;
  customer_id: string;
  content: string;
  direction: MessageDirection;
  created_at: string;
  customer?: Customer;
}

export interface JobPhoto {
  id: string;
  job_id: string;
  storage_path: string;
  caption: string;
  photo_type: string;
  visible_to_customer: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface IssueSubmission {
  id: string;
  customer_id: string;
  hair_profile_id: string | null;
  description: string;
  status: string;
  created_at: string;
}

export interface IssuePhoto {
  id: string;
  issue_id: string;
  storage_path: string;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  job_id: string;
  mechanic_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  notes: string;
  archived: boolean;
  created_at: string;
}

export interface SwapRequest {
  id: string;
  job_id: string;
  from_mechanic_id: string;
  to_mechanic_id: string | null;
  status: string;
  reason: string;
  created_at: string;
  resolved_at: string | null;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  base_price: number;
  estimated_hours: number;
  category: string;
  created_at: string;
}

export interface Estimate {
  id: string;
  job_id: string | null;
  customer_id: string;
  items: any[];
  labor_hours: number;
  labor_rate: number;
  travel_cost: number;
  subtotal: number;
  vat: number;
  total: number;
  status: string;
  created_at: string;
  customer?: Customer;
}

export interface Expense {
  id: string;
  employee_id: string;
  description: string;
  amount: number;
  category: string;
  receipt_path: string | null;
  date: string;
  created_at: string;
}

export type LeadSource = 'Web' | 'Google Ads' | 'Facebook' | 'Phone';
export type LeadStatus = 'New' | 'Attempted Contact' | 'Quoted' | 'Nurturing' | 'Lost' | 'Converted';
export type LeadPriority = 'High' | 'Medium' | 'Low';
export type QuoteStatus = 'Pending' | 'Accepted' | 'Expired';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_requested: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  ai_score: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: string;
  lead_id: string;
  estimated_price: number;
  parts_cost_estimate: number;
  labor_estimate: number;
  valid_until: string | null;
  status: QuoteStatus;
  location_type: string;
  estimated_date: string | null;
  signature: string | null;
  created_at: string;
  lead?: Lead;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  description: string;
  category: string;
  price: number;
  created_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  type: string;
  content: string;
  author_id: string | null;
  created_at: string;
}
