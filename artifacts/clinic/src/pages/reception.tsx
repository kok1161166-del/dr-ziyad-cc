import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Users, Clock, CheckCircle2, XCircle, UserPlus, FileText,
  DollarSign, Search, Phone, CreditCard,
  Receipt, Plus, Send, User, Hash, MessageSquare,
  Activity, Banknote, Eye, Filter, Calendar,
  Hourglass, AlertTriangle, AlertCircle, CheckCheck, UserCheck,
  BadgeCheck, ClipboardList, Stethoscope,
  Printer, Wallet, ShoppingCart, Package, Barcode,
  Settings, Bell, BellRing, Trash2, Minus, Plus as PlusIcon,
  ChevronDown, ChevronUp, ExternalLink, RefreshCw,
  ArrowLeftFromLine, ArrowRightFromLine, Loader2,
  BookUser, ChevronLeft, ChevronRight, MoreHorizontal,
  BarChart3, Tag, UserCircle, ShieldCheck,
} from "lucide-react";
import {
  getAppointmentsForDate, createAppointment, updateAppointmentStatus, getNextQueueNumber, getNextLocalCode,
  createPatient, searchPatients,
  getProducts, searchProducts, updateProductStock, createProductSale,
  getBookings, createBooking, updateBooking, deleteBooking,
  subscribeToAppointments, cancelOldPendingAppointments,
} from "@/lib/db";
import type { DbPatient, DbProduct, DbBooking, AppointmentStatus } from "@/lib/db";

// ---- Types ----

type PaymentMethod = "cash" | "card" | "partial";

interface AppointmentWithPatient {
  id: number;
  patient_id: number;
  branch: string;
  appointment_date: string;
  appointment_time: string;
  status: AppointmentStatus;
  source: string | null;
  service_ids: string[] | null;
  queue_number: number | null;
  exam_fee_paid: boolean | null;
  exam_fee_amount: number | null;
  total_fee: number | null;
  paid_amount: number | null;
  notes: string | null;
  patients: {
    id: number;
    local_code: number;
    name_ar: string;
    gender: string;
    phones: { number: string; owner?: string }[] | null;
    governorate: string | null;
    city: string | null;
    neighborhood: string | null;
  } | null;
}

interface CartItem {
  productId: number;
  name: string;
  barcode: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

interface LocalPaymentRecord {
  id: number;
  date: string;
  patientName: string;
  items: string;
  amount: number;
  method: PaymentMethod;
  status: "paid" | "pending" | "partial";
}

interface ServiceItem {
  id: number;
  name: string;
}

// ---- Constants ----

const sourceOptions = [
  "إنستغرام", "فيسبوك", "تيك توك", "توصية من مريض", "جوجل", "زيارة مباشرة", "إعلان", "آخر",
];

const phoneOwnerOptions = ["المريض", "الأب", "الأم", "الزوج", "الزوجة", "الأخ", "الأخت", "ابن", "ابنة", "صديق", "قريب"];
const maritalOptions = ["أعزب/عزباء", "متزوج/متزوجة", "مطلق/مطلقة", "أرمل/أرملة"];
const insuranceOptions = ["تأمين خاص", "تأمين حكومي", "بدون تأمين", "أونروا"];
const referralOptions = ["طبيب عام", "طبيب تجميل", "طبيب جلدية", "صيدلية", "مستشفى", "مركز تجميل آخر", "إنستغرام", "فيسبوك", "موقع العيادة", "زيارة سابقة", "آخر"];
const governorateList = ["شمال غزة", "غزة", "دير البلح (المنطقة الوسطى)", "خان يونس", "رفح"];

const governorateCities: Record<string, string[]> = {
  "شمال غزة": ["أم النصر (القرية البدوية)", "بيت لاهيا", "بيت حانون", "جباليا", "مخيم جباليا"],
  "غزة": ["مدينة غزة", "الزهراء", "المغراقة (أبو مدين)", "جحر الديك", "مخيم الشاطئ"],
  "دير البلح (المنطقة الوسطى)": ["دير البلح", "مخيم دير البلح", "النصيرات", "مخيم النصيرات", "البريج", "مخيم البريج", "المغازي", "مخيم المغازي", "الزوايدة", "المصدر", "وادي السلقا"],
  "خان يونس": ["خان يونس", "مخيم خان يونس", "بني سهيلا", "القرارة", "عبسان الكبيرة", "عبسان الجديدة", "خزاعة", "الفخاري"],
  "رفح": ["رفح", "مخيم رفح", "النصر (البيوك)", "شوكة الصوفي"],
};

const gazaNeighborhoods = [
  "حي الرمال (الشمالي والجنوبي)", "حي الشجاعية", "حي الزيتون", "حي التفاح", "حي الدرج",
  "حي الصبرة", "حي الشيخ رضوان", "حي النصر", "حي تل الهوى (تل الإسلام)", "حي الشيخ عجلين",
  "حي الشعف", "حي التركمان", "حي الجديدة", "حي عسقولة", "حي المحطة",
];

const defaultServices: ServiceItem[] = [
  { id: 1, name: "استشارة" },
  { id: 2, name: "تنظيف بشرة عميق" },
  { id: 3, name: "ليزر إزالة شعر" },
  { id: 4, name: "ميزوثيرابي للوجه" },
  { id: 5, name: "فيلر شفايف" },
  { id: 6, name: "بوتوكس جبهة" },
  { id: 7, name: "تقشير كيميائي" },
  { id: 8, name: "هيدرا فيشل" },
  { id: 9, name: "بلازما للشعر" },
  { id: 10, name: "نضارة بشرة" },
];

const tabs = [
  { id: "queue", label: "الطابور", icon: Users },
  { id: "register", label: "تسجيل مريض", icon: UserPlus },
  { id: "bookings", label: "الحجوزات", icon: Calendar },
  { id: "pos", label: "الفواتير والمبيعات", icon: ShoppingCart },
  { id: "settings", label: "إعدادات الكشفية", icon: Settings },
] as const;

const queueStatusConfig: Record<AppointmentStatus, { label: string; className: string; icon: React.ReactNode; animate?: boolean }> = {
  waiting_reception: {
    label: "منتظر", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Hourglass className="h-3 w-3" />,
  },
  exam_fee_pending: {
    label: "بانتظار دفع الكشفية", className: "bg-orange-50 text-orange-700 border-orange-200", icon: <Wallet className="h-3 w-3" />,
  },
  waiting_doctor_approval: {
    label: "بانتظار موافقة الدكتور", className: "bg-purple-50 text-purple-700 border-purple-200 animate-pulse", icon: <Stethoscope className="h-3 w-3" />, animate: true,
  },
  doctor_approved: {
    label: "تمت الموافقة", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <BadgeCheck className="h-3 w-3" />,
  },
  in_examination: {
    label: "عند الطبيب", className: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <Stethoscope className="h-3 w-3" />,
  },
  exam_completed: {
    label: "تم الكشف", className: "bg-teal-50 text-teal-700 border-teal-200", icon: <CheckCheck className="h-3 w-3" />,
  },
  checkout_pending: {
    label: "بانتظار المحاسبة", className: "bg-rose-50 text-rose-700 border-rose-200", icon: <DollarSign className="h-3 w-3" />,
  },
  completed: {
    label: "مكتمل", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    label: "ملغي", className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" />,
  },
};

// ---- Helpers ----

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getPatientPhone(phones: { number: string; owner?: string }[] | null): string {
  if (!phones || phones.length === 0) return "—";
  return phones[0].number;
}

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("");
}

function getStatusBorderColor(status: AppointmentStatus | string | null | undefined): string {
  const map: Record<string, string> = {
    waiting_reception: "border-r-amber-400",
    exam_fee_pending: "border-r-orange-400",
    waiting_doctor_approval: "border-r-purple-400",
    doctor_approved: "border-r-blue-400",
    in_examination: "border-r-indigo-400",
    exam_completed: "border-r-teal-400",
    checkout_pending: "border-r-rose-400",
    completed: "border-r-emerald-400",
    cancelled: "border-r-red-400",
  };
  return (status && map[status]) || "border-r-gray-400";
}

