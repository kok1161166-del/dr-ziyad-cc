import { supabase } from "./supabase";
export { supabase };

// ---- Types ----
export type AppointmentStatus =
  | "waiting_reception" | "exam_fee_pending" | "waiting_doctor_approval"
  | "doctor_approved" | "in_examination" | "exam_completed"
  | "checkout_pending" | "completed" | "cancelled";

export interface DbPatient {
  id?: number;
  local_code: number;
  name_ar: string;
  name_en?: string;
  gender: string;
  date_of_birth?: string;
  phones?: { number: string; owner?: string }[];
  home_phone?: string;
  id_number?: string;
  marital_status?: string;
  nationality?: string;
  address?: string;
  governorate?: string;
  city?: string;
  neighborhood?: string;
  occupation?: string;
  email?: string;
  insurance_status?: string;
  referred_by?: string;
  source?: string;
  notes?: string;
  total_visits?: number;
  last_visit_date?: string;
}

export interface DbAppointment {
  id?: number;
  patient_id: number;
  doctor_id?: number;
  branch: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus | string;
  source?: string;
  service_ids?: string[];
  queue_number?: number;
  exam_fee_paid?: boolean;
  exam_fee_amount?: number;
  total_fee?: number;
  paid_amount?: number;
  doctor_approved_at?: string;
  checkout_at?: string;
  notes?: string;
  created_by?: number;
}

export interface DbProduct {
  id: number;
  name: string;
  barcode?: string;
  purchase_price: number;
  sale_price: number;
  stock_quantity: number;
  unit: string;
  category?: string;
  description?: string;
  is_active: boolean;
}

export interface DbPayment {
  id?: number;
  appointment_id: number;
  amount: number;
  payment_method: string;
  note?: string;
}

export interface DbVisit {
  id?: number;
  patient_id: number;
  appointment_id?: number;
  visit_date: string;
  services?: string[];
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  prescription?: string;
  total_fee?: number;
  paid_amount?: number;
  start_time?: string;
  end_time?: string;
  doctor_id?: number;
  branch?: string;
  status?: string;
  total_amount?: number;
}