function getMethodIcon(method: PaymentMethod) {
  switch (method) {
    case "cash": return <Banknote className="h-3.5 w-3.5" />;
    case "card": return <CreditCard className="h-3.5 w-3.5" />;
    case "partial": return <Wallet className="h-3.5 w-3.5" />;
  }
}

function getMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "cash": return "نقدي";
    case "card": return "بطاقة";
    case "partial": return "دفعة جزئية";
  }
}

// ---- Main Component ----

export default function Reception() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("queue");

  // ---- Queue State ----
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<AppointmentStatus | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<DbBooking | null>(null);
  const [newEntryService, setNewEntryService] = useState("");
  const [newEntryNotes, setNewEntryNotes] = useState("");
  const [selectedQueuePatient, setSelectedQueuePatient] = useState<DbPatient | null>(null);
  const [queuePatientSearch, setQueuePatientSearch] = useState("");
  const [queuePatientResults, setQueuePatientResults] = useState<DbPatient[]>([]);
  const [queuePatientsLoading, setQueuePatientsLoading] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  // ---- Registration State ----
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPhoneOwner, setRegPhoneOwner] = useState("");
  const [regPhone2, setRegPhone2] = useState("");
  const [regHomePhone, setRegHomePhone] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regGender, setRegGender] = useState("female");
  const [regDob, setRegDob] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regNeighborhood, setRegNeighborhood] = useState("");
  const [regGovernorate, setRegGovernorate] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");
  const [regIdNumber, setRegIdNumber] = useState("");
  const [regMarital, setRegMarital] = useState("");
  const [regNationality, setRegNationality] = useState("فلسطيني");
  const [regOccupation, setRegOccupation] = useState("");
  const [regInsurance, setRegInsurance] = useState("");
  const [regSource, setRegSource] = useState("");
  const [regReferral, setRegReferral] = useState("");
  const [regNotes, setRegNotes] = useState("");
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regPatientCode, setRegPatientCode] = useState("");
  const [regPatientName, setRegPatientName] = useState("");

  // ---- POS State ----
  const [posPatient, setPosPatient] = useState("");
  const [posPatientSearch, setPosPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<DbPatient[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<DbProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [partialAmount, setPartialAmount] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);
  const [sessionPayments, setSessionPayments] = useState<LocalPaymentRecord[]>([]);
  const [nextPaymentId, setNextPaymentId] = useState(1);

  // ---- Settings State ----
  const [examFee, setExamFee] = useState("150");
  const [autoClearQueue, setAutoClearQueue] = useState(() => localStorage.getItem("autoClearQueue") !== "false");
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ---- Bookings State ----
  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<"today" | "tomorrow" | "week" | "month" | "all">("today");
  const [todayBookings, setTodayBookings] = useState<DbBooking[]>([]);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookingSelectedPatient, setBookingSelectedPatient] = useState<DbPatient | null>(null);
  const [bookingPatientSearch, setBookingPatientSearch] = useState("");
  const [bookingPatientResults, setBookingPatientResults] = useState<DbPatient[]>([]);
  const [bookingPatientsLoading, setBookingPatientsLoading] = useState(false);
  const [bookingDate, setBookingDate] = useState(todayStr());
  const [bookingTime, setBookingTime] = useState("");
  const [bookingService, setBookingService] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  // ---- Sound notification ref ----
  const prevWaitingCount = useRef(0);

  // ---- Fetch Appointments ----

  const fetchAppointments = useCallback(async (silent = false) => {
    if (!silent) setQueueLoading(true);
    setQueueError(null);
    try {
      const data = await getAppointmentsForDate(todayStr());
      setAppointments(data as unknown as AppointmentWithPatient[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل تحميل المواعيد";
      setQueueError(message);
      setAppointments([]);
    } finally {
      if (!silent) setQueueLoading(false);
    }
  }, []);

  // ---- Fetch Bookings ----

  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      let from: string | undefined;
      let to: string | undefined;
      const today = todayStr();
      const dt = new Date();
      if (bookingFilter === "today") {
        from = today; to = today;
      } else if (bookingFilter === "tomorrow") {
        const tom = new Date(dt); tom.setDate(tom.getDate() + 1);
        const tomStr = tom.toISOString().slice(0, 10);
        from = tomStr; to = tomStr;
      } else if (bookingFilter === "week") {
        from = today;
        const week = new Date(dt); week.setDate(week.getDate() + 7);
        to = week.toISOString().slice(0, 10);
      } else if (bookingFilter === "month") {
        from = today;
        const month = new Date(dt); month.setMonth(month.getMonth() + 1);
        to = month.toISOString().slice(0, 10);
      }
      const data = await getBookings(from, to);
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingFilter]);

  // Fetch today's bookings for queue section display
  const fetchTodayBookings = useCallback(async () => {
    try {
      const data = await getBookings(todayStr(), todayStr());
      setTodayBookings(data);
    } catch {
      setTodayBookings([]);
    }
  }, []);

  // ---- Effects ----

  useEffect(() => {
    fetchAppointments();
    fetchBookings();
    fetchTodayBookings();
    if (autoClearQueue) {
      cancelOldPendingAppointments().catch(() => {});
    }
    const channel = subscribeToAppointments(() => {
      fetchAppointments(true);
      fetchBookings();
      fetchTodayBookings();
    });
    return () => {
      channel.unsubscribe();
    };
  }, [fetchAppointments, fetchBookings, fetchTodayBookings, autoClearQueue]);

  useEffect(() => {
    getProducts()
      .then(data => { setProducts(data); setProductResults(data); })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  useEffect(() => {
    if (!posPatientSearch.trim()) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchPatients(posPatientSearch.trim());
        setPatientResults(results);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [posPatientSearch]);

  useEffect(() => {
    if (!queuePatientSearch.trim()) {
      setQueuePatientResults([]);
      return;
    }
    setQueuePatientsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPatients(queuePatientSearch.trim());
        setQueuePatientResults(results);
      } catch (err) {
        setQueuePatientResults([]);
        setQueueError(err instanceof Error ? err.message : "فشل البحث");
      } finally {
        setQueuePatientsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [queuePatientSearch]);

  // Bookings patient search
  useEffect(() => {
    if (!bookingPatientSearch.trim()) {
      setBookingPatientResults([]);
      return;
    }
    setBookingPatientsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchPatients(bookingPatientSearch.trim());
        setBookingPatientResults(results);
      } catch {
        setBookingPatientResults([]);
      } finally {
        setBookingPatientsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [bookingPatientSearch]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setProductResults(products);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchProducts(productSearch.trim());
        setProductResults(results);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, products]);

  useEffect(() => {
    const handleInteraction = () => setUserInteracted(true);
    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });
    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);

  useEffect(() => {
    const count = appointments.filter(a => a.status === "waiting_doctor_approval").length;
    if (count > prevWaitingCount.current && userInteracted) {
      const audio = new Audio("/ding.mp3");
      audio.play().catch(() => {
        // audio playback blocked until user interacts
      });
    }
    prevWaitingCount.current = count;
  }, [appointments, userInteracted]);

  // ---- Derived State ----

  const waitingDoctorCount = useMemo(
    () => appointments.filter(a => a.status === "waiting_doctor_approval").length,
    [appointments],
  );

  const statCards = useMemo(() => {
    return {
      waiting_reception: appointments.filter(e => e.status === "waiting_reception").length,
      exam_fee_pending: appointments.filter(e => e.status === "exam_fee_pending").length,
      waiting_doctor_approval: appointments.filter(e => e.status === "waiting_doctor_approval").length,
      in_examination: appointments.filter(e => e.status === "in_examination" || e.status === "doctor_approved").length,
      checkout_pending: appointments.filter(e => e.status === "checkout_pending" || e.status === "exam_completed").length,
      completed: appointments.filter(e => e.status === "completed").length,
    };
  }, [appointments]);

  const filteredQueue = useMemo(() => {
    if (queueFilter === "all") return appointments;
    return appointments.filter(e => e.status === queueFilter);
  }, [appointments, queueFilter]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cart]);

  const cartItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // ---- Queue Handlers ----

  const [addQueueError, setAddQueueError] = useState<string | null>(null);

  const resetAddQueueModal = useCallback(() => {
    setShowAddModal(false);
    setSelectedQueuePatient(null);
    setQueuePatientSearch("");
    setQueuePatientResults([]);
    setNewEntryService("");
    setNewEntryNotes("");
    setAddQueueError(null);
    setPendingBooking(null);
  }, []);

  const handleAddToQueue = useCallback(async () => {
    if (!selectedQueuePatient?.id || !newEntryService) return;
    setAddQueueError(null);
    try {
      const queueNum = await getNextQueueNumber();
      await createAppointment({
        patient_id: selectedQueuePatient.id,
        branch: "فرع غزة",
        appointment_date: todayStr(),
        appointment_time: new Date().toTimeString().slice(0, 8),
        status: "waiting_reception",
        service_ids: [newEntryService],
        queue_number: queueNum,
        notes: newEntryNotes.trim() || undefined,
      });
      await fetchAppointments();
      // If from booking, mark booking as arrived
      if (pendingBooking) {
        await updateBooking(pendingBooking.id!, { status: "arrived" });
        fetchTodayBookings();
      }
      resetAddQueueModal();
    } catch (err) {
      setAddQueueError(err instanceof Error ? err.message : "فشل إضافة المريض إلى الطابور");
    }
  }, [selectedQueuePatient, newEntryService, newEntryNotes, fetchAppointments, fetchTodayBookings, resetAddQueueModal, pendingBooking]);

  const handleQueueStatus = useCallback(async (id: number, status: AppointmentStatus, extra?: Record<string, unknown>) => {
    try {
      await updateAppointmentStatus(id, status, extra);
      await fetchAppointments();
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : "فشل تحديث الحالة");
    }
  }, [fetchAppointments]);

  // ---- Registration Handlers ----

  const handleRegisterPatient = useCallback(async () => {
    if (!regName.trim() || !regPhone.trim()) return;
    setRegSubmitting(true);
    setRegError(null);
    try {
      const localCode = await getNextLocalCode();
      const phones: { number: string; owner?: string }[] = [{ number: regPhone.trim() }];
      if (regPhoneOwner) phones[0].owner = regPhoneOwner;
      if (regPhone2.trim()) phones.push({ number: regPhone2.trim() });

      const newPatient = await createPatient({
        local_code: localCode,
        name_ar: regName.trim(),
        gender: regGender,
        date_of_birth: regDob || undefined,
        phones,
        home_phone: regHomePhone.trim() || undefined,
        email: regEmail.trim() || undefined,
        marital_status: regMarital || undefined,
        nationality: regNationality || undefined,
        address: regAddress.trim() || undefined,
        governorate: regGovernorate || undefined,
        city: regCity || undefined,
        neighborhood: regNeighborhood || undefined,
        occupation: regOccupation.trim() || undefined,
        insurance_status: regInsurance || undefined,
        source: regSource || undefined,
        referred_by: regReferral || undefined,
        notes: regNotes.trim() || undefined,
      });

      const queueNum = await getNextQueueNumber();
      await createAppointment({
        patient_id: newPatient.id,
        branch: "فرع غزة",
        appointment_date: todayStr(),
        appointment_time: new Date().toTimeString().slice(0, 8),
        status: "waiting_reception",
        source: regSource || undefined,
        service_ids: ["استشارة"],
        queue_number: queueNum,
        notes: regNotes.trim() || undefined,
      });

      setRegPatientCode(localCode.toString());
      setRegPatientName(regName.trim());
      setRegSubmitted(true);
      await fetchAppointments();
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل تسجيل المريض";
      setRegError(message);
    } finally {
      setRegSubmitting(false);
    }
  }, [
    regName, regGender, regDob, regPhone, regPhoneOwner, regPhone2,
    regHomePhone, regEmail, regAddress, regCity, regGovernorate,
    regNeighborhood, regMarital, regNationality, regOccupation,
    regInsurance, regSource, regReferral, regNotes, fetchAppointments,
  ]);

  const handleResetRegistration = useCallback(() => {
    setRegName("");
    setRegPhone("");
    setRegPhoneOwner("");
    setRegPhone2("");
    setRegHomePhone("");
    setRegEmail("");
    setRegGender("female");
    setRegDob("");
    setRegAddress("");
    setRegCity("");
    setRegGovernorate("");
    setRegIdNumber("");
    setRegMarital("");
    setRegNationality("فلسطيني");
    setRegOccupation("");
    setRegInsurance("");
    setRegSource("");
    setRegReferral("");
    setRegNotes("");
    setRegSubmitted(false);
    setRegError(null);
  }, []);

  // ---- POS Handlers ----

  const handleAddProductToCart = useCallback((product: DbProduct) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map(c =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        barcode: product.barcode || "",
        unitPrice: product.sale_price,
        quantity: 1,
        stock: product.stock_quantity,
      }];
    });
  }, []);

  const handleCartQuantity = useCallback((productId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.stock) return c;
      return { ...c, quantity: newQty };
    }));
  }, []);

  const handleRemoveFromCart = useCallback((productId: number) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  }, []);

  const handleIssueReceipt = useCallback(async () => {
    if (cart.length === 0) return;
    setCheckoutProcessing(true);
    try {
      for (const item of cart) {
        await createProductSale({
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.unitPrice * item.quantity,
          payment_method: paymentMethod,
        });
        await updateProductStock(item.productId, item.quantity);
      }

      const items = cart.map(c => `${c.name}×${c.quantity}`).join("، ");
      const amount = paymentMethod === "partial" && partialAmount
        ? parseFloat(partialAmount) || cartTotal
        : cartTotal;

      const payment: LocalPaymentRecord = {
        id: nextPaymentId,
        date: todayStr(),
        patientName: posPatient || "عميل خارجي",
        items,
        amount,
        method: paymentMethod,
        status: paymentMethod === "partial" ? "partial" : "paid",
      };
      setSessionPayments(prev => [payment, ...prev]);
      setNextPaymentId(prev => prev + 1);
      setCart([]);
      setPosPatient("");
      setPartialAmount("");
      setShowReceipt(true);
    } catch (err) {
      console.error("فشل إتمام عملية البيع:", err);
    } finally {
      setCheckoutProcessing(false);
    }
  }, [cart, cartTotal, paymentMethod, partialAmount, posPatient, nextPaymentId]);

  // ---- Settings Handlers ----

  const handleSaveExamFee = useCallback(() => {
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  }, []);

  // ---- Render: Stat Cards ----

  function renderStatCards() {
    const stats = [
      { key: "waiting_reception" as const, label: "منتظرون", value: statCards.waiting_reception, color: "amber", icon: Hourglass },
      { key: "exam_fee_pending" as const, label: "قيد الكشفية", value: statCards.exam_fee_pending, color: "orange", icon: Wallet },
      { key: "waiting_doctor_approval" as const, label: "بانتظار الموافقة", value: statCards.waiting_doctor_approval, color: "purple", icon: Stethoscope },
      { key: "in_examination" as const, label: "عند الطبيب", value: statCards.in_examination, color: "indigo", icon: Activity },
      { key: "checkout_pending" as const, label: "بانتظار المحاسبة", value: statCards.checkout_pending, color: "rose", icon: DollarSign },
      { key: "completed" as const, label: "مكتمل", value: statCards.completed, color: "emerald", icon: CheckCircle2 },
    ];
    const colorClasses: Record<string, { bg: string; text: string; ring: string }> = {
      amber: { bg: "bg-amber-100", text: "text-amber-600", ring: "ring-amber-400" },
      orange: { bg: "bg-orange-100", text: "text-orange-600", ring: "ring-orange-400" },
      purple: { bg: "bg-purple-100", text: "text-purple-600", ring: "ring-purple-400" },
      indigo: { bg: "bg-indigo-100", text: "text-indigo-600", ring: "ring-indigo-400" },
      rose: { bg: "bg-rose-100", text: "text-rose-600", ring: "ring-rose-400" },
      emerald: { bg: "bg-emerald-100", text: "text-emerald-600", ring: "ring-emerald-400" },
    };
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => {
          const cc = colorClasses[s.color];
          const Icon = s.icon;
          const isAnimated = s.key === "waiting_doctor_approval" && s.value > 0;
          return (
            <Card key={s.key} className={cn(
              "shadow-sm hover:shadow-md transition-all duration-300 border-t-2",
              `border-t-${s.color}-400/60`,
              isAnimated && "animate-pulse ring-2 ring-purple-300/40",
            )}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={cn("p-2.5 rounded-full shrink-0", cc.bg)}>
                  <Icon className={cn("h-5 w-5", cc.text)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                  <p className={cn("text-xl font-bold tabular-nums", cc.text)}>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // ---- Render: Queue Filters ----

  function renderQueueFilters() {
    const statuses: { value: AppointmentStatus | "all"; label: string }[] = [
      { value: "all", label: "الكل" },
      { value: "waiting_reception", label: "منتظر" },
      { value: "exam_fee_pending", label: "الكشفية" },
      { value: "waiting_doctor_approval", label: "موافقة د." },
      { value: "doctor_approved", label: "موافقة" },
      { value: "in_examination", label: "عند الطبيب" },
      { value: "exam_completed", label: "تم الكشف" },
      { value: "checkout_pending", label: "محاسبة" },
      { value: "completed", label: "مكتمل" },
      { value: "cancelled", label: "ملغي" },
    ];
    return (
      <div className="flex flex-wrap gap-1.5">
        {statuses.map(st => (
          <button
            key={st.value}
            onClick={() => setQueueFilter(st.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              queueFilter === st.value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-secondary/40 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            {st.label}
          </button>
        ))}
      </div>
    );
  }

  // ---- Render: Queue Card ----

  function renderQueueCard(entry: AppointmentWithPatient) {
    const config = queueStatusConfig[entry.status] ?? {
      label: entry.status || "غير معروف",
      className: "bg-gray-50 text-gray-700 border-gray-200",
      icon: <AlertCircle className="h-3 w-3" />,
    };
    const patientName = entry.patients?.name_ar || "غير معروف";
    const phone = getPatientPhone(entry.patients?.phones || null);
    const serviceLabel = entry.service_ids?.[0] || "استشارة";
    const queueNumber = entry.queue_number || 0;

    const showActions = entry.status !== "completed" && entry.status !== "cancelled";
    return (
      <Card
        key={entry.id}
        className={cn(
          "hover:shadow-lg transition-all duration-200 border-r-4 group",
          getStatusBorderColor(entry.status),
          (entry.status === "completed" || entry.status === "cancelled") && "opacity-70",
          entry.status === "checkout_pending" && "ring-1 ring-rose-300/50 bg-rose-50/20",
          entry.status === "waiting_doctor_approval" && "bg-purple-50/10",
        )}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0 shadow-sm",
                entry.status === "waiting_reception" && "bg-amber-100 text-amber-700",
                entry.status === "exam_fee_pending" && "bg-orange-100 text-orange-700",
                entry.status === "waiting_doctor_approval" && "bg-purple-100 text-purple-700",
                entry.status === "doctor_approved" && "bg-blue-100 text-blue-700",
                entry.status === "in_examination" && "bg-indigo-100 text-indigo-700",
                entry.status === "exam_completed" && "bg-teal-100 text-teal-700",
                entry.status === "checkout_pending" && "bg-rose-100 text-rose-700",
                entry.status === "completed" && "bg-emerald-100 text-emerald-700",
                entry.status === "cancelled" && "bg-red-100 text-red-700",
              )}>
                {queueNumber}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base">{patientName}</span>
                  <Badge variant="outline" className={cn("gap-1 text-xs border", config.className)}>
                    {config.icon}
                    {config.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {serviceLabel}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 bg-muted/30 rounded px-2 py-0.5 w-fit">
                    <MessageSquare className="h-2.5 w-2.5" />
                    {entry.notes}
                  </p>
                )}
              </div>
            </div>
            {showActions && (
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                {entry.status === "waiting_reception" && (
                  <>
                    <Button size="sm" className="h-8 text-xs gap-1 bg-amber-600 hover:bg-amber-700 shadow-sm"
                      onClick={() => handleQueueStatus(entry.id, "exam_fee_pending")}>
                      <Wallet className="h-3 w-3" />
                      دفع الكشفية
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                      onClick={() => handleQueueStatus(entry.id, "cancelled")}>
                      <ChevronLeft className="h-3 w-3" />
                      تأجيل
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleQueueStatus(entry.id, "cancelled")}>
                      <XCircle className="h-3 w-3" />
                      إلغاء
                    </Button>
                  </>
                )}
                {entry.status === "exam_fee_pending" && (
                  <Button size="sm" className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 shadow-sm"
                    onClick={() => handleQueueStatus(entry.id, "waiting_doctor_approval")}>
                    <Send className="h-3 w-3" />
                    طلب دخول للطبيب
                  </Button>
                )}
                {entry.status === "waiting_doctor_approval" && (
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => handleQueueStatus(entry.id, "cancelled")}>
                    <XCircle className="h-3 w-3" />
                    إلغاء الطلب
                  </Button>
                )}
                {entry.status === "doctor_approved" && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                    <ArrowRightFromLine className="h-3 w-3 ml-1" />
                    ينتقل للكشف
                  </Badge>
                )}
                {entry.status === "exam_completed" && (
                  <Button size="sm" className="h-8 text-xs gap-1 bg-rose-600 hover:bg-rose-700 shadow-sm"
                    onClick={() => handleQueueStatus(entry.id, "checkout_pending")}>
                    <DollarSign className="h-3 w-3" />
                    تسوية الحساب
                  </Button>
                )}
                {entry.status === "checkout_pending" && (
                  <Button size="sm" className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                    onClick={() => handleQueueStatus(entry.id, "completed")}>
                    <Printer className="h-3 w-3" />
                    إتمام الدفع
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- Render: Queue Section ----

  function renderQueueSection() {
    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        {renderStatCards()}

        {/* Today's Bookings integrated in queue */}
        {todayBookings.filter(b => b.status !== "cancelled").length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
              حجوزات اليوم — {todayBookings.filter(b => b.status !== "cancelled").length}
            </div>
            {todayBookings.filter(b => b.status !== "cancelled").map(b => (
              <Card key={b.id} className="border-blue-200/50 border-r-4 border-r-blue-400 bg-gradient-to-l from-blue-50/30 to-background dark:from-blue-950/10 hover:shadow-md transition-all">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0 shadow-sm bg-blue-100 text-blue-700">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{b.name}</span>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs gap-1">
                            <Calendar className="h-3 w-3" />
                            حجز
                          </Badge>
                          {b.status === "arrived" && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs gap-1">
                              <UserCheck className="h-3 w-3" />
                              وصل
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          {b.booking_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {b.booking_time}
                            </span>
                          )}
                          {b.phone && (
                            <span className="flex items-center gap-1" dir="ltr">
                              <Phone className="h-3 w-3" />
                              {b.phone}
                            </span>
                          )}
                          {b.service && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {b.service}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {b.status === "confirmed" && (
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 shadow-sm"
                          onClick={() => {
                            // Pre-fill the add-to-queue modal with the booking name
                            setQueuePatientSearch(b.name);
                            setPendingBooking(b);
                            setShowAddModal(true);
                          }}
                        >
                          <UserCheck className="h-3 w-3" />
                          وصل
                        </Button>
                      )}
                      {b.status === "arrived" && (
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" disabled>
                          <CheckCircle2 className="h-3 w-3" />
                          تم القدوم
                        </Button>
                      )}
                    </div>
                  </div>
                  {b.notes && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1 bg-muted/30 rounded px-2 py-0.5 w-fit">
                      <MessageSquare className="h-2.5 w-2.5" />
                      {b.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              قائمة الطابور
              <Badge variant="secondary" className="mr-1 text-xs">{appointments.length}</Badge>
            </h2>
            <div className="relative">
              <BellRing className={cn(
                "h-5 w-5 text-muted-foreground cursor-pointer hover:text-purple-600 transition-colors",
                waitingDoctorCount > 0 && "text-purple-600 animate-pulse",
              )} />
              {waitingDoctorCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
                  {waitingDoctorCount}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={showAddModal} onOpenChange={open => open ? setShowAddModal(true) : resetAddQueueModal()}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm">
                  <Plus className="h-4 w-4" />
                  إضافة للطابور
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    إضافة مريض مسجل إلى الطابور
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {!selectedQueuePatient ? (
                    <div className="space-y-2">
                      <Label>البحث عن مريض مسجل <span className="text-red-500">*</span></Label>
                      <Input
                        value={queuePatientSearch}
                        onChange={e => setQueuePatientSearch(e.target.value)}
                        placeholder="اكتب اسم المريض أو رقم الهاتف..."
                      />
                      {queuePatientsLoading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري البحث...
                        </div>
                      )}
                      {queuePatientSearch.trim() && !queuePatientsLoading && queuePatientResults.length === 0 && (
                        <p className="text-sm text-muted-foreground py-2">لا يوجد مريض مطابق. سجّل مريضاً أولاً من تبويب "تسجيل مريض".</p>
                      )}
                      {queuePatientResults.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                          {queuePatientResults.map(patient => (
                            <button
                              key={patient.id ?? patient.local_code}
                              type="button"
                              className="w-full text-right px-3 py-2 hover:bg-muted transition-colors flex flex-col gap-0.5"
                              onClick={() => {
                                setSelectedQueuePatient(patient);
                                setQueuePatientSearch("");
                                setQueuePatientResults([]);
                              }}
                            >
                              <span className="font-medium text-sm">{patient.name_ar}</span>
                              <span className="text-xs text-muted-foreground">{patient.phones?.[0]?.number || "—"}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-muted/40 border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">الاسم</p>
                            <p className="font-medium">{selectedQueuePatient.name_ar}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedQueuePatient(null)}
                          >
                            تغيير
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                            <p>{selectedQueuePatient.phones?.[0]?.number || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">الجنس</p>
                            <p>{selectedQueuePatient.gender === "male" ? "ذكر" : selectedQueuePatient.gender === "female" ? "أنثى" : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">المحافظة</p>
                            <p>{selectedQueuePatient.governorate || "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">المدينة</p>
                            <p>{selectedQueuePatient.city || "—"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>نوع الخدمة <span className="text-red-500">*</span></Label>
                        <Select value={newEntryService} onValueChange={setNewEntryService}>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الخدمة..." />
                          </SelectTrigger>
                          <SelectContent>
                            {defaultServices.map(s => (
                              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>ملاحظات</Label>
                        <Textarea value={newEntryNotes} onChange={e => setNewEntryNotes(e.target.value)} placeholder="أي ملاحظات إضافية..." className="resize-none" />
                      </div>
                    </div>
                  )}
                  {addQueueError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {addQueueError}
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={resetAddQueueModal}>إلغاء</Button>
                    <Button onClick={handleAddToQueue} disabled={!selectedQueuePatient || !newEntryService}>
                      إضافة للطابور
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {renderQueueFilters()}
        <div className="space-y-2.5">
          {queueLoading ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-600" />
                <p className="font-medium">جاري تحميل قائمة الطابور...</p>
              </CardContent>
            </Card>
          ) : queueError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mb-4 text-red-500" />
                <p className="font-medium text-red-600">حدث خطأ أثناء التحميل</p>
                <p className="text-sm mt-1">{queueError}</p>
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => fetchAppointments()}>
                  <RefreshCw className="h-3 w-3" />
                  إعادة المحاولة
                </Button>
              </CardContent>
            </Card>
          ) : filteredQueue.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="h-16 w-16 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 opacity-30" />
                </div>
                <p className="font-medium">لا يوجد مرضى في هذه الفئة</p>
                <p className="text-sm mt-1">حاول تغيير فلتر البحث</p>
              </CardContent>
            </Card>
          ) : (
            filteredQueue.map(renderQueueCard)
          )}
        </div>
      </div>
    );
  }

  // ---- Render: Registration Section ----

  function renderRegistrationSection() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                تسجيل مريض جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              {regSubmitted && regPatientCode && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">تم تسجيل المريض بنجاح</p>
                    <p className="text-sm text-emerald-600">
                      تم إنشاء ملف للمريض {regPatientName} بالكود {regPatientCode}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    المعلومات الأساسية
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>الاسم الكامل <span className="text-red-500">*</span></Label>
                      <Input value={regName} onChange={e => setRegName(e.target.value)} placeholder="الاسم ثلاثي" />
                    </div>
                    <div className="space-y-2">
                      <Label>الجنس</Label>
                      <Select value={regGender} onValueChange={setRegGender}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="female">أنثى</SelectItem>
                          <SelectItem value="male">ذكر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الميلاد</Label>
                      <Input type="date" value={regDob} onChange={e => setRegDob(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الهوية / الإقامة</Label>
                      <Input dir="ltr" value={regIdNumber} onChange={e => setRegIdNumber(e.target.value)} placeholder="رقم الهوية" />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    معلومات الاتصال
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهاتف <span className="text-red-500">*</span></Label>
                      <Input dir="ltr" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="059XXXXXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label>المالك (صاحب الرقم)</Label>
                      <Select value={regPhoneOwner} onValueChange={setRegPhoneOwner}>
                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          {phoneOwnerOptions.map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>رقم إضافي</Label>
                      <Input dir="ltr" value={regPhone2} onChange={e => setRegPhone2(e.target.value)} placeholder="رقم آخر" />
                    </div>
                    <div className="space-y-2">
                      <Label>هاتف المنزل</Label>
                      <Input dir="ltr" value={regHomePhone} onChange={e => setRegHomePhone(e.target.value)} placeholder="08XXXXXXXX" />
                    </div>
                    <div className="space-y-2">
                      <Label>البريد الإلكتروني</Label>
                      <Input dir="ltr" type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="email@example.com" />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    العنوان
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المحافظة</Label>
                      <Select value={regGovernorate} onValueChange={v => { setRegGovernorate(v); setRegCity(""); setRegNeighborhood(""); setCitySearch(""); setNeighborhoodSearch(""); }}>
                        <SelectTrigger><SelectValue placeholder="اختر المحافظة..." /></SelectTrigger>
                        <SelectContent>
                          {governorateList.map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>المدينة / المنطقة</Label>
                      <Select value={regCity} onValueChange={v => { setRegCity(v); setRegNeighborhood(""); }} disabled={!regGovernorate}>
                        <SelectTrigger><SelectValue placeholder={regGovernorate ? "اختر المدينة..." : "اختر المحافظة أولاً"} /></SelectTrigger>
                        <SelectContent>
                          <div className="p-2 border-b">
                            <Input
                              placeholder="بحث..."
                              value={citySearch}
                              onChange={e => setCitySearch(e.target.value)}
                              className="h-8 text-sm"
                              onClick={e => e.stopPropagation()}
                              onKeyDown={e => e.stopPropagation()}
                            />
                          </div>
                          {(regGovernorate ? governorateCities[regGovernorate] || [] : [])
                            .filter(c => !citySearch || c.includes(citySearch))
                            .map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          {regGovernorate && (governorateCities[regGovernorate] || []).filter(c => !citySearch || c.includes(citySearch)).length === 0 && (
                            <p className="text-xs text-muted-foreground p-2 text-center">لا توجد نتائج</p>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {regGovernorate === "غزة" && regCity === "مدينة غزة" && (
                      <div className="space-y-2">
                        <Label>الحي</Label>
                        <Select value={regNeighborhood} onValueChange={setRegNeighborhood}>
                          <SelectTrigger><SelectValue placeholder="اختر الحي..." /></SelectTrigger>
                          <SelectContent>
                            <div className="p-2 border-b">
                              <Input
                                placeholder="بحث..."
                                value={neighborhoodSearch}
                                onChange={e => setNeighborhoodSearch(e.target.value)}
                                className="h-8 text-sm"
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                              />
                            </div>
                            {gazaNeighborhoods.filter(n => !neighborhoodSearch || n.includes(neighborhoodSearch)).map(n => (
                              <SelectItem key={n} value={n}>{n}</SelectItem>
                            ))}
                            {gazaNeighborhoods.filter(n => !neighborhoodSearch || n.includes(neighborhoodSearch)).length === 0 && (
                              <p className="text-xs text-muted-foreground p-2 text-center">لا توجد نتائج</p>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>العنوان التفصيلي</Label>
                      <Input value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="الشارع، رقم المبنى، طابق" />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <BookUser className="h-4 w-4" />
                    معلومات إضافية
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>الحالة الاجتماعية</Label>
                      <Select value={regMarital} onValueChange={setRegMarital}>
                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          {maritalOptions.map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الجنسية</Label>
                      <Input value={regNationality} onChange={e => setRegNationality(e.target.value)} placeholder="فلسطيني" />
                    </div>
                    <div className="space-y-2">
                      <Label>المهنة</Label>
                      <Input value={regOccupation} onChange={e => setRegOccupation(e.target.value)} placeholder="المهنة" />
                    </div>
                    <div className="space-y-2">
                      <Label>حالة التأمين</Label>
                      <Select value={regInsurance} onValueChange={setRegInsurance}>
                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          {insuranceOptions.map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>مصدر الإحالة</Label>
                      <Select value={regReferral} onValueChange={setRegReferral}>
                        <SelectTrigger><SelectValue placeholder="اختر مصدر الإحالة..." /></SelectTrigger>
                        <SelectContent>
                          {referralOptions.map(o => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>كيف عرفت عنا؟</Label>
                      <Select value={regSource} onValueChange={setRegSource}>
                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          {sourceOptions.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    ملاحظات عامة
                  </h3>
                  <Textarea value={regNotes} onChange={e => setRegNotes(e.target.value)} placeholder="أي ملاحظات عامة عن المريض..." className="resize-none min-h-[80px]" />
                </div>
              </div>

              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {regError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleResetRegistration}>إعادة تعيين</Button>
                <Button
                  onClick={handleRegisterPatient}
                  disabled={!regName.trim() || !regPhone.trim() || regSubmitting}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  {regSubmitting ? (
                    <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 ml-1" />
                  )}
                  تسجيل المريض
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-rose-500" />
                معاينة البطاقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border bg-gradient-to-b from-blue-600/5 to-rose-600/5 p-5 text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-rose-500 mx-auto mb-3 flex items-center justify-center shadow-lg">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-bold text-lg">{regName || "اسم المريض"}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">{regPatientCode ? `CL-${regPatientCode}` : "••••"}</p>
                <Separator className="my-3" />
                <div className="space-y-2 text-right text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">هاتف</span>
                    <span dir="ltr" className="font-medium">{regPhone || "—"}</span>
                  </div>
                  {regPhoneOwner && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المالك</span>
                      <span className="font-medium">{regPhoneOwner}</span>
                    </div>
                  )}
                  {regPhone2 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">هاتف إضافي</span>
                      <span dir="ltr" className="font-medium">{regPhone2}</span>
                    </div>
                  )}
                  {regEmail && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">البريد</span>
                      <span dir="ltr" className="font-medium text-xs max-w-[150px] truncate">{regEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الجنس</span>
                    <span className="font-medium">{regGender === "female" ? "أنثى" : "ذكر"}</span>
                  </div>
                  {regDob && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">تاريخ الميلاد</span>
                      <span className="font-medium">{regDob}</span>
                    </div>
                  )}
                  {regIdNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">رقم الهوية</span>
                      <span className="font-medium">{regIdNumber}</span>
                    </div>
                  )}
                  {regMarital && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحالة الاجتماعية</span>
                      <span className="font-medium">{regMarital}</span>
                    </div>
                  )}
                  {regNationality && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الجنسية</span>
                      <span className="font-medium">{regNationality}</span>
                    </div>
                  )}
                  {regOccupation && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المهنة</span>
                      <span className="font-medium">{regOccupation}</span>
                    </div>
                  )}
                  {regInsurance && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">التأمين</span>
                      <span className="font-medium">{regInsurance}</span>
                    </div>
                  )}
                  {regGovernorate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المحافظة</span>
                      <span className="font-medium">{regGovernorate}</span>
                    </div>
                  )}
                  {regCity && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المدينة</span>
                      <span className="font-medium">{regCity}</span>
                    </div>
                  )}
                  {regNeighborhood && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحي</span>
                      <span className="font-medium">{regNeighborhood}</span>
                    </div>
                  )}
                  {regAddress && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">العنوان</span>
                      <span className="font-medium text-xs max-w-[120px] truncate">{regAddress}</span>
                    </div>
                  )}
                  {regSource && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المصدر</span>
                      <span className="font-medium">{regSource}</span>
                    </div>
                  )}
                  {regReferral && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الإحالة</span>
                      <span className="font-medium">{regReferral}</span>
                    </div>
                  )}
                  {regHomePhone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">هاتف المنزل</span>
                      <span dir="ltr" className="font-medium">{regHomePhone}</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-3">
                ستظهر هذه المعلومات في ملف المريض
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---- Render: POS Section ----

  function renderPosSection() {
    return (
      <div className="animate-in fade-in duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                  نقاط البيع (POS)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>اختيار المريض</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={posPatientSearch}
                      onChange={e => setPosPatientSearch(e.target.value)}
                      placeholder="ابحث باسم المريض..."
                      className="pr-9"
                    />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {posPatientSearch && patientResults.length > 0 && patientResults.map(p => (
                      <button
                        key={p.id}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                          posPatient === p.name_ar
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 border-border",
                        )}
                        onClick={() => { setPosPatient(p.name_ar); setPosPatientSearch(""); }}
                      >
                        {p.name_ar}
                      </button>
                    ))}
                    <button
                      className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                        posPatient === "عميل خارجي"
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-secondary/30 text-muted-foreground hover:bg-secondary/60 border-border",
                      )}
                      onClick={() => { setPosPatient("عميل خارجي"); setPosPatientSearch(""); }}
                    >
                      عميل خارجي
                    </button>
                  </div>
                  {posPatient && (
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                      <UserCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{posPatient}</span>
                      <button onClick={() => setPosPatient("")} className="mr-auto text-muted-foreground hover:text-red-500">
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>البحث عن منتج (الاسم / الباركود)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Barcode className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        placeholder="ابحث بالاسم أو الباركود..."
                        className="pr-9"
                        dir="rtl"
                      />
                    </div>
                  </div>
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin ml-2" />
                      جاري تحميل المنتجات...
                    </div>
                  ) : productSearch && productResults.length > 0 ? (
                    <div className="border rounded-lg mt-1 overflow-hidden max-h-48 overflow-y-auto">
                      {productResults.map(p => (
                        <button
                          key={p.id}
                          className="w-full text-right px-3 py-2.5 text-sm hover:bg-secondary/30 transition-colors flex items-center justify-between border-b last:border-b-0"
                          onClick={() => { handleAddProductToCart(p); setProductSearch(""); }}
                        >
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span>{p.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-mono" dir="ltr">{p.barcode || "—"}</span>
                            <span className="font-mono font-medium text-sm" dir="ltr">₪{p.sale_price}</span>
                            <Badge variant="outline" className={cn(
                              "text-[10px]",
                              p.stock_quantity <= 10 ? "border-red-200 text-red-600" : "border-emerald-200 text-emerald-600",
                            )}>
                              {p.stock_quantity} متبقي
                            </Badge>
                            <PlusIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : productSearch && productResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      لا توجد منتجات تطابق البحث
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            {cart.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="h-5 w-5 text-rose-500" />
                    سلة المشتريات
                    <Badge variant="secondary" className="text-xs">{cartItemCount}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-secondary/10">
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead className="text-center w-28">الكمية</TableHead>
                          <TableHead className="text-left w-24">سعر الوحدة</TableHead>
                          <TableHead className="text-left w-24">المجموع</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map(item => (
                          <TableRow key={item.productId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{item.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{item.barcode}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  disabled={item.quantity <= 1}
                                  onClick={() => handleCartQuantity(item.productId, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-medium text-sm tabular-nums">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7"
                                  disabled={item.quantity >= item.stock}
                                  onClick={() => handleCartQuantity(item.productId, 1)}
                                >
                                  <PlusIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-left font-mono text-sm" dir="ltr">₪{item.unitPrice}</TableCell>
                            <TableCell className="text-left font-mono font-medium text-sm" dir="ltr">₪{(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                            <TableCell>
                              <button onClick={() => handleRemoveFromCart(item.productId)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="p-4 bg-gradient-to-l from-blue-50 to-rose-50 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">الإجمالي الكلي</span>
                      <span className="text-2xl font-bold font-mono text-blue-700" dir="ltr">₪ {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {cart.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    إتمام الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>طريقة الدفع</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1.5">
                      {(["cash", "card", "partial"] as PaymentMethod[]).map(m => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                            paymentMethod === m
                              ? "border-blue-300 bg-blue-50 text-blue-700 shadow-sm"
                              : "border-border text-muted-foreground hover:bg-secondary/30",
                          )}
                        >
                          {getMethodIcon(m)}
                          {getMethodLabel(m)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {paymentMethod === "partial" && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <Label>المبلغ المدفوع</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        value={partialAmount}
                        onChange={e => setPartialAmount(e.target.value)}
                        placeholder="المبلغ..."
                      />
                      <p className="text-xs text-muted-foreground">
                        المبلغ المتبقي:{' '}
                        <span className="font-mono font-medium text-rose-600" dir="ltr">
                          ₪ {(cartTotal - (parseFloat(partialAmount) || 0)).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setCart([]); setPartialAmount(""); }}
                    >
                      إلغاء
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 gap-2 shadow-sm"
                      disabled={cart.length === 0 || checkoutProcessing}
                      onClick={handleIssueReceipt}
                    >
                      {checkoutProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Receipt className="h-4 w-4" />
                      )}
                      إصدار فاتورة
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-5 w-5 text-rose-500" />
                  فواتير الجلسة
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-secondary/10 sticky top-0">
                      <TableRow>
                        <TableHead className="text-xs">التاريخ</TableHead>
                        <TableHead className="text-xs">المريض</TableHead>
                        <TableHead className="text-xs">المنتجات</TableHead>
                        <TableHead className="text-left text-xs">المبلغ</TableHead>
                        <TableHead className="text-xs">الطريقة</TableHead>
                        <TableHead className="text-xs">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                            لا توجد فواتير في هذه الجلسة
                          </TableCell>
                        </TableRow>
                      ) : (
                        sessionPayments.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{p.date}</TableCell>
                            <TableCell className="font-medium text-xs">{p.patientName}</TableCell>
                            <TableCell className="text-[11px] text-muted-foreground max-w-[120px] truncate">{p.items}</TableCell>
                            <TableCell className="text-left font-mono font-medium text-xs" dir="ltr">₪{p.amount}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                {getMethodIcon(p.method)}
                                {getMethodLabel(p.method)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "text-[10px]",
                                p.status === "paid" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                                p.status === "pending" && "border-amber-200 bg-amber-50 text-amber-700",
                                p.status === "partial" && "border-blue-200 bg-blue-50 text-blue-700",
                              )}>
                                {p.status === "paid" && "مدفوع"}
                                {p.status === "pending" && "معلق"}
                                {p.status === "partial" && "جزئي"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-rose-500" />
                الفاتورة
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="text-center border-b pb-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-rose-500 mx-auto mb-2 flex items-center justify-center shadow-md">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg">عيادة التجميل</h3>
                <p className="text-xs text-muted-foreground">فاتورة مبيعات</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المريض</span>
                <span className="font-medium">{posPatient || "عميل خارجي"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">التاريخ</span>
                <span className="font-medium">{new Date().toLocaleDateString("ar-EG")}</span>
              </div>
              <Separator />
              <div className="space-y-1.5">
                {cart.map(item => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span>{item.name} ×{item.quantity}</span>
                    <span className="font-mono" dir="ltr">₪{(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>الإجمالي</span>
                <span className="font-mono text-blue-700" dir="ltr">₪ {cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>طريقة الدفع</span>
                <span>{getMethodLabel(paymentMethod)}</span>
              </div>
              {paymentMethod === "partial" && partialAmount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المدفوع</span>
                  <span className="font-mono font-medium" dir="ltr">₪{parseFloat(partialAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="bg-gradient-to-l from-blue-50 to-rose-50 rounded-lg p-3 text-center text-xs text-muted-foreground border border-blue-100">
                شكراً لثقتكم
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setShowReceipt(false)}>
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---- Render: Bookings Section ----

  const bookingFilters = [
    { id: "today", label: "اليوم" },
    { id: "tomorrow", label: "غداً" },
    { id: "week", label: "هذا الأسبوع" },
    { id: "month", label: "هذا الشهر" },
    { id: "all", label: "الكل" },
  ] as const;

  const bookingStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    confirmed: { label: "مؤكد", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    arrived: { label: "حضر", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <UserCheck className="h-3 w-3" /> },
    cancelled: { label: "ملغي", className: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  };

  function renderBookingsSection() {
    const resetBookingForm = () => {
      setBookingSelectedPatient(null);
      setBookingPatientSearch("");
      setBookingPatientResults([]);
      setBookingDate(todayStr());
      setBookingTime("");
      setBookingService("");
      setBookingNotes("");
    };

    const handleAddBooking = async () => {
      if (!bookingSelectedPatient?.id) return;
      try {
        const name = bookingSelectedPatient.name_ar;
        const phone = bookingSelectedPatient.phones?.[0]?.number;
        await createBooking({
          name,
          phone: phone || undefined,
          booking_date: bookingDate,
          booking_time: bookingTime || undefined,
          service: bookingService || undefined,
          notes: bookingNotes || undefined,
          status: "confirmed",
        });
        resetBookingForm();
        setShowBookingDialog(false);
        fetchBookings();
        toast({ title: "تم", description: `تم إضافة حجز لـ ${name}` });
      } catch (err: any) {
        toast({ title: "خطأ", description: err?.message || "فشل إضافة الحجز", variant: "destructive" });
      }
    };

    const handleStatusToggle = async (booking: DbBooking) => {
      const next: Record<string, string> = { confirmed: "arrived", arrived: "cancelled", cancelled: "confirmed" };
      const newStatus = next[booking.status] || "confirmed";
      try {
        await updateBooking(booking.id!, { status: newStatus });
        fetchBookings();
      } catch {
        toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
      }
    };

    const handleDelete = async (id: number) => {
      try {
        await deleteBooking(id);
        fetchBookings();
        toast({ title: "تم", description: "تم حذف الحجز" });
      } catch {
        toast({ title: "خطأ", description: "فشل حذف الحجز", variant: "destructive" });
      }
    };

    const todayBookings = bookings.filter(b => b.booking_date === todayStr());
    const todayConfirmed = todayBookings.filter(b => b.status === "confirmed").length;
    const todayArrived = todayBookings.filter(b => b.status === "arrived").length;

    return (
      <div className="space-y-5 animate-in fade-in duration-300">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-xs text-muted-foreground">حجوزات اليوم</div>
              <div className="text-2xl font-bold mt-1">{todayBookings.length}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200/50">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-blue-600">بانتظار القدوم</div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{todayConfirmed}</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-200/50">
            <CardContent className="p-4 text-center">
              <div className="text-xs text-emerald-600">قدموا اليوم</div>
              <div className="text-2xl font-bold mt-1 text-emerald-600">{todayArrived}</div>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                الحجوزات
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Filter pills */}
                <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                  {bookingFilters.map(f => (
                    <Button
                      key={f.id}
                      variant={bookingFilter === f.id ? "default" : "ghost"}
                      size="sm"
                      className={`text-xs h-8 ${bookingFilter === f.id ? "" : "text-muted-foreground"}`}
                      onClick={() => setBookingFilter(f.id as typeof bookingFilter)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
                <Button size="sm" className="gap-2" onClick={() => { resetBookingForm(); setShowBookingDialog(true); }}>
                  <Plus className="h-4 w-4" />
                  حجز جديد
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p>لا توجد حجوزات</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { resetBookingForm(); setShowBookingDialog(true); }}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة حجز
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.map((booking) => {
                  const statusCfg = bookingStatusConfig[booking.status] || bookingStatusConfig.confirmed;
                  const today = todayStr();
                  const isOverdue = booking.booking_date < today && booking.status === "confirmed";
                  const isToday = booking.booking_date === today;
                  return (
                    <Card key={booking.id} className={`hover:shadow-md transition-all border-r-4 ${isOverdue ? "border-r-red-400" : isToday ? "border-r-primary" : "border-r-muted"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{booking.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                {booking.booking_date && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(booking.booking_date + "T00:00:00").toLocaleDateString("ar-EG")}
                                  </span>
                                )}
                                {booking.booking_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {booking.booking_time}
                                  </span>
                                )}
                                {booking.phone && (
                                  <span className="flex items-center gap-1" dir="ltr">
                                    <Phone className="h-3 w-3" />
                                    {booking.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {booking.service && (
                              <Badge variant="outline" className="text-xs hidden sm:inline-flex">{booking.service}</Badge>
                            )}
                            <button
                              onClick={() => handleStatusToggle(booking)}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${statusCfg.className}`}
                            >
                              <span className="flex items-center gap-1">{statusCfg.icon}{statusCfg.label}</span>
                            </button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(booking.id!)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {booking.notes && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg mr-13">
                            {booking.notes}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Booking Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                حجز جديد
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Patient Search */}
              {!bookingSelectedPatient ? (
                <div className="space-y-2">
                  <Label>البحث عن مريض <span className="text-red-500">*</span></Label>
                  <Input
                    value={bookingPatientSearch}
                    onChange={e => setBookingPatientSearch(e.target.value)}
                    placeholder="ابحث باسم المريض أو رقم الهاتف أو الهوية..."
                    autoFocus
                  />
                  {bookingPatientsLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري البحث...
                    </div>
                  )}
                  {bookingPatientSearch.trim() && !bookingPatientsLoading && bookingPatientResults.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">لا يوجد مريض مطابق</p>
                  )}
                  {bookingPatientResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                      {bookingPatientResults.map(patient => (
                        <button
                          key={patient.id ?? patient.local_code}
                          type="button"
                          className="w-full text-right px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between"
                          onClick={() => {
                            setBookingSelectedPatient(patient);
                            setBookingPatientSearch("");
                            setBookingPatientResults([]);
                          }}
                        >
                          <div>
                            <div className="font-medium text-sm">{patient.name_ar}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                              <span>{patient.phones?.[0]?.number || "—"}</span>
                              {patient.id_number && <span>هوية: {patient.id_number}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">{patient.local_code}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/40 border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{bookingSelectedPatient.name_ar}</p>
                        <p className="text-xs text-muted-foreground">{bookingSelectedPatient.phones?.[0]?.number || "—"}</p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setBookingSelectedPatient(null)}>
                      تغيير
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>التاريخ *</Label>
                  <Input
                    type="date"
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الوقت</Label>
                  <Input
                    type="time"
                    value={bookingTime}
                    onChange={e => setBookingTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={bookingDate === todayStr() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBookingDate(todayStr())}
                >
                  اليوم
                </Button>
                <Button
                  variant={(() => {
                    const tom = new Date(); tom.setDate(tom.getDate() + 1);
                    return bookingDate === tom.toISOString().slice(0, 10) ? "default" : "outline";
                  })()}
                  size="sm"
                  onClick={() => {
                    const tom = new Date(); tom.setDate(tom.getDate() + 1);
                    setBookingDate(tom.toISOString().slice(0, 10));
                  }}
                >
                  غداً
                </Button>
              </div>
              <div className="space-y-2">
                <Label>الخدمة</Label>
                <Input
                  value={bookingService}
                  onChange={e => setBookingService(e.target.value)}
                  placeholder="نوع الخدمة (اختياري)"
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={bookingNotes}
                  onChange={e => setBookingNotes(e.target.value)}
                  placeholder="ملاحظات إضافية"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleAddBooking} disabled={!bookingSelectedPatient}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة الحجز
                </Button>
                <Button variant="outline" onClick={() => setShowBookingDialog(false)}>إلغاء</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---- Render: Settings Section ----

  function renderSettingsSection() {
    const [clearing, setClearing] = useState(false);
    const [clearedMsg, setClearedMsg] = useState(false);

    async function handleClearNow() {
      setClearing(true);
      setClearedMsg(false);
      try {
        await cancelOldPendingAppointments();
        setClearedMsg(true);
        fetchAppointments(true);
      } catch {
        // ignore
      } finally {
        setClearing(false);
      }
    }

    function handleToggleAutoClear(checked: boolean) {
      setAutoClearQueue(checked);
      localStorage.setItem("autoClearQueue", String(checked));
    }

    return (
      <div className="animate-in fade-in duration-300 max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              إعدادات الكشفية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-rose-50 rounded-lg border border-blue-100">
              <p className="text-sm text-muted-foreground mb-1">قيمة الكشفية الحالية</p>
              <p className="text-3xl font-bold font-mono text-blue-700" dir="ltr">₪ {examFee}</p>
            </div>
            <Separator />
            <div className="space-y-3">
              <Label>تعديل قيمة الكشفية</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  dir="ltr"
                  value={examFee}
                  onChange={e => setExamFee(e.target.value)}
                  placeholder="أدخل قيمة الكشفية"
                  className="max-w-[200px]"
                />
                <Button
                  onClick={handleSaveExamFee}
                  className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  <ShieldCheck className="h-4 w-4" />
                  حفظ
                </Button>
              </div>
              {settingsSaved && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm animate-in slide-in-from-top-2 duration-200">
                  <CheckCircle2 className="h-4 w-4" />
                  تم حفظ الإعدادات بنجاح
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">معلومات</h3>
              <p className="text-xs text-muted-foreground">
                يتم تطبيق قيمة الكشفية على جميع المرضى الجدد عند حجز موعد الكشفية الأولى.
                يمكنك تعديل هذه القيمة في أي وقت.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600" />
              إعدادات الطابور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">مسح الطابور تلقائياً في نهاية اليوم</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  عند التفعيل، سيتم إلغاء المواعيد المعلقة من الأيام السابقة تلقائياً عند فتح الطابور
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={autoClearQueue}
                onClick={() => handleToggleAutoClear(!autoClearQueue)}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
                  autoClearQueue ? "bg-blue-600" : "bg-gray-200",
                )}
              >
                <span className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform",
                  autoClearQueue ? "translate-x-5" : "translate-x-0",
                )} />
              </button>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>مسح يدوي</Label>
              <p className="text-xs text-muted-foreground">
                إلغاء جميع المواعيد المعلقة من الأيام السابقة
              </p>
              <Button
                variant="destructive"
                onClick={handleClearNow}
                disabled={clearing}
                className="gap-2"
              >
                {clearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {clearing ? "جاري المسح..." : "مسح الطابور الآن"}
              </Button>
              {clearedMsg && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm animate-in slide-in-from-top-2 duration-200">
                  <CheckCircle2 className="h-4 w-4" />
                  تم مسح الطابور بنجاح
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Main Render ----

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-rose-500 flex items-center justify-center shadow-md shrink-0">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">لوحة الاستقبال</h1>
            <p className="text-sm text-muted-foreground">إدارة المرضى والمواعيد والفواتير والمبيعات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "relative",
            waitingDoctorCount > 0 && "animate-pulse",
          )}>
            <Bell className={cn(
              "h-5 w-5 cursor-pointer transition-colors",
              waitingDoctorCount > 0 ? "text-purple-600" : "text-muted-foreground hover:text-foreground",
            )} />
            {waitingDoctorCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold shadow-lg">
                {waitingDoctorCount}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      </div>
      <div className="flex gap-1 bg-secondary/30 p-1 rounded-lg w-fit border overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                activeSection === tab.id
                  ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-[60vh]">
        {activeSection === "queue" && renderQueueSection()}
        {activeSection === "register" && renderRegistrationSection()}
        {activeSection === "bookings" && renderBookingsSection()}
        {activeSection === "pos" && renderPosSection()}
        {activeSection === "settings" && renderSettingsSection()}
      </div>
    </div>
  );
}