// ---- Patients ----
export async function createPatient(data: Omit<DbPatient, "id">) {
  const { data: result, error } = await supabase.from("patients").insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function searchPatients(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Build or() conditions for text fields
  const textConditions = [
    `name_ar.ilike.%${trimmed}%`,
    `id_number.ilike.%${trimmed}%`,
  ];

  // If numeric, also search by local_code
  if (/^\d+$/.test(trimmed)) {
    textConditions.push(`local_code.eq.${trimmed}`);
  }

  // Search across name, ID number, local_code
  const { data: textData, error: textError } = await supabase
    .from("patients")
    .select("*")
    .or(textConditions.join(","))
    .is("is_deleted", false)
    .limit(20);
  if (textError) throw textError;

  // Also search by phone number (JSONB contains)
  const { data: phoneData, error: phoneError } = await supabase
    .from("patients")
    .select("*")
    .contains("phones", [{ number: trimmed }])
    .is("is_deleted", false)
    .limit(20);
  if (phoneError) {
    // phone search may fail if phones column isn't typed as JSONB; ignore
    return textData || [];
  }

  // Merge & deduplicate results
  const seen = new Set<number>();
  const merged = [...(textData || []), ...(phoneData || [])].filter(p => {
    const key = p.id ?? p.local_code;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return merged.slice(0, 20);
}

export async function getPatientByLocalCode(code: number) {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("local_code", code)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getNextLocalCode() {
  const { data, error } = await supabase
    .from("patients")
    .select("local_code")
    .order("local_code", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.local_code || 1000) + 1;
}

// ---- Appointments ----
export async function getAppointmentsForDate(date: string) {
  const { data, error } = await supabase
    .from("appointments")
    .select(`*, patients!inner(id, local_code, name_ar, gender, phones, date_of_birth, governorate, city, neighborhood)`)
    .eq("appointment_date", date)
    .order("queue_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAppointmentById(id: number) {
  const { data, error } = await supabase
    .from("appointments")
    .select(`*, patients!inner(*)`)
    .eq("id", id)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function createAppointment(data: Omit<DbAppointment, "id">) {
  const { data: result, error } = await supabase.from("appointments").insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateAppointmentStatus(id: number, status: AppointmentStatus, extra?: Record<string, any>) {
  const { error } = await supabase.from("appointments").update({ status, ...extra }).eq("id", id);
  if (error) throw error;
}

export async function cancelOldPendingAppointments() {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .in("status", ["waiting_reception", "exam_fee_pending"])
    .lt("appointment_date", today);
  if (error) throw error;
}

export async function cancelOldConfirmedBookings() {
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("status", "confirmed")
    .lt("booking_date", today);
  if (error) throw error;
}

export async function getNextQueueNumber() {
  const { data, error } = await supabase
    .from("appointments")
    .select("queue_number")
    .order("queue_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.queue_number || 100) + 1;
}

// ---- Services ----
export async function getServices() {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data || [];
}

// ---- Products ----
export async function getProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function searchProducts(query: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .or(`name.ilike.%${query}%,barcode.ilike.%${query}%`)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function updateProductStock(id: number, quantity: number) {
  const { error } = await supabase.rpc("decrement_product_stock", { product_id: id, qty: quantity });
  if (error) {
    const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", id).single();
    if (product) {
      await supabase.from("products").update({ stock_quantity: Math.max(0, product.stock_quantity - quantity) }).eq("id", id);
    }
  }
}

// ---- Product Sales ----
export async function createProductSale(data: {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  visit_id?: number;
  appointment_id?: number;
  sold_by?: number;
  sale_type?: string;
  payment_method?: string;
}) {
  const { error } = await supabase.from("product_sales").insert(data);
  if (error) throw error;
}

// ---- Visits ----
export async function createVisit(data: Omit<DbVisit, "id">) {
  const { data: result, error } = await supabase.from("visits").insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateVisit(id: number, data: Partial<DbVisit>) {
  const { error } = await supabase.from("visits").update(data).eq("id", id);
  if (error) throw error;
}

export async function getVisitByAppointment(appointmentId: number) {
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .eq("appointment_id", appointmentId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---- Session Addons ----
export async function createSessionAddon(data: {
  visit_id: number;
  appointment_id?: number;
  item_type: "service" | "product";
  service_id?: number;
  product_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  added_by?: number;
  notes?: string;
}) {
  const { error } = await supabase.from("session_addons").insert(data);
  if (error) throw error;
}

export async function getSessionAddons(visitId: number) {
  const { data, error } = await supabase
    .from("session_addons")
    .select("*")
    .eq("visit_id", visitId);
  if (error) throw error;
  return data || [];
}

// ---- Injection Logs ----
export async function createInjectionLog(data: {
  visit_id: number;
  patient_id?: number;
  doctor_id?: number;
  zone: string;
  product_name: string;
  brand?: string;
  units?: number;
  notes?: string;
}) {
  const { error } = await supabase.from("injection_logs").insert(data);
  if (error) throw error;
}

export async function getInjectionLogs(visitId: number) {
  const { data, error } = await supabase
    .from("injection_logs")
    .select("*")
    .eq("visit_id", visitId)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

// ---- Laser Logs ----
export async function createLaserLog(data: {
  visit_id: number;
  patient_id?: number;
  doctor_id?: number;
  device: string;
  spot_size?: number;
  fluence?: number;
  pulse_width?: number;
  passes?: number;
  area?: string;
  notes?: string;
}) {
  const { error } = await supabase.from("laser_logs").insert(data);
  if (error) throw error;
}

export async function getLaserLogs(visitId: number) {
  const { data, error } = await supabase
    .from("laser_logs")
    .select("*")
    .eq("visit_id", visitId)
    .order("created_at");
  if (error) throw error;
  return data || [];
}

// ---- Payments ----
export async function createPayment(data: Omit<DbPayment, "id">) {
  const { error } = await supabase.from("payments").insert(data);
  if (error) throw error;
}

// ---- Bookings ----
export interface DbBooking {
  id?: number;
  name: string;
  phone?: string;
  booking_date: string;
  booking_time?: string;
  service?: string;
  notes?: string;
  status: string;
  created_by?: number;
  created_at?: string;
}

export async function getBookings(dateFrom?: string, dateTo?: string) {
  let query = supabase.from("bookings").select("*").order("booking_date", { ascending: true }).order("booking_time", { ascending: true });
  if (dateFrom) query = query.gte("booking_date", dateFrom);
  if (dateTo) query = query.lte("booking_date", dateTo);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createBooking(data: Omit<DbBooking, "id" | "created_at">) {
  const { data: result, error } = await supabase.from("bookings").insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function updateBooking(id: number, data: Partial<DbBooking>) {
  const { error } = await supabase.from("bookings").update(data).eq("id", id);
  if (error) throw error;
}

export async function deleteBooking(id: number) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

// ---- Subscription-like helpers (polling, since browser can't use service_role key) ----
let pollIdCounter = 0;
const polls = new Map<number, ReturnType<typeof setInterval>>();

const REALTIME_POLL_INTERVAL_MS = 1000;

function callWithRefresh(cb: (payload?: any) => void) {
  const id = ++pollIdCounter;
  const interval = setInterval(() => cb({ eventType: "UPDATE" }), REALTIME_POLL_INTERVAL_MS);
  polls.set(id, interval);
  return {
    unsubscribe() {
      clearInterval(interval);
      polls.delete(id);
    },
  };
}

export function subscribeToAppointments(
  callback: (payload?: any) => void,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filter?: { status?: string }
) {
  return callWithRefresh(callback);
}

export function subscribeToVisits(callback: (payload?: any) => void) {
  return callWithRefresh(callback);
}
