import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Clock, UserCheck, Search, AlertTriangle, Syringe, Zap, Stethoscope,
  Printer, Save, FileText, ArrowRight, ChevronLeft, Activity, Droplets, Pill,
  Timer, UserRound, Phone, Calendar, Eye, Filter, CheckCircle2, CircleUserRound,
  Plus, Trash2, X, ShoppingCart, Package, Bell, BellRing, Volume2, ChevronDown,
  ChevronUp, ClipboardList, CheckCheck, Hourglass, AlertCircle, Ban,
  Sparkles, Hash, Loader2, RefreshCw, AlertOctagon, LogIn, LogOut, User,
  CalendarClock, CalendarPlus, Image, Camera, Share2, QrCode, Download,
  Upload, Info, SplitSquareHorizontal,
} from "lucide-react";
import {
  supabase,
  getAppointmentsForDate, updateAppointmentStatus,
  getVisitByAppointment, createVisit, updateVisit,
  createSessionAddon, getSessionAddons,
  createInjectionLog, getInjectionLogs,
  createLaserLog, getLaserLogs,
  createProductSale,
  getProducts, searchProducts,
  createPayment,
  subscribeToAppointments, subscribeToPhotos,
  createFollowUp, createBooking, getFollowUpsForPatient,
  createVisitPhoto, getVisitPhotosForPatient, deleteVisitPhoto,
  getBookings, updateBooking, deleteBooking, searchPatients, logActivity,
} from "@/lib/db";
import type { DbPatient, DbAppointment, DbProduct, AppointmentStatus, DbFollowUp, DbVisitPhoto, DbBooking } from "@/lib/db";
import { BookingSection } from "@/components/bookings/booking-section";

// ---- Constants ----
const faceZones = [
  { value: "forehead", label: "الجبهة" },
  { value: "glabella", label: "ما بين الحاجبين" },
  { value: "crow_feet", label: "تجاعيد العين" },
  { value: "cheeks", label: "الخدين" },
  { value: "nasolabial", label: "الخط الأنفي الشفوي" },
  { value: "lips", label: "الشفتين" },
  { value: "chin", label: "الذقن" },
  { value: "jawline", label: "خط الفك" },
];

const injectableProducts = [
  { value: "hyaluronic_acid", label: "حمض الهيالورونيك" },
  { value: "botox", label: "بوتوكس" },
  { value: "filler_calcium", label: "فيلر هيدروكسي أباتيت" },
  { value: "pdo_threads", label: "خيوط PDO" },
  { value: "mesotherapy", label: "ميزوثيرابي" },
  { value: "prp", label: "PRP" },
  { value: "saline", label: "محلول ملحي" },
  { value: "lidocaine", label: "ليدوكايين" },
  { value: "vitamin_cocktail", label: "كوكتيل فيتامينات" },
];

const brands = [
  { value: "juvederm", label: "Juvéderm" },
  { value: "restylane", label: "Restylane" },
  { value: "teosyal", label: "Teosyal" },
  { value: "belotero", label: "Belotero" },
  { value: "allergan_botox", label: "Allergan Botox" },
  { value: "dysport", label: "Dysport" },
  { value: "xeomin", label: "Xeomin" },
  { value: "radiesse", label: "Radiesse" },
  { value: "sculptra", label: "Sculptra" },
  { value: "local", label: "علامة تجارية محلية" },
];

const laserDevices = [
  { value: "fraxel", label: "Fraxel" },
  { value: "co2", label: "CO2 Fractional" },
  { value: "nd_yag", label: "Nd:YAG" },
  { value: "alexandrite", label: "Alexandrite" },
  { value: "diode", label: "Diode" },
  { value: "ipl", label: "IPL" },
  { value: "pico", label: "PicoSure" },
  { value: "hollywood", label: "Hollywood Spectra" },
  { value: "moxi", label: "Moxi" },
];

const procedurePrices: Record<string, number> = {
  "استشارة تجميلية": 100,
  "جلسة ليزر إزالة شعر": 200,
  "حقن فيلر": 500,
  "حقن بوتوكس": 400,
  "تنظيف بشرة": 150,
  "ميزوثيرابي": 500,
  "تقشير كيميائي": 300,
  "هيدرا فيشل": 450,
};

const proceduresList = Object.keys(procedurePrices);

const formatVisitTime = (timeString?: string) => {
  if (!timeString) return "غير مسجل";
  try {
    if (timeString.includes("T") || timeString.includes("-")) {
      const d = new Date(timeString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' });
      }
    }
    if (timeString.includes(":")) {
      const [h, m] = timeString.split(":");
      let hours = parseInt(h, 10);
      const suffix = hours >= 12 ? 'م' : 'ص';
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      return `${hours}:${m} ${suffix}`;
    }
  } catch (e) {}
  return timeString.substring(0, 5);
};

const skintypeColors: Record<string, string> = {
  I: "bg-red-200 text-red-800 border-red-300",
  II: "bg-orange-200 text-orange-800 border-orange-300",
  III: "bg-yellow-200 text-yellow-800 border-yellow-300",
  IV: "bg-green-200 text-green-800 border-green-300",
  V: "bg-blue-200 text-blue-800 border-blue-300",
  VI: "bg-purple-200 text-purple-800 border-purple-300",
};

// ---- Types ----
interface InjectionRecord {
  zoneId: string;
  productType: string;
  brand: string;
  units: number;
}

interface LaserSessionRecord {
  id: number;
  device: string;
  spotSize: number;
  fluence: number;
  pulseWidth: number;
  passes: number;
  areaTreated: string;
  notes: string;
}

interface SessionAddonItem {
  id: number;
  name: string;
  type: "service" | "product";
  price: number;
  quantity: number;
}

interface PatientEntry {
  appointmentId: number;
  patientId: number;
  queueNumber: number;
  name: string;
  age: number;
  gender: string;
  phone: string;
  patientCode: string;
  status: AppointmentStatus | string;
  doctorApprovedAt?: string;
  checkoutAt?: string;
  serviceLabel: string;
  alerts: string[];
  contraindications: string[];
  examFeePaid?: boolean;
}

interface VisitWithData {
  id: number;
  patient_id: number;
  appointment_id: number;
  visit_date: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  prescription?: string;
  total_fee?: number;
  services?: string[];
}

// ---- Helpers ----
const LABEL = (id: string, arr: { value: string; label: string }[]) =>
  arr.find((x) => x.value === id)?.label || id;

const formatTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}س ${mins % 60}د` : `${mins} دقيقة`;
};

const formatElapsed = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m} دقيقة و ${s} ثانية`;
  return `${s} ثانية`;
};

const EXAM_STORAGE_KEY = "exam_";
const getStartKey = (visitId: number) => `${EXAM_STORAGE_KEY}${visitId}`;
const getStoredStart = (visitId: number) => {
  const v = localStorage.getItem(getStartKey(visitId));
  return v ? parseInt(v, 10) : 0;
};
const setStoredStart = (visitId: number) => localStorage.setItem(getStartKey(visitId), String(Date.now()));
const clearStoredStart = (visitId: number) => localStorage.removeItem(getStartKey(visitId));

const today = () => new Date().toISOString().split("T")[0];

const getAge = (dob?: string): number => {
  if (!dob) return 0;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / 31557600000);
};

const getPatientPhone = (patient: any): string => {
  if (!patient?.phones) return "";
  try {
    const phones = patient.phones;
    if (Array.isArray(phones) && phones.length > 0) {
      return phones[0]?.number || "";
    }
  } catch { /* ignore */ }
  return "";
};

const getServiceLabel = (svc?: string[] | null): string => {
  if (!svc || svc.length === 0) return "استشارة";
  return svc.join("، ");
};

const mapAppointment = (apt: any): PatientEntry => {
  const patient = apt.patients || apt.patient || {};
  return {
    appointmentId: apt.id,
    patientId: patient.id || apt.patient_id,
    queueNumber: apt.queue_number || 0,
    name: patient.name_ar || "غير معروف",
    age: getAge(patient.date_of_birth),
    gender: patient.gender || "female",
    phone: getPatientPhone(patient),
    patientCode: patient.local_code ? `P-${String(patient.local_code).padStart(5, "0")}` : "",
    status: apt.status || "waiting_reception",
    doctorApprovedAt: apt.doctor_approved_at,
    checkoutAt: apt.checkout_at,
    serviceLabel: getServiceLabel(apt.service_ids),
    alerts: [],
    contraindications: [],
    examFeePaid: apt.exam_fee_paid || false,
  };
};

const playNotification = () => {
  // Sound disabled — browser blocks autoplay.
  // Visual notification (banner + toast) is used instead.
};

// ---- Component ----
export default function Doctor() {
  const [view, setView] = useState<"queue" | "session" | "completed" | "bookings">("queue");
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);

  const [currentAppointment, setCurrentAppointment] = useState<any | null>(null);
  const [currentPatientData, setCurrentPatientData] = useState<any>(null);
  const [currentVisit, setCurrentVisit] = useState<VisitWithData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const activeVisitRef = useRef<number>(0);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const [examTab, setExamTab] = useState("exam");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentPlan, setTreatmentPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);

  const [injections, setInjections] = useState<InjectionRecord[]>([]);
  const [injectionDialogOpen, setInjectionDialogOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [injectionForm, setInjectionForm] = useState({ productType: "", brand: "", units: 0 });

  const [laserSessions, setLaserSessions] = useState<LaserSessionRecord[]>([]);
  const [laserForm, setLaserForm] = useState({
    device: "", spotSize: 0, fluence: 0, pulseWidth: 0, passes: 1, areaTreated: "", notes: "",
  });

  const [sessionAddons, setSessionAddons] = useState<SessionAddonItem[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [completedFilter, setCompletedFilter] = useState("all");
  const [selectedCompleted, setSelectedCompleted] = useState<any>(null);
  const [completedDetailLoading, setCompletedDetailLoading] = useState(false);
  const [completedDetailError, setCompletedDetailError] = useState<string | null>(null);

  const [products, setProducts] = useState<DbProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [sessionSaving, setSessionSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // ---- Follow-up State ----
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpInterval, setFollowUpInterval] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUps, setFollowUps] = useState<DbFollowUp[]>([]);
  const [followUpSaving, setFollowUpSaving] = useState(false);
  const [pendingFinishData, setPendingFinishData] = useState<{ visitId: number; appointment: any } | null>(null);

  // ---- Photo State ----
  const [photosVisitId, setPhotosVisitId] = useState<number | null>(null);
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [photos, setPhotos] = useState<DbVisitPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [qrPhotoUrl, setQrPhotoUrl] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrDialogType, setQrDialogType] = useState<"upload" | "share">("upload");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<any[]>([]);
  const [photoNotes, setPhotoNotes] = useState("");
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [selectedVisitDetail, setSelectedVisitDetail] = useState<any>(null);
  const [visitDetailLoading, setVisitDetailLoading] = useState(false);

  // ---- Derived Data ----
  const patientEntries = useMemo(() => {
    return appointments.map(mapAppointment);
  }, [appointments]);

  const waitingApproval = patientEntries.filter((p) => p.status === "waiting_doctor_approval");
  const doctorApproved = patientEntries.filter((p) => p.status === "doctor_approved");
  const inExam = patientEntries.filter((p) => p.status === "in_examination");
  const regularWaiting = patientEntries.filter((p) =>
    ["waiting_reception", "exam_fee_pending", "waiting"].includes(p.status)
  );

  const completedToday = patientEntries.filter((p) =>
    ["exam_completed", "completed"].includes(p.status)
  );

  const activeBanner =
    !bannerDismissed && waitingApproval.length > 0 ? waitingApproval[0] : null;

  const waitingCount = waitingApproval.length + doctorApproved.length + regularWaiting.length;
  const inExamCount = inExam.length;
  const completedCount = completedToday.length;
  const totalCount = patientEntries.length;

  // ---- Fetch Queue Data ----
  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setQueueLoading(true);
    setQueueError(null);
    try {
      const data = await getAppointmentsForDate(today());
      setAppointments(data || []);
    } catch (err: any) {
      setQueueError(err?.message || "فشل في تحميل بيانات المرضى");
    } finally {
      if (!silent) setQueueLoading(false);
    }
  }, []);

  // ---- Fetch Products ----
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch { /* products load silently */ }
    finally { setProductsLoading(false); }
  }, []);

  const refreshCurrentVisit = useCallback(async () => {
    if (!currentAppointment?.id || !currentVisit?.id) return;
    try {
      const existing = await getVisitByAppointment(currentAppointment.id);
      const visitId = existing?.id ?? currentVisit?.id;
      if (!visitId) return;
      if (existing) {
        setCurrentVisit(existing as VisitWithData);
      }
      const [inj, las, add] = await Promise.all([
        getInjectionLogs(visitId),
        getLaserLogs(visitId),
        getSessionAddons(visitId),
      ]);
      setInjections(
        inj.map((i: any) => ({
          zoneId: i.zone,
          productType: i.product_name,
          brand: i.brand || "",
          units: i.units || 0,
        }))
      );
      setLaserSessions(
        las.map((l: any) => ({
          id: l.id,
          device: l.device,
          spotSize: l.spot_size || 0,
          fluence: l.fluence || 0,
          pulseWidth: l.pulse_width || 0,
          passes: l.passes || 0,
          areaTreated: l.area || "",
          notes: l.notes || "",
        }))
      );
      setSessionAddons(
        add.map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.item_type as "service" | "product",
          price: a.unit_price,
          quantity: a.quantity,
        }))
      );
    } catch { /* silent refresh failure */ }
  }, [currentAppointment?.id, currentVisit?.id]);

  // ---- Effects ----
  useEffect(() => {
    fetchQueue();
    fetchProducts();
  }, [fetchQueue, fetchProducts]);

  useEffect(() => {
    if (currentAppointment && !currentVisit) {
      (async () => {
        const existing = await getVisitByAppointment(currentAppointment.id);
        if (existing) {
          setCurrentVisit(existing as VisitWithData);
          setDiagnosis(existing.diagnosis || "");
          setTreatmentPlan(existing.treatment_plan || "");
          setNotes(existing.notes || "");
          setPrescription(existing.prescription || "");
        }
      })();
    }
  }, [currentAppointment, currentVisit]);

  useEffect(() => {
    if (currentVisit) {
      (async () => {
        try {
          const [inj, las, add] = await Promise.all([
            getInjectionLogs(currentVisit.id),
            getLaserLogs(currentVisit.id),
            getSessionAddons(currentVisit.id),
          ]);
          setInjections(
            inj.map((i: any) => ({
              zoneId: i.zone,
              productType: i.product_name,
              brand: i.brand || "",
              units: i.units || 0,
            }))
          );
          setLaserSessions(
            las.map((l: any) => ({
              id: l.id,
              device: l.device,
              spotSize: l.spot_size || 0,
              fluence: l.fluence || 0,
              pulseWidth: l.pulse_width || 0,
              passes: l.passes || 0,
              areaTreated: l.area || "",
              notes: l.notes || "",
            }))
          );
          setSessionAddons(
            add.map((a: any) => ({
              id: a.id,
              name: a.name,
              type: a.item_type as "service" | "product",
              price: a.unit_price,
              quantity: a.quantity,
            }))
          );
        } catch { /* silent */ }
      })();
    }
  }, [currentVisit]);

  // Load follow-ups for current patient
  useEffect(() => {
    if (currentAppointment?.patient_id) {
      getFollowUpsForPatient(currentAppointment.patient_id)
        .then(setFollowUps)
        .catch(() => setFollowUps([]));
    } else {
      setFollowUps([]);
    }
  }, [currentAppointment?.patient_id]);

  // ---- Timer - always sync elapsed from localStorage ----
  useEffect(() => {
    const id = setInterval(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(EXAM_STORAGE_KEY));
      if (keys.length > 0) {
        const stored = parseInt(localStorage.getItem(keys[0])!, 10);
        setElapsed(Math.floor((Date.now() - stored) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (waitingApproval.length > 0 && !bannerDismissed) {
      setShowNotification(true);
      playNotification();
      const t = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(t);
    }
    return;
  }, [waitingApproval.length, bannerDismissed]);

  useEffect(() => {
    const channel = subscribeToAppointments(() => {
      fetchQueue(true);
      if (currentVisit?.id) {
        refreshCurrentVisit();
      }
    });
    return () => {
      channel.unsubscribe();
    };
  }, [fetchQueue, currentVisit?.id, refreshCurrentVisit]);

  // ---- Auto-Save Exam ----
  const triggerAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      if (!currentVisit?.id) return;
      try {
        await updateVisit(currentVisit.id, {
          diagnosis,
          treatment_plan: treatmentPlan,
          notes,
          prescription,
        });
      } catch { /* silent auto-save */ }
    }, 1500);
  }, [currentVisit, diagnosis, treatmentPlan, notes, prescription]);

  useEffect(() => {
    if (view === "session" && currentVisit?.id) {
      triggerAutoSave();
    }
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [diagnosis, treatmentPlan, notes, prescription, view, currentVisit, triggerAutoSave]);

  // ---- Handlers ----
  const approveAndStartSession = useCallback(async (entry: PatientEntry) => {
    setApprovingId(entry.appointmentId);
    try {
      await updateAppointmentStatus(
        entry.appointmentId,
        "doctor_approved",
        { doctor_approved_at: new Date().toISOString() }
      );
      const timestamp = new Date().toISOString();
      const visit = await createVisit({
        patient_id: entry.patientId,
        appointment_id: entry.appointmentId,
        visit_date: today(),
        services: [],
        diagnosis: "",
        total_fee: 0,
        start_time: timestamp,
      });
      const apt = appointments.find((a) => a.id === entry.appointmentId);
      setCurrentAppointment(apt || null);
      setCurrentPatientData(apt?.patients || null);
      setCurrentVisit(visit as VisitWithData);
      activeVisitRef.current = visit.id;
      setStoredStart(visit.id);
      setDiagnosis("");
      setTreatmentPlan("");
      setNotes("");
      setPrescription("");
      setSelectedProcedures([]);
      setInjections([]);
      setLaserSessions([]);
      setSessionAddons([]);
      setElapsed(0);
      setExamTab("exam");
      setBannerDismissed(true);
      setView("session");

      await updateAppointmentStatus(entry.appointmentId, "in_examination");
      logActivity({
        user_name: "د. زياد أبو دقة",
        action_type: "create",
        entity_type: "visit",
        entity_name: entry.name,
        details: { description: `بدء جلسة كشف للمريض ${entry.name}`, appointment_id: entry.appointmentId, visit_id: visit.id },
      }).catch(() => {});
      const updated = appointments.map((a) =>
        a.id === entry.appointmentId ? { ...a, status: "in_examination" } : a
      );
      setAppointments(updated);
    } catch (err: any) {
      setQueueError(err?.message || "فشل الموافقة على المريض");
    } finally {
      setApprovingId(null);
    }
  }, [appointments]);

  const deferPatient = useCallback(async (entry: PatientEntry) => {
    try {
      await updateAppointmentStatus(entry.appointmentId, "exam_fee_pending");
      const updated = appointments.map((a) =>
        a.id === entry.appointmentId ? { ...a, status: "exam_fee_pending" } : a
      );
      setAppointments(updated);
      setBannerDismissed(false);
    } catch (err: any) {
      setQueueError(err?.message || "فشل تأجيل المريض");
    }
  }, [appointments]);

  const startExamFromQueue = useCallback(async (entry: PatientEntry) => {
    try {
      await updateAppointmentStatus(entry.appointmentId, "in_examination");
      let visit = await getVisitByAppointment(entry.appointmentId);
      if (!visit) {
        visit = await createVisit({
          patient_id: entry.patientId,
          appointment_id: entry.appointmentId,
          visit_date: today(),
          services: [],
          diagnosis: "",
          total_fee: 0,
          start_time: new Date().toISOString(),
        });
      }
      const apt = appointments.find((a) => a.id === entry.appointmentId);
      setCurrentAppointment(apt || null);
      setCurrentPatientData(apt?.patients || null);
      setCurrentVisit(visit as VisitWithData);
      activeVisitRef.current = visit.id;
      setStoredStart(visit.id);
      setDiagnosis(visit.diagnosis || "");
      setTreatmentPlan(visit.treatment_plan || "");
      setNotes(visit.notes || "");
      setPrescription(visit.prescription || "");
      setSelectedProcedures([]);
      setInjections([]);
      setLaserSessions([]);
      setSessionAddons([]);
      setElapsed(0);
      setExamTab("exam");
      setView("session");

      const updated = appointments.map((a) =>
        a.id === entry.appointmentId ? { ...a, status: "in_examination" } : a
      );
      setAppointments(updated);
    } catch (err: any) {
      console.error("Failed to start exam:", err);
    }
  }, [appointments]);

  const saveInjection = useCallback(async () => {
    if (!selectedZone || !injectionForm.productType || !currentVisit?.id) return;
    try {
      await createInjectionLog({
        visit_id: currentVisit.id,
        patient_id: currentVisit.patient_id,
        zone: selectedZone,
        product_name: injectionForm.productType,
        brand: injectionForm.brand,
        units: injectionForm.units || 0,
      });
      setInjections((prev) => [
        ...prev,
        { zoneId: selectedZone, ...injectionForm },
      ]);
      setInjectionDialogOpen(false);
      setSelectedZone(null);
      setInjectionForm({ productType: "", brand: "", units: 0 });
      toast({ title: "تم الحفظ", description: "تم تسجيل الحقن بنجاح" });
    } catch (err: any) {
      console.error("Failed to save injection:", err);
      toast({ title: "خطأ", description: err?.message || "فشل تسجيل الحقن", variant: "destructive" });
    }
  }, [selectedZone, injectionForm, currentVisit, toast]);

  const addLaserSession = useCallback(async () => {
    if (!laserForm.device || !laserForm.areaTreated || !currentVisit?.id) return;
    try {
      await createLaserLog({
        visit_id: currentVisit.id,
        patient_id: currentVisit.patient_id,
        device: laserForm.device,
        spot_size: laserForm.spotSize || undefined,
        fluence: laserForm.fluence || undefined,
        pulse_width: laserForm.pulseWidth || undefined,
        passes: laserForm.passes || undefined,
        area: laserForm.areaTreated,
        notes: laserForm.notes || undefined,
      });
      setLaserSessions((prev) => [...prev, { ...laserForm, id: Date.now() }]);
      setLaserForm({
        device: "", spotSize: 0, fluence: 0, pulseWidth: 0, passes: 1,
        areaTreated: "", notes: "",
      });
      toast({ title: "تم الإضافة", description: "تم تسجيل جلسة الليزر بنجاح" });
    } catch (err: any) {
      console.error("Failed to add laser session:", err);
      toast({ title: "خطأ", description: err?.message || "فشل تسجيل جلسة الليزر", variant: "destructive" });
    }
  }, [laserForm, currentVisit, toast]);

  const addAddon = useCallback(
    async (name: string, type: "service" | "product", price: number, productId?: number) => {
      if (!currentVisit?.id) return;
      const existing = sessionAddons.find((a) => a.name === name && a.type === type);
      try {
        if (existing) {
          await createSessionAddon({
            visit_id: currentVisit.id,
            item_type: type,
            product_id: productId,
            name,
            quantity: 1,
            unit_price: price,
            total_price: price,
          });
          setSessionAddons((prev) =>
            prev.map((a) =>
              a.id === existing.id ? { ...a, quantity: a.quantity + 1 } : a
            )
          );
        } else {
          await createSessionAddon({
            visit_id: currentVisit.id,
            item_type: type,
            product_id: productId,
            name,
            quantity: 1,
            unit_price: price,
            total_price: price,
          });
          setSessionAddons((prev) => [
            ...prev,
            { id: Date.now(), name, type, price, quantity: 1 },
          ]);
        }
      } catch (err: any) {
        console.error("Failed to add addon:", err);
        toast({ title: "خطأ", description: err?.message || "فشل إضافة المنتج", variant: "destructive" });
      }
    },
    [currentVisit, sessionAddons, toast]
  );

  const removeAddon = useCallback((id: number) => {
    setSessionAddons((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleProcedure = useCallback(
    (proc: string) => {
      setSelectedProcedures((prev) => {
        if (prev.includes(proc)) {
          return prev.filter((p) => p !== proc);
        }
        addAddon(proc, "service", procedurePrices[proc] || 0);
        return [...prev, proc];
      });
    },
    [addAddon]
  );

  const addRecommendedProduct = useCallback(
    (product: DbProduct) => {
      addAddon(product.name, "product", product.sale_price, product.id);
    },
    [addAddon]
  );

  const saveDraft = useCallback(async () => {
    if (!currentVisit?.id) return;
    setSessionSaving(true);
    try {
      await updateVisit(currentVisit.id, {
        diagnosis,
        treatment_plan: treatmentPlan,
        notes,
        prescription,
      });
      const el = document.createElement("div");
      el.className =
        "fixed bottom-6 left-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 text-sm font-medium";
      el.textContent = "تم حفظ المسودة بنجاح";
      document.body.appendChild(el);
      setTimeout(() => {
        el.classList.add("animate-out", "slide-out-to-bottom-4", "fade-out");
        setTimeout(() => document.body.removeChild(el), 300);
      }, 2000);
    } catch (err: any) {
      console.error("Failed to save draft:", err);
    } finally {
      setSessionSaving(false);
    }
  }, [currentVisit, diagnosis, treatmentPlan, notes, prescription]);

  const addonTotal = useMemo(
    () => sessionAddons.reduce((sum, a) => sum + a.price * a.quantity, 0),
    [sessionAddons]
  );

  const finishSession = useCallback(async () => {
    if (!currentVisit?.id || !currentAppointment) return;
    setSessionSaving(true);
    try {
      const visitId = currentVisit.id;
      const storedStart = getStoredStart(visitId);
      let durationSeconds = 0;
      if (storedStart > 0) {
        durationSeconds = Math.floor((Date.now() - storedStart) / 1000);
        clearStoredStart(visitId);
      }
      const durationNote = durationSeconds > 0
        ? `\n⏱ مدة الكشف: ${formatDuration(durationSeconds)}`
        : "";
      await updateVisit(visitId, {
        diagnosis,
        treatment_plan: treatmentPlan,
        notes: (notes || "") + durationNote,
        prescription,
        total_fee: addonTotal,
        end_time: new Date().toISOString(),
      });
      await updateAppointmentStatus(currentAppointment.id, "exam_completed", {
        checkout_at: new Date().toISOString(),
      });
      const updated = appointments.map((a) =>
        a.id === currentAppointment.id ? { ...a, status: "exam_completed" } : a
      );
      setAppointments(updated);
      setFollowUpDate(new Date().toISOString().slice(0, 10));
      setFollowUpInterval("");
      setFollowUpNotes("");
      setShowFollowUpDialog(true);
    } catch (err: any) {
      console.error("Failed to finish session:", err);
    } finally {
      setSessionSaving(false);
    }
  }, [currentVisit, currentAppointment, appointments, diagnosis, treatmentPlan, notes, prescription, addonTotal]);

  async function handleFollowUpConfirm() {
    if (!currentVisit?.id || !currentAppointment || !followUpDate) return;
    setFollowUpSaving(true);
    try {
      const booking = await createBooking({
        name: currentPatientData?.name_ar || currentAppointment.patients?.name_ar || "مريض",
        phone: currentPatientData?.phones?.[0]?.number || currentAppointment.patients?.phones?.[0]?.number || "",
        booking_date: followUpDate,
        booking_time: "",
        service: "متابعة",
        notes: followUpNotes || "متابعة بعد الكشف",
        status: "confirmed",
        created_by: undefined as any,
      });
      await createFollowUp({
        patient_id: currentAppointment.patient_id,
        visit_id: currentVisit.id,
        booking_id: booking.id,
        recommended_date: followUpDate,
        interval_label: followUpInterval || null,
        notes: followUpNotes || null,
        status: "pending",
        created_by: undefined as any,
      });
      setShowFollowUpDialog(false);
      clearSession();
    } catch (err: any) {
      console.error("Failed to create follow-up:", err);
    } finally {
      setFollowUpSaving(false);
    }
  }

  function handleFollowUpSkip() {
    setShowFollowUpDialog(false);
    clearSession();
  }

  function clearSession() {
    setCurrentAppointment(null);
    setCurrentPatientData(null);
    setCurrentVisit(null);
    activeVisitRef.current = 0;
    setSessionAddons([]);
    setElapsed(0);
    setView("queue");
    setExamTab("exam");
    setDiagnosis("");
    setTreatmentPlan("");
    setNotes("");
    setPrescription("");
    setSelectedProcedures([]);
    setInjections([]);
    setLaserSessions([]);
  }

  const openInjectionDialog = useCallback((zoneId: string) => {
    setSelectedZone(zoneId);
    setInjectionForm({ productType: "", brand: "", units: 0 });
    setInjectionDialogOpen(true);
  }, []);

  const returnToQueue = useCallback(() => {
    setCurrentAppointment(null);
    setCurrentPatientData(null);
    setCurrentVisit(null);
    setSessionAddons([]);
    setView("queue");
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    setShowNotification(false);
  }, []);

  // ---- Photo Handlers ----
  const loadPatientVisits = useCallback(async (pid: number) => {
    try {
      const { getVisitsForPatient, getInjectionLogs, getLaserLogs, getSessionAddons } = await import("@/lib/db");
      const visits = await getVisitsForPatient(pid);
      const detailedVisits = await Promise.all(
        visits.map(async (visit: any) => {
          const [inj, las, add] = await Promise.all([
            getInjectionLogs(visit.id),
            getLaserLogs(visit.id),
            getSessionAddons(visit.id),
          ]);
          return { ...visit, _injections: inj || [], _laser: las || [], _addons: add || [] };
        })
      );
      setPatientVisits(detailedVisits);
      if (detailedVisits.length > 0) {
        setPhotosVisitId(prev => prev || detailedVisits[0].id);
      }
    } catch { setPatientVisits([]); }
  }, []);

  const loadPhotos = useCallback(async (pid: number) => {
    setPhotosLoading(true);
    try {
      const data = await getVisitPhotosForPatient(pid);
      setPhotos(data);
    } catch { setPhotos([]); }
    finally { setPhotosLoading(false); }
  }, []);

  const loadVisitPhotos = useCallback(async (visitId: number) => {
    setPhotosLoading(true);
    try {
      const { getVisitPhotosForVisit } = await import("@/lib/db");
      const data = await getVisitPhotosForVisit(visitId);
      setPhotos(data);
    } catch { setPhotos([]); }
    finally { setPhotosLoading(false); }
  }, []);

  // Auto-load when photos tab is active or patient changes
  const prevPatientRef = useRef<number | null>(null);
  useEffect(() => {
    if (examTab === "photos" && currentPatientData?.id) {
      if (prevPatientRef.current !== currentPatientData.id) {
        setPhotosVisitId(null);
        setShowAllPhotos(false);
        prevPatientRef.current = currentPatientData.id;
      }
      loadPatientVisits(currentPatientData.id);
      // If a visit is selected and not in "all" mode, load per-visit photos
      const vid = photosVisitId;
      if (!showAllPhotos && vid) {
        loadVisitPhotos(vid);
      } else {
        loadPhotos(currentPatientData.id);
      }
    }
  }, [examTab, currentPatientData?.id, loadPatientVisits, loadPhotos, loadVisitPhotos, showAllPhotos]);

  // Real-time photo sync - auto-refresh when new photos are uploaded (from patient page or anywhere)
  useEffect(() => {
    if (!currentPatientData?.id) return;
    const pid = currentPatientData.id;
    const channel = subscribeToPhotos(() => {
      // Always refresh photos in the background so they're ready when the doctor opens the tab
      getVisitPhotosForPatient(pid)
        .then(data => setPhotos(data))
        .catch(() => {});
    });
    return () => channel.unsubscribe();
  }, [currentPatientData?.id]);

  const handlePhotoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleCameraCapture = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);

  const handlePhotoUpload = useCallback(async () => {
    const pid = currentPatientData?.id;
    if (!photoPreview || !photosVisitId || !pid) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photoPreview, folder: `clinic/patient_${pid}` }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url, public_id } = await res.json();
      await createVisitPhoto({
        visit_id: photosVisitId,
        patient_id: pid,
        photo_type: photoType,
        cloudinary_url: url,
        cloudinary_public_id: public_id,
        notes: photoNotes || null,
      });
      setPhotoPreview(null);
      setPhotoNotes("");
      if (currentPatientData?.id) {
        if (showAllPhotos) {
          await loadPhotos(currentPatientData.id);
        } else if (photosVisitId) {
          await loadVisitPhotos(photosVisitId);
        }
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  }, [photoPreview, photoNotes, photoType, currentPatientData?.id, photosVisitId, showAllPhotos, loadPhotos, loadVisitPhotos, toast]);

  const handleDeletePhoto = useCallback(async (photo: DbVisitPhoto) => {
    if (!confirm("هل أنت متأكد من حذف الصورة؟")) return;
    try {
      await fetch(`/api/upload/${photo.cloudinary_public_id}`, { method: "DELETE" });
      await deleteVisitPhoto(photo.id!);
      if (currentPatientData?.id) {
        if (showAllPhotos) {
          await loadPhotos(currentPatientData.id);
        } else if (photosVisitId) {
          await loadVisitPhotos(photosVisitId);
        }
      }
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الصورة", variant: "destructive" });
    }
  }, [currentPatientData?.id, photosVisitId, showAllPhotos, loadPhotos, loadVisitPhotos, toast]);

  const handleShowQr = useCallback(async (photo: DbVisitPhoto) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/shared-photo?id=${photo.id}`;
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#1e3a5f", light: "#ffffff" } });
      setQrPhotoUrl(dataUrl);
      setQrDialogType("share");
      setShowQrDialog(true);
    } catch {
      navigator.clipboard.writeText(url);
      toast({ title: "تم", description: "تم نسخ الرابط" });
    }
  }, [toast]);

  const handleShareLink = useCallback(async (photo: DbVisitPhoto) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/shared-photo?id=${photo.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'صورة من العيادة',
          text: 'شاهد هذه الصورة',
          url: url,
        });
      } catch (err) {
        navigator.clipboard.writeText(url);
        toast({ title: "تم", description: "تم نسخ الرابط بنجاح" });
      }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "تم", description: "تم نسخ الرابط بنجاح" });
    }
  }, [toast]);

  const filteredCompleted = useMemo(() => {
    const completed = patientEntries.filter((p) =>
      ["exam_completed", "completed"].includes(p.status)
    );
    return completed.filter((p) => {
      const matchSearch =
        searchQuery === "" ||
        p.name.includes(searchQuery) ||
        p.patientCode.includes(searchQuery) ||
        p.phone.includes(searchQuery);
      return matchSearch;
    });
  }, [patientEntries, searchQuery]);

  // ---- Visit Detail Dialog ----
  const loadVisitDetail = useCallback(async (visitId: number) => {
    setVisitDetailLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: visit } = await supabase.from("visits").select("*").eq("id", visitId).single();
      if (visit) {
        const [inj, las, add] = await Promise.all([
          getInjectionLogs(visit.id),
          getLaserLogs(visit.id),
          getSessionAddons(visit.id),
        ]);
        setSelectedVisitDetail({ ...visit, _injections: inj || [], _laser: las || [], _addons: add || [] });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل تحميل تفاصيل الزيارة", variant: "destructive" });
    } finally {
      setVisitDetailLoading(false);
    }
  }, [toast]);

  // ---- Completed Detail Dialog ----
  const openCompletedDetail = useCallback(async (entry: PatientEntry) => {
    setSelectedCompleted(entry);
    setCompletedDetailLoading(true);
    setCompletedDetailError(null);
    try {
      const visit = await getVisitByAppointment(entry.appointmentId);
      if (visit) {
        const [inj, las, add] = await Promise.all([
          getInjectionLogs(visit.id),
          getLaserLogs(visit.id),
          getSessionAddons(visit.id),
        ]);
        setSelectedCompleted({
          ...entry,
          _visit: visit,
          _injections: inj || [],
          _laser: las || [],
          _addons: add || [],
        });
      } else {
        setSelectedCompleted({ ...entry, _visit: null, _injections: [], _laser: [], _addons: [] });
      }
    } catch (err) {
      console.error("openCompletedDetail error:", err);
      setCompletedDetailError("فشل في تحميل التفاصيل");
    } finally {
      setCompletedDetailLoading(false);
    }
  }, []);

  // ---- Loading State ----
  if (queueLoading && view === "queue") {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-72" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-primary" />
            عيادة الدكتور زياد - الكشف التجميلي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            نظام إدارة جلسات التجميل - لوحة الطبيب
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={view === "queue" ? "default" : "outline"}
            onClick={() => setView("queue")}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            قائمة الانتظار
            {waitingApproval.length > 0 && (
              <Badge className="bg-red-500 text-white mr-1 animate-pulse">
                {waitingApproval.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={view === "bookings" ? "default" : "outline"}
            onClick={() => setView("bookings")}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            الحجوزات
          </Button>
          {view !== "completed" && view !== "session" && (
            <Button
              variant="outline"
              onClick={() => setView("completed")}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              المنجزون
            </Button>
          )}
          {view === "completed" && (
            <>
              <Button variant="outline" onClick={() => { setView("queue"); fetchQueue(); }} className="gap-2">
                <ArrowRight className="h-4 w-4" />
                العودة للوحة
              </Button>
              <Button variant="ghost" size="icon" onClick={() => fetchQueue()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ===== VIEW 1: QUEUE ===== */}
      {view === "queue" && (
        <div className="space-y-6">
          {/* Error Banner */}
          {queueError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
              <AlertOctagon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-sm">{queueError}</span>
              <Button variant="ghost" size="sm" onClick={() => fetchQueue()} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* Notification Banner */}
          {activeBanner && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-emerald-600 via-emerald-500 to-blue-600 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-500">
              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-pulse" />
              <div className="relative z-10 p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-4 text-white">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative">
                    <BellRing className="h-8 w-8 text-emerald-200 animate-bounce" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{activeBanner.name}</span>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {activeBanner.patientCode}
                      </Badge>
                    </div>
                    <div className="text-sm text-emerald-100 flex items-center gap-2 mt-0.5">
                      <span>{activeBanner.serviceLabel}</span>
                      <span className="w-1 h-1 rounded-full bg-emerald-200" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-xs animate-pulse">
                    <Volume2 className="h-3 w-3 ml-1" />
                    يطلب الدخول!
                  </Badge>
                  <Button
                    size="sm"
                    className="bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 gap-1.5 shadow-lg font-semibold"
                    onClick={() => approveAndStartSession(activeBanner)}
                    disabled={approvingId === activeBanner.appointmentId}
                  >
                    {approvingId === activeBanner.appointmentId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                    موافقة ودخول المريض
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-transparent border-white/40 text-white hover:bg-white/20 gap-1.5"
                    onClick={() => deferPatient(activeBanner)}
                    disabled={approvingId === activeBanner.appointmentId}
                  >
                    <Hourglass className="h-4 w-4" />
                    تأجيل مؤقت
                  </Button>
                  <button
                    onClick={dismissBanner}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-r-4 border-r-amber-400 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">انتظار</div>
                  <div className="text-3xl font-bold text-amber-600">{waitingCount}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-r-4 border-r-blue-400 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <UserCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">قيد الكشف</div>
                  <div className="text-3xl font-bold text-blue-600">{inExamCount}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-r-4 border-r-emerald-400 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">تم الكشف اليوم</div>
                  <div className="text-3xl font-bold text-emerald-600">{completedCount}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-r-4 border-r-violet-400 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-l from-violet-50/40 to-transparent">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <Users className="h-6 w-6 text-violet-600" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">الإجمالي</div>
                  <div className="text-3xl font-bold text-violet-600">{totalCount}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Patient In-Exam */}
          {inExamCount > 0 && inExam.map((entry) => (
            <Card key={entry.appointmentId} className="border-2 border-blue-200 bg-gradient-to-l from-blue-50/60 to-transparent shadow-md overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                  <Activity className="h-5 w-5" />
                  قيد الكشف حالياً
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 mr-auto text-xs">
                    <Timer className="h-3 w-3 ml-1" />
                    {formatElapsed(elapsed)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <Avatar className={`h-14 w-14 flex items-center justify-center ring-2 ${
                      (entry.gender === "ذكر" || entry.gender === "male") 
                        ? "bg-blue-100 text-blue-600 ring-blue-200" 
                        : "bg-pink-100 text-pink-600 ring-pink-200"
                    }`}>
                      {(entry.gender === "ذكر" || entry.gender === "male") ? (
                        <User className="h-7 w-7" />
                      ) : (
                        <CircleUserRound className="h-7 w-7" />
                      )}
                    </Avatar>
                    <div>
                      <div className="font-bold text-lg">{entry.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                        <span className="flex items-center gap-1">
                          <UserRound className="h-3 w-3" />
                          {entry.age} سنة
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {entry.phone}
                        </span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {entry.patientCode}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-primary mt-1 flex items-center gap-2">
                        {entry.serviceLabel}
                        {entry.examFeePaid ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            تم دفع الكشفية
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            الكشفية غير مدفوعة
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                    <Button
                    onClick={async () => {
                      try {
                        const apt = appointments.find((a) => a.id === entry.appointmentId);
                        if (apt) {
                          setCurrentAppointment(apt);
                          setCurrentPatientData(apt.patients);
                          let visit = await getVisitByAppointment(entry.appointmentId);
                          if (!visit) {
                            visit = await createVisit({
                              patient_id: entry.patientId,
                              appointment_id: entry.appointmentId,
                              visit_date: today(),
                              services: [],
                              diagnosis: "",
                              total_fee: 0,
                            });
                          }
                          if (visit) {
                            setCurrentVisit(visit as VisitWithData);
                            activeVisitRef.current = visit.id;
                            if (!getStoredStart(visit.id)) {
                              setStoredStart(visit.id);
                            }
                            setDiagnosis(visit.diagnosis || "");
                            setTreatmentPlan(visit.treatment_plan || "");
                            setNotes(visit.notes || "");
                            setPrescription(visit.prescription || "");
                          }
                          setExamTab("exam");
                          setView("session");
                        }
                      } catch (err: any) {
                        toast({ title: "خطأ", description: err?.message || "فشل متابعة الكشف", variant: "destructive" });
                      }
                    }}
                    className="gap-2 shadow-md"
                    size="lg"
                  >
                    <Eye className="h-4 w-4" />
                    متابعة الكشف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Waiting List */}
          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                قائمة المرضى المنتظرين
                <Badge variant="secondary" className="mr-2">
                  {patientEntries.filter((p) =>
                    ["waiting_reception", "exam_fee_pending", "waiting",
                     "waiting_doctor_approval", "doctor_approved"].includes(p.status)
                  ).length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[450px]">
                {patientEntries.filter((p) =>
                  ["waiting_reception", "exam_fee_pending", "waiting",
                   "waiting_doctor_approval", "doctor_approved"].includes(p.status)
                ).length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                    <p className="text-lg font-medium">لا يوجد مرضى في قائمة الانتظار</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">
                      سوف يظهر المرضى هنا عندما يقوم الاستقبال بإضافتهم
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {[
                      ...waitingApproval.map((p) => ({ ...p, _group: "approval" as const })),
                      ...doctorApproved.map((p) => ({ ...p, _group: "approved" as const })),
                      ...regularWaiting.map((p) => ({ ...p, _group: "waiting" as const })),
                    ].map((entry) => (
                      <div
                        key={entry.appointmentId}
                        className={cn(
                          "flex items-center gap-4 p-4 transition-all",
                          entry._group === "approval"
                            ? "bg-red-50/80 hover:bg-red-100/60"
                            : entry._group === "approved"
                            ? "bg-emerald-50/80 hover:bg-emerald-100/60"
                            : "hover:bg-secondary/30"
                        )}
                      >
                        <div
                          className={cn(
                            "h-14 w-14 rounded-full flex items-center justify-center font-bold text-lg shrink-0 border-2",
                            entry._group === "approval"
                              ? "bg-red-100 text-red-600 border-red-200"
                              : entry._group === "approved"
                              ? "bg-emerald-100 text-emerald-600 border-emerald-200"
                              : "bg-primary/10 text-primary border-primary/20"
                          )}
                        >
                          {entry.queueNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base">{entry.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {entry.patientCode}
                            </Badge>
                            {entry._group === "approval" && (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-xs animate-pulse">
                                <Bell className="h-3 w-3 ml-1" />
                                يطلب الدخول
                              </Badge>
                            )}
                            {entry._group === "approved" && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                                <CheckCheck className="h-3 w-3 ml-1" />
                                سيصل قريباً
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
                            <span>{entry.age} سنة</span>
                            <span>{entry.gender === "female" ? "أنثى" : "ذكر"}</span>
                            <span className="text-primary/80 font-medium">
                              {entry.serviceLabel}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {entry._group === "approval" ? (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                onClick={() => approveAndStartSession(entry)}
                                disabled={approvingId === entry.appointmentId}
                              >
                                {approvingId === entry.appointmentId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCheck className="h-3.5 w-3.5" />
                                )}
                                موافقة
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-amber-300 text-amber-700 hover:bg-amber-50 gap-1"
                                onClick={() => deferPatient(entry)}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                تأجيل
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => startExamFromQueue(entry)}
                              className="gap-1.5"
                            >
                              <Stethoscope className="h-3.5 w-3.5" />
                              بدء الكشف
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Completed Today Preview */}
          {completedToday.length > 0 && (
            <Card className="shadow-md border-emerald-200">
              <CardHeader className="pb-3 border-b border-emerald-100">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  تم الكشف اليوم
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mr-2">
                    {completedToday.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {completedToday.slice(0, 5).map((entry) => (
                    <div
                      key={entry.appointmentId}
                      className="flex items-center gap-4 p-3 px-4 hover:bg-emerald-50/40 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
                        {entry.queueNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{entry.name}</div>
                        <div className="text-xs text-muted-foreground flex gap-3">
                          <span>{entry.serviceLabel}</span>
                        </div>
                      </div>
                      {entry.checkoutAt && (
                        <div className="text-xs text-muted-foreground shrink-0">
                          {new Date(entry.checkoutAt).toLocaleTimeString("ar-EG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                  {completedToday.length > 5 && (
                    <div className="p-3 text-center">
                      <Button
                        variant="link"
                        className="text-sm text-primary"
                        onClick={() => setView("completed")}
                      >
                        عرض الكل ({completedToday.length})
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== VIEW 2: SESSION ===== */}
      {view === "session" && currentAppointment && (
        <div className="space-y-6">
          {/* Patient Header */}
          <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
            <div className="bg-gradient-to-l from-primary/5 via-primary/[0.02] to-transparent p-4 md:p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={returnToQueue}
                    className="shrink-0 hover:bg-primary/10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className={`h-16 w-16 flex items-center justify-center text-white ring-4 ${
                    ((currentPatientData?.gender || currentAppointment?.patients?.gender) === "ذكر" || (currentPatientData?.gender || currentAppointment?.patients?.gender) === "male") 
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 ring-blue-500/20" 
                      : "bg-gradient-to-br from-pink-500 to-rose-500 ring-pink-500/20"
                  }`}>
                    {((currentPatientData?.gender || currentAppointment?.patients?.gender) === "ذكر" || (currentPatientData?.gender || currentAppointment?.patients?.gender) === "male") ? (
                      <User className="h-8 w-8" />
                    ) : (
                      <CircleUserRound className="h-8 w-8" />
                    )}
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold">
                        {currentPatientData?.name_ar || currentAppointment?.patients?.name_ar || "مريض"}
                      </h2>
                      {currentPatientData?.id_number && (
                        <Badge variant="outline" className="font-mono text-xs">
                          <Hash className="h-3 w-3 ml-1" />
                          هوية: {currentPatientData.id_number}
                        </Badge>
                      )}
                      {currentPatientData?.local_code && !currentPatientData?.id_number && (
                        <Badge variant="outline" className="font-mono text-xs">
                          <Hash className="h-3 w-3 ml-1" />
                          ملف: {currentPatientData.local_code}
                        </Badge>
                      )}
                      {currentAppointment?.exam_fee_paid ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          مدفوع {currentAppointment?.exam_fee_amount ? `(₪${currentAppointment.exam_fee_amount})` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          غير مدفوع {currentAppointment?.exam_fee_amount ? `(₪${currentAppointment.exam_fee_amount})` : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {getAge(currentPatientData?.date_of_birth)} سنة
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {getPatientPhone(currentPatientData)}
                      </span>
                      {currentPatientData?.gender && (
                        <span className="flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" />
                          {currentPatientData.gender === "male" ? "ذكر" : currentPatientData.gender === "female" ? "أنثى" : currentPatientData.gender}
                        </span>
                      )}
                      {currentPatientData?.marital_status && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {currentPatientData.marital_status === "single" ? "أعزب/عزباء" : currentPatientData.marital_status === "married" ? "متزوج/ة" : currentPatientData.marital_status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-sm px-3 py-1.5 w-fit">
                    <Timer className="h-3.5 w-3.5 ml-1.5" />
                    {formatElapsed(elapsed)}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Main Content + Addons Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Tabs Area */}
            <div className="lg:col-span-3 space-y-4">
              <Tabs value={examTab} onValueChange={setExamTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 sm:grid-cols-7 max-w-5xl">
                  <TabsTrigger value="exam" className="gap-2">
                    <Stethoscope className="h-4 w-4" />
                    <span className="hidden sm:inline">الكشف</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="gap-2">
                    <ClipboardList className="h-4 w-4" />
                    <span className="hidden sm:inline">السجل الطبي</span>
                  </TabsTrigger>
                  <TabsTrigger value="injections" className="gap-2">
                    <Syringe className="h-4 w-4" />
                    <span className="hidden sm:inline">الحقن</span>
                  </TabsTrigger>
                  <TabsTrigger value="followup" className="gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <span className="hidden sm:inline">المتابعة</span>
                  </TabsTrigger>
                  <TabsTrigger value="laser" className="gap-2">
                    <Zap className="h-4 w-4" />
                    <span className="hidden sm:inline">الليزر</span>
                  </TabsTrigger>
                  <TabsTrigger value="products" className="gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden sm:inline">المنتجات</span>
                  </TabsTrigger>
                  <TabsTrigger value="photos" className="gap-2" onClick={() => { if (currentPatientData?.id) { loadPhotos(currentPatientData.id); } }}>
                    <Image className="h-4 w-4" />
                    <span className="hidden sm:inline">معرض الصور</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: History */}
                <TabsContent value="history" className="space-y-4 mt-4">
                  {patientVisits.filter(v => v.id !== currentVisit?.id).length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">لا يوجد سجل طبي أو زيارات سابقة لهذا المريض</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {patientVisits.filter(v => v.id !== currentVisit?.id).map((v) => (
                        <Card key={v.id} className="border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent py-4 px-5 border-b">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                              <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
                                  <CalendarClock className="h-5 w-5" />
                                  زيارة بتاريخ: {new Date(v.visit_date || v.created_at).toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                                </CardTitle>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-emerald-600" /> دخول: {formatVisitTime(v.start_time)}</span>
                                  <span className="flex items-center gap-1.5"><ArrowRight className="h-4 w-4 text-rose-600" /> خروج: {formatVisitTime(v.end_time)}</span>
                                  {v.start_time && v.end_time && (
                                    <span className="flex items-center gap-1.5"><Timer className="h-4 w-4 text-slate-500" /> المدة: {(() => {
                                      try {
                                        const s = v.start_time.includes("T") ? new Date(v.start_time) : new Date(`1970-01-01T${v.start_time}Z`);
                                        const e = v.end_time.includes("T") ? new Date(v.end_time) : new Date(`1970-01-01T${v.end_time}Z`);
                                        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                                          const diffMins = Math.round((e.getTime() - s.getTime()) / 60000);
                                          if (diffMins > 0) return `${diffMins} دقيقة`;
                                        }
                                      } catch(e) {}
                                      return "غير معروف";
                                    })()}</span>
                                  )}
                                  <span className="flex items-center gap-1.5 font-semibold text-slate-800 border-r pr-4 border-slate-300">
                                    <ShoppingCart className="h-4 w-4 text-blue-600" /> 
                                    تم دفع: ₪{v.paid_amount || 0} من أصل ₪{v.total_fee || v.total_amount || 0}
                                  </span>
                                </div>
                              </div>
                              {v.services && v.services.length > 0 && (
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  {v.services.map((svc: string, idx: number) => (
                                    <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                      {svc}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-5 grid gap-4 grid-cols-1 md:grid-cols-2">
                            <div className="col-span-1 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2"><Stethoscope className="h-4 w-4 text-primary" /> التشخيص</h4>
                              {v.diagnosis ? (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{v.diagnosis}</p>
                              ) : (
                                <p className="text-sm text-slate-400 italic">لا يوجد تشخيص</p>
                              )}
                            </div>
                            <div className="col-span-1 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                              <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-emerald-600" /> خطة العلاج</h4>
                              {v.treatment_plan ? (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{v.treatment_plan}</p>
                              ) : (
                                <p className="text-sm text-slate-400 italic">لا يوجد خطة علاج</p>
                              )}
                            </div>
                            <div className="col-span-1 bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                              <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-2"><Pill className="h-4 w-4 text-amber-600" /> روشتة / وصفة طبية</h4>
                              {v.prescription ? (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{v.prescription}</p>
                              ) : (
                                <p className="text-sm text-slate-400 italic">لا يوجد وصفة طبية</p>
                              )}
                            </div>
                            <div className="col-span-1 md:col-span-2 bg-purple-50/50 p-4 rounded-xl border border-purple-100/50">
                              <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-2"><Package className="h-4 w-4 text-purple-600" /> الإجراءات الموصى بها والمنتجات</h4>
                              {v._addons && v._addons.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {v._addons.map((a: any) => (
                                    <Badge key={a.id} variant="outline" className="bg-white border-purple-200 text-purple-700">
                                      {a.name} {a.quantity > 1 ? `(العدد: ${a.quantity})` : ""}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400 italic">لا يوجد إجراءات أو منتجات</p>
                              )}
                            </div>
                            <div className="col-span-1 bg-rose-50/50 p-4 rounded-xl border border-rose-100/50">
                              <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2 mb-2"><Syringe className="h-4 w-4 text-rose-600" /> مناطق الوجه - خريطة الحقن</h4>
                              {v._injections && v._injections.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {v._injections.map((inj: any) => (
                                    <span key={inj.id} className="text-sm text-slate-700 font-medium">
                                      • <span className="text-rose-700">{inj.zone}</span>: {inj.product_name} {inj.units ? `(${inj.units} وحدة)` : ""}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400 italic">لا يوجد سجل حقن</p>
                              )}
                            </div>
                            <div className="col-span-1 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100/50">
                              <h4 className="text-sm font-bold text-cyan-800 flex items-center gap-2 mb-2"><Zap className="h-4 w-4 text-cyan-600" /> جلسة ليزر</h4>
                              {v._laser && v._laser.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {v._laser.map((las: any) => (
                                    <span key={las.id} className="text-sm text-slate-700 font-medium">
                                      • <span className="text-cyan-700">جهاز {las.device}</span>: {las.areas?.join("، ")} {las.settings ? `(${las.settings})` : ""}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400 italic">لا يوجد جلسات ليزر</p>
                              )}
                            </div>
                            <div className="col-span-1 md:col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                              <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-blue-600" /> ملاحظات إضافية</h4>
                              {v.notes ? (
                                <p className="text-sm whitespace-pre-wrap leading-relaxed text-slate-700">{v.notes.split("\n⏱ مدة الكشف")[0]}</p>
                              ) : (
                                <p className="text-sm text-slate-400 italic">لا توجد ملاحظات</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 1: Exam */}
                <TabsContent value="exam" className="space-y-4 mt-4">

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        التشخيص الحالي
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="أكتب التشخيص الطبي للجلسة الحالية..."
                        className="min-h-[120px] text-base leading-relaxed"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-emerald-600" />
                        خطة العلاج
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="أكتب خطة العلاج المقترحة..."
                        className="min-h-[120px] text-base leading-relaxed"
                        value={treatmentPlan}
                        onChange={(e) => setTreatmentPlan(e.target.value)}
                      />
                    </CardContent>
                  </Card>

                  {/* Procedures */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-600" />
                        الإجراءات الموصى بها
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {proceduresList.map((proc) => {
                          const selected = selectedProcedures.includes(proc);
                          return (
                            <Badge
                              key={proc}
                              className={cn(
                                "cursor-pointer transition-all text-sm py-1.5 px-3 gap-1.5 select-none",
                                selected
                                  ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
                                  : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 border"
                              )}
                              onClick={() => toggleProcedure(proc)}
                            >
                              {selected && <CheckCheck className="h-3 w-3" />}
                              {proc}
                              <span className="text-[10px] opacity-70">
                                (₪{procedurePrices[proc]})
                              </span>
                            </Badge>
                          );
                        })}
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">
                          الإجراءات المحددة:
                        </Label>
                        {selectedProcedures.length === 0 ? (
                          <p className="text-sm text-muted-foreground/60">
                            لم يتم تحديد أي إجراءات بعد
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedProcedures.map((p, i) => (
                              <Badge
                                key={i}
                                className="bg-purple-100 text-purple-700 border-purple-200 text-sm py-1.5 px-3 gap-1.5"
                              >
                                {p}
                                <button
                                  onClick={() =>
                                    setSelectedProcedures((prev) => prev.filter((_, j) => j !== i))
                                  }
                                  className="hover:text-red-500 mr-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        ملاحظات إضافية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="أكتب ملاحظات إضافية عن الجلسة..."
                        className="min-h-[80px]"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </CardContent>
                  </Card>

                  {/* Prescription */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Pill className="h-5 w-5 text-amber-600" />
                        روشتة / وصفة طبية
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="أكتب الوصفة الطبية... (نوع الدواء، الجرعة، المدة)"
                        className="min-h-[80px]"
                        value={prescription}
                        onChange={(e) => setPrescription(e.target.value)}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 2: Injections */}
                <TabsContent value="injections" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Syringe className="h-5 w-5 text-primary" />
                        مناطق الوجه - خريطة الحقن
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {faceZones.map((zone) => {
                          const zoneInjections = injections.filter(
                            (i) => i.zoneId === zone.value
                          );
                          const hasData = zoneInjections.length > 0;
                          return (
                            <div
                              key={zone.value}
                              className={cn(
                                "relative border rounded-xl p-3 text-center transition-all cursor-pointer hover:shadow-md hover:border-primary/40 group",
                                hasData
                                  ? "border-primary bg-primary/5 shadow-sm"
                                  : "border-border"
                              )}
                              onClick={() => openInjectionDialog(zone.value)}
                            >
                              <div className="text-xl mb-1">
                                {zone.label.slice(0, 2)}
                              </div>
                              <div className="text-xs font-medium">{zone.label}</div>
                              {hasData && (
                                <div className="mt-2 space-y-1">
                                  {zoneInjections.map((inj, idx) => (
                                    <div
                                      key={idx}
                                      className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 flex items-center justify-between gap-1"
                                    >
                                      <span className="truncate">
                                        {LABEL(inj.productType, injectableProducts)}
                                      </span>
                                      <span className="font-mono shrink-0">
                                        {inj.units}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setInjections((prev) =>
                                            prev.filter((_, j) =>
                                              !(prev[j].zoneId === inj.zoneId && j === idx)
                                            )
                                          );
                                        }}
                                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div
                                className={cn(
                                  "absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold transition-all",
                                  hasData
                                    ? "bg-primary scale-100"
                                    : "bg-muted-foreground/30 scale-75 opacity-60"
                                )}
                              >
                                {hasData ? zoneInjections.length : "+"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Injection Log Table */}
                  {injections.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Syringe className="h-5 w-5 text-primary" />
                          سجل الحقن
                          <Badge variant="secondary" className="mr-2">
                            {injections.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="max-h-[300px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>المنطقة</TableHead>
                                <TableHead>نوع المنتج</TableHead>
                                <TableHead>العلامة التجارية</TableHead>
                                <TableHead>الكمية</TableHead>
                                <TableHead className="w-12" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {injections.map((inj, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    {LABEL(inj.zoneId, faceZones)}
                                  </TableCell>
                                  <TableCell>
                                    {LABEL(inj.productType, injectableProducts)}
                                  </TableCell>
                                  <TableCell>
                                    {LABEL(inj.brand, brands)}
                                  </TableCell>
                                  <TableCell className="font-mono">
                                    {inj.units}
                                    {inj.productType === "botox" ? " وحدة" : " مل"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        setInjections((prev) =>
                                          prev.filter((_, j) => j !== idx)
                                        )
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Injection Dialog */}
                  <Dialog
                    open={injectionDialogOpen}
                    onOpenChange={(open) => {
                      setInjectionDialogOpen(open);
                      if (!open) {
                        setSelectedZone(null);
                        setInjectionForm({ productType: "", brand: "", units: 0 });
                      }
                    }}
                  >
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>
                          تسجيل حقن - {LABEL(selectedZone || "", faceZones)}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-2">
                        <div className="space-y-2">
                          <Label>نوع المنتج</Label>
                          <Select
                            value={injectionForm.productType}
                            onValueChange={(v) =>
                              setInjectionForm((p) => ({ ...p, productType: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المنتج" />
                            </SelectTrigger>
                            <SelectContent>
                              {injectableProducts.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>العلامة التجارية</Label>
                          <Select
                            value={injectionForm.brand}
                            onValueChange={(v) =>
                              setInjectionForm((p) => ({ ...p, brand: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر العلامة" />
                            </SelectTrigger>
                            <SelectContent>
                              {brands.map((b) => (
                                <SelectItem key={b.value} value={b.value}>
                                  {b.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>الكمية (مل / وحدة)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={injectionForm.units || ""}
                            onChange={(e) =>
                              setInjectionForm((p) => ({
                                ...p,
                                units: parseFloat(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            onClick={() => setInjectionDialogOpen(false)}
                          >
                            إلغاء
                          </Button>
                          <Button
                            onClick={saveInjection}
                            disabled={!injectionForm.productType || injectionForm.units <= 0}
                          >
                            حفظ
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TabsContent>

                {/* Tab 2b: Follow-up */}
                <TabsContent value="followup" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-emerald-600" />
                        الموعد القادم (متابعة)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Past follow-ups */}
                      {followUps.length > 0 && (
                        <div>
                          <Label className="text-sm text-muted-foreground mb-2 block">المواعيد السابقة</Label>
                          <div className="space-y-2">
                            {followUps.map((fu) => (
                              <div key={fu.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border text-sm">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-4 w-4 text-emerald-600" />
                                  <span>{new Date(fu.recommended_date + "T00:00:00").toLocaleDateString("ar-EG")}</span>
                                  {fu.interval_label && (
                                    <Badge variant="outline" className="text-xs">{fu.interval_label}</Badge>
                                  )}
                                </div>
                                <Badge className={cn(
                                  fu.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                                  fu.status === "cancelled" ? "bg-red-100 text-red-700" :
                                  "bg-amber-100 text-amber-700"
                                )}>
                                  {fu.status === "completed" ? "تم" : fu.status === "cancelled" ? "ملغي" : "قيد الانتظار"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Set follow-up */}
                      <div>
                        <Label className="text-sm text-muted-foreground mb-2 block">تحديد موعد متابعة جديد</Label>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {[
                            { label: "أسبوع", value: "أسبوع" },
                            { label: "أسبوعين", value: "أسبوعين" },
                            { label: "شهر", value: "شهر" },
                            { label: "شهرين", value: "شهرين" },
                            { label: "3 أشهر", value: "3 أشهر" },
                            { label: "4 أشهر", value: "4 أشهر" },
                            { label: "6 أشهر", value: "6 أشهر" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setFollowUpInterval(opt.value);
                                const d = new Date();
                                switch (opt.value) {
                                  case "أسبوع": d.setDate(d.getDate() + 7); break;
                                  case "أسبوعين": d.setDate(d.getDate() + 14); break;
                                  case "شهر": d.setMonth(d.getMonth() + 1); break;
                                  case "شهرين": d.setMonth(d.getMonth() + 2); break;
                                  case "3 أشهر": d.setMonth(d.getMonth() + 3); break;
                                  case "4 أشهر": d.setMonth(d.getMonth() + 4); break;
                                  case "6 أشهر": d.setMonth(d.getMonth() + 6); break;
                                }
                                setFollowUpDate(d.toISOString().slice(0, 10));
                              }}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                followUpInterval === opt.value
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                  : "bg-white text-muted-foreground border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
                              )}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div className="space-y-2">
                            <Label>أو اختر تاريخ محدد</Label>
                            <Input
                              type="date"
                              value={followUpDate}
                              onChange={e => setFollowUpDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>ملاحظات</Label>
                            <Input
                              value={followUpNotes}
                              onChange={e => setFollowUpNotes(e.target.value)}
                              placeholder="ملاحظة..."
                            />
                          </div>
                        </div>
                        <Button
                          onClick={handleFollowUpConfirm}
                          disabled={!followUpDate || followUpSaving}
                          className="mt-4 gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700"
                        >
                          {followUpSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CalendarPlus className="h-4 w-4" />
                          )}
                          حفظ موعد المتابعة
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 3: Laser */}
                <TabsContent value="laser" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        إضافة جلسة ليزر
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>جهاز الليزر</Label>
                          <Select
                            value={laserForm.device}
                            onValueChange={(v) =>
                              setLaserForm((p) => ({ ...p, device: v }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الجهاز" />
                            </SelectTrigger>
                            <SelectContent>
                              {laserDevices.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {([
                          { key: "spotSize" as const, label: "حجم البقعة (mm)", step: 0.5, placeholder: "مثال: 7" },
                          { key: "fluence" as const, label: "Fluence (J/cm²)", step: 0.1, placeholder: "مثال: 12.5" },
                          { key: "pulseWidth" as const, label: "عرض النبضة (ms)", step: 0.1, placeholder: "مثال: 3" },
                          { key: "passes" as const, label: "عدد التمريرات", step: 1, placeholder: "مثال: 2" },
                        ] as const).map((f) => (
                          <div key={f.key} className="space-y-2">
                            <Label>{f.label}</Label>
                            <Input
                              type="number"
                              step={f.step}
                              min="0.1"
                              placeholder={f.placeholder}
                              value={(laserForm[f.key] as number) || ""}
                              onChange={(e) =>
                                setLaserForm((p) => ({
                                  ...p,
                                  [f.key]: parseFloat(e.target.value) || 0,
                                }))
                              }
                            />
                          </div>
                        ))}
                        <div className="space-y-2">
                          <Label>المنطقة المعالجة</Label>
                          <Input
                            placeholder="مثال: الخدين والجبهة"
                            value={laserForm.areaTreated}
                            onChange={(e) =>
                              setLaserForm((p) => ({
                                ...p,
                                areaTreated: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                          <Label>ملاحظات</Label>
                          <Input
                            placeholder="تخدير، رد فعل، إلخ"
                            value={laserForm.notes}
                            onChange={(e) =>
                              setLaserForm((p) => ({ ...p, notes: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <Button
                        onClick={addLaserSession}
                        disabled={!laserForm.device || !laserForm.areaTreated}
                        className="mt-4 gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة الجلسة
                      </Button>
                    </CardContent>
                  </Card>

                  {laserSessions.length === 0 ? (
                    <Card>
                      <CardContent className="py-10 text-center text-muted-foreground">
                        <Zap className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p>لم يتم تسجيل أي جلسات ليزر بعد</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          استخدم النموذج أعلاه لإضافة جلسة
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="h-5 w-5 text-primary" />
                          سجل جلسات الليزر
                          <Badge variant="secondary" className="mr-2">
                            {laserSessions.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="max-h-[300px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">#</TableHead>
                                <TableHead>الجهاز</TableHead>
                                <TableHead>حجم البقعة</TableHead>
                                <TableHead>Fluence</TableHead>
                                <TableHead>عرض النبضة</TableHead>
                                <TableHead>التمريرات</TableHead>
                                <TableHead>المنطقة</TableHead>
                                <TableHead>ملاحظات</TableHead>
                                <TableHead className="w-12" />
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {laserSessions.map((s) => (
                                <TableRow key={s.id}>
                                  <TableCell className="font-mono text-xs">
                                    {laserSessions.indexOf(s) + 1}
                                  </TableCell>
                                  <TableCell>
                                    {LABEL(s.device, laserDevices)}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {s.spotSize} mm
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {s.fluence} J/cm²
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {s.pulseWidth} ms
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">
                                    {s.passes}
                                  </TableCell>
                                  <TableCell className="text-xs max-w-[100px] truncate">
                                    {s.areaTreated}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
                                    {s.notes || "-"}
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={() =>
                                        setLaserSessions((prev) =>
                                          prev.filter((x) => x.id !== s.id)
                                        )
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab 4: Products */}
                <TabsContent value="products" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-5 w-5 text-emerald-600" />
                        المنتجات
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        اختر المنتجات التي توصي بها للمريضة لتضاف إلى فاتورة الجلسة
                      </p>
                    </CardHeader>
                    <CardContent>
                      {productsLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="border rounded-xl p-4">
                              <Skeleton className="h-10 w-10 rounded-lg mb-2" />
                              <Skeleton className="h-4 w-24 mb-1" />
                              <Skeleton className="h-5 w-16" />
                            </div>
                          ))}
                        </div>
                      ) : products.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                          <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                          <p>لا توجد منتجات متاحة</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            قم بإضافة منتجات من خلال لوحة المخزون
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {products.filter((p) => p.stock_quantity > 0).map((product) => {
                            const inAddons = sessionAddons.some(
                              (a) => a.name === product.name && a.type === "product"
                            );
                            return (
                              <div
                                key={product.id}
                                className={cn(
                                  "border rounded-xl p-4 transition-all cursor-pointer hover:shadow-md group",
                                  inAddons
                                    ? "border-emerald-300 bg-emerald-50/60 shadow-sm"
                                    : "border-border hover:border-emerald-300"
                                )}
                                onClick={() => addRecommendedProduct(product)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div
                                    className={cn(
                                      "h-10 w-10 rounded-lg flex items-center justify-center",
                                      inAddons
                                        ? "bg-emerald-200 text-emerald-700"
                                        : "bg-secondary text-muted-foreground"
                                    )}
                                  >
                                    <Package className="h-5 w-5" />
                                  </div>
                                  {inAddons && (
                                    <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                                      <CheckCheck className="h-3 w-3" />
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm mb-1">
                                  {product.name}
                                </h4>
                                <div className="text-sm font-bold text-emerald-600">
                                  ₪{product.sale_price}
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  المخزون: {product.stock_quantity} {product.unit}
                                </div>
                                {inAddons && (
                                  <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                    <CheckCheck className="h-3 w-3" />
                                    تمت الإضافة
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {products.filter((p) => p.stock_quantity > 0).length === 0 && (
                            <div className="col-span-full py-8 text-center text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                              <p>جميع المنتجات نفذت من المخزون</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 5: Photos */}
                <TabsContent value="photos" className="space-y-4 mt-4">
                  {currentPatientData ? (
                    <>
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <Image className="h-5 w-5 text-primary" />
                          معرض صور المريض
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant={compareMode ? "default" : "outline"}
                            size="sm"
                            className={cn("gap-2", compareMode ? "bg-primary text-white" : "")}
                            onClick={() => {
                              if (compareMode) {
                                setCompareMode(false);
                                setComparePhotos([]);
                              } else {
                                setCompareMode(true);
                                setComparePhotos([]);
                                toast({ title: "وضع المقارنة", description: "اختر صورتين للمقارنة بينهما" });
                              }
                            }}
                          >
                            <SplitSquareHorizontal className="h-4 w-4" />
                            {compareMode ? "إلغاء المقارنة" : "مقارنة قبل وبعد"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={async () => {
                              const url = `${window.location.origin}/patient-photo?patient=${currentPatientData.id}`;
                              try {
                                const QRCode = (await import("qrcode")).default;
                                const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#1e3a5f", light: "#ffffff" } });
                                setQrPhotoUrl(dataUrl);
                                setQrDialogType("upload");
                                setShowQrDialog(true);
                              } catch {
                                navigator.clipboard.writeText(url);
                                toast({ title: "تم", description: "تم نسخ الرابط" });
                              }
                            }}
                          >
                            <QrCode className="h-4 w-4" />
                            رابط الرفع السريع
                          </Button>
                        </div>
                      </div>

                      {/* Upload photo form */}
                      <Card className="mb-6">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Upload className="h-4 w-4 text-primary" />
                            إضافة صورة للمعرض
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-1">
                                <Input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handlePhotoFileChange}
                                  disabled={uploadingPhoto}
                                  className="h-10 cursor-pointer"
                                />
                              </div>
                              <Button
                                variant="outline"
                                className="h-10 shrink-0 gap-2"
                                onClick={handleCameraCapture}
                                disabled={uploadingPhoto}
                              >
                                <Camera className="h-4 w-4" />
                                <span className="hidden sm:inline">الكاميرا</span>
                              </Button>
                            </div>
                            {photoPreview && (
                              <div className="flex flex-col sm:flex-row gap-4 items-start bg-muted/20 p-4 rounded-xl border">
                                <div className="relative rounded-lg overflow-hidden border max-w-xs shrink-0 shadow-sm">
                                  <img src={photoPreview} alt="Preview" className="w-48 h-48 object-cover" />
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-7 w-7 rounded-full opacity-80 hover:opacity-100"
                                    onClick={() => setPhotoPreview(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="flex-1 w-full space-y-3">
                                  <Textarea
                                    value={photoNotes}
                                    onChange={e => setPhotoNotes(e.target.value)}
                                    placeholder="أضف ملاحظات اختيارية حول هذه الصورة..."
                                    className="resize-none h-24"
                                  />
                                  <Button
                                    onClick={() => {
                                      setPhotoType("after"); // defaults to after
                                      handlePhotoUpload();
                                    }}
                                    disabled={!photoPreview || uploadingPhoto}
                                    className="w-full gap-2"
                                  >
                                    {uploadingPhoto ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4" />
                                    )}
                                    {uploadingPhoto ? "جاري رفع الصورة..." : "اعتماد ورفع الصورة"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Photos Gallery */}
                      {photosLoading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                          <p className="text-muted-foreground text-sm">جاري تحميل المعرض...</p>
                        </div>
                      ) : photos.length > 0 ? (
                        <div>
                          {compareMode && (
                            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4 text-sm text-primary flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <SplitSquareHorizontal className="h-4 w-4" />
                                <span>الرجاء تحديد صورتين للمقارنة ({comparePhotos.length}/2)</span>
                              </div>
                              {comparePhotos.length === 2 && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-white shadow-md font-bold">
                                      عرض المقارنة الآن
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle className="flex items-center gap-2 text-primary text-xl">
                                        <SplitSquareHorizontal className="h-6 w-6" />
                                        مقارنة صور المريض: {currentPatientData.name_ar}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                      {comparePhotos.map((p, idx) => (
                                        <div key={idx} className="space-y-3">
                                          <div className="flex justify-between items-center text-sm">
                                            <Badge variant={idx === 0 ? "secondary" : "default"} className={idx === 0 ? "bg-slate-200 text-slate-800" : "bg-emerald-100 text-emerald-800"}>
                                              {idx === 0 ? "الصورة الأولى (قبل)" : "الصورة الثانية (بعد)"}
                                            </Badge>
                                            <span className="text-muted-foreground font-mono text-xs">
                                              {p.created_at ? new Date(p.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : ""}
                                            </span>
                                          </div>
                                          <div className="rounded-xl overflow-hidden border-2 shadow-sm bg-black">
                                            <img src={p.cloudinary_url} alt="Compare" className="w-full object-contain max-h-[500px]" />
                                          </div>
                                          {p.notes && <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border">{p.notes}</p>}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex justify-center mt-6">
                                      <Button variant="outline" onClick={() => { setCompareMode(false); setComparePhotos([]); }} className="w-32">
                                        إنهاء المقارنة
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {photos.map(photo => {
                              const isSelectedForCompare = comparePhotos.some(p => p.id === photo.id);
                              return (
                                <div 
                                  key={photo.id} 
                                  className={cn(
                                    "rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-card group relative",
                                    compareMode ? "hover:border-primary hover:shadow-md" : "hover:border-slate-300",
                                    isSelectedForCompare ? "border-primary shadow-md ring-2 ring-primary/30" : "border-border"
                                  )}
                                  onClick={() => {
                                    if (compareMode) {
                                      if (isSelectedForCompare) {
                                        setComparePhotos(prev => prev.filter(p => p.id !== photo.id));
                                      } else if (comparePhotos.length < 2) {
                                        setComparePhotos(prev => [...prev, photo]);
                                      } else {
                                        toast({ title: "الحد الأقصى", description: "يمكنك مقارنة صورتين فقط في نفس الوقت", variant: "destructive" });
                                      }
                                    } else {
                                      window.open(photo.cloudinary_url, '_blank');
                                    }
                                  }}
                                >
                                  <div className="relative aspect-square bg-muted/10">
                                    <img
                                      src={photo.cloudinary_url}
                                      alt="Patient"
                                      className="w-full h-full object-cover"
                                    />
                                    {compareMode && (
                                      <div className={cn(
                                        "absolute top-2 right-2 h-6 w-6 rounded-full border-2 flex items-center justify-center bg-white/80 transition-colors",
                                        isSelectedForCompare ? "border-primary bg-primary text-white" : "border-slate-400 text-transparent"
                                      )}>
                                        <CheckCheck className="h-3.5 w-3.5" />
                                      </div>
                                    )}
                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                                      <p className="text-[11px] font-medium text-white shadow-sm flex items-center justify-between">
                                        <span>{photo.created_at ? new Date(photo.created_at).toLocaleDateString("ar-EG") : ""}</span>
                                      </p>
                                    </div>
                                  </div>
                                  {photo.notes && (
                                    <div className="p-2 text-[10px] text-muted-foreground bg-slate-50 border-t truncate" title={photo.notes}>
                                      {photo.notes}
                                    </div>
                                  )}
                                  {!compareMode && (
                                    <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-100 transition-opacity">
                                      <div className="flex flex-col gap-1">
                                        <Button variant="secondary" size="sm" className="h-7 px-2 shadow-sm bg-white/90 hover:bg-white text-blue-600 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); handleShareLink(photo); }} title="مشاركة الرابط">
                                          <Share2 className="h-3.5 w-3.5" />
                                          مشاركة
                                        </Button>
                                        <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm bg-white/90 hover:bg-white text-slate-700" onClick={(e) => { e.stopPropagation(); handleShowQr(photo); }} title="عرض كود QR">
                                          <QrCode className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                      <Button variant="destructive" size="icon" className="h-7 w-7 shadow-sm opacity-90 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }} title="حذف">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="py-16 text-center text-muted-foreground bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Image className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                          <p className="text-lg font-medium text-slate-600 mb-2">لا توجد صور في المعرض</p>
                          <p className="text-sm">يمكنك إضافة صور جديدة من الجهاز أو تصوير المريض مباشرة لتكوين معرض صوره الخاص</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card>
                      <CardContent className="py-16 text-center text-muted-foreground">
                        <User className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                        <p className="text-xl font-medium text-slate-600">اختر مريضاً أولاً</p>
                        <p className="text-sm mt-2">اختر مريضاً من الطابور لعرض المعرض الخاص به</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Addons Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4 shadow-md border-primary/10 bg-gradient-to-b from-primary/[0.02] to-transparent">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    ملخص الجلسة
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {/* Quick Add */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-between text-xs gap-2"
                      onClick={() => setQuickAddOpen(!quickAddOpen)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      إضافة خدمة/منتج
                      {quickAddOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {quickAddOpen && (
                      <div className="mt-2 space-y-1.5">
                        <Select
                          value={quickAddValue}
                          onValueChange={(v) => setQuickAddValue(v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="اختر..." />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium">
                              الخدمات
                            </div>
                            {proceduresList.map((p) => (
                              <SelectItem key={p} value={p} className="text-xs">
                                {p} (₪{procedurePrices[p]})
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1 text-[10px] text-muted-foreground font-medium mt-1">
                              المنتجات
                            </div>
                            {products.filter((pr) => pr.stock_quantity > 0).map((p) => (
                              <SelectItem
                                key={p.id}
                                value={`prod_${p.id}`}
                                className="text-xs"
                              >
                                {p.name} (₪{p.sale_price})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="w-full h-7 text-xs"
                          disabled={!quickAddValue}
                          onClick={() => {
                            if (quickAddValue.startsWith("prod_")) {
                              const prodId = parseInt(quickAddValue.replace("prod_", ""));
                              const prod = products.find((p) => p.id === prodId);
                              if (prod) addRecommendedProduct(prod);
                            } else {
                              const price = procedurePrices[quickAddValue];
                              if (price !== undefined) {
                                addAddon(quickAddValue, "service", price);
                              }
                            }
                            setQuickAddValue("");
                            setQuickAddOpen(false);
                          }}
                        >
                          إضافة
                        </Button>
                      </div>
                    )}
                  </div>

                  <ScrollArea className="max-h-[350px] -mx-1 px-1">
                    {sessionAddons.length === 0 ? (
                      <div className="py-6 text-center">
                        <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                        <p className="text-xs text-muted-foreground/60">
                          لم يتم إضافة خدمات أو منتجات بعد
                        </p>
                        <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                          استخدم زر الإضافة أو اختر إجراءات من علامة الكشف
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {sessionAddons.map((addon) => (
                          <div
                            key={addon.id}
                            className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-secondary/30 transition-colors group"
                          >
                            <div
                              className={cn(
                                "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                                addon.type === "service"
                                  ? "bg-purple-100 text-purple-600"
                                  : "bg-emerald-100 text-emerald-600"
                              )}
                            >
                              {addon.type === "service" ? (
                                <Stethoscope className="h-3.5 w-3.5" />
                              ) : (
                                <Package className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                {addon.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground flex gap-2">
                                <span>
                                  {addon.quantity > 1
                                    ? `${addon.quantity} × ₪${addon.price}`
                                    : `₪${addon.price}`}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs font-bold shrink-0">
                              ₪{addon.price * addon.quantity}
                            </div>
                            <button
                              onClick={() => removeAddon(addon.id)}
                              className="text-muted-foreground/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <Separator />

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>خدمات:</span>
                      <span>
                        ₪
                        {sessionAddons
                          .filter((a) => a.type === "service")
                          .reduce((s, a) => s + a.price * a.quantity, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>منتجات:</span>
                      <span>
                        ₪
                        {sessionAddons
                          .filter((a) => a.type === "product")
                          .reduce((s, a) => s + a.price * a.quantity, 0)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-base text-primary">
                      <span>الإجمالي:</span>
                      <span>₪{addonTotal}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <Card className="bg-gradient-to-l from-primary/5 via-primary/[0.02] to-transparent border-primary/20 shadow-lg">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={returnToQueue}
                >
                  <ArrowRight className="h-4 w-4" />
                  رجوع
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4" />
                  طباعة التقرير
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="gap-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={saveDraft}
                  disabled={sessionSaving}
                >
                  {sessionSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ المسودة
                </Button>
                <Button
                  onClick={finishSession}
                  disabled={sessionSaving}
                  className="gap-2 bg-gradient-to-l from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-lg text-base px-6 py-2.5 h-auto"
                  size="lg"
                >
                  {sessionSaving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  إنهاء الجلسة وإرسال للمحاسبة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Follow-up Dialog (after finish session) */}
      <Dialog open={showFollowUpDialog} onOpenChange={(open) => {
        if (!open) handleFollowUpSkip();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-emerald-600" />
              تحديد موعد متابعة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <p className="text-sm text-muted-foreground">
              هل ترغب في تحديد موعد متابعة للمريض <strong>{currentPatientData?.name_ar || currentAppointment?.patients?.name_ar || ""}</strong>؟
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "أسبوع", value: "أسبوع" },
                { label: "أسبوعين", value: "أسبوعين" },
                { label: "شهر", value: "شهر" },
                { label: "شهرين", value: "شهرين" },
                { label: "3 أشهر", value: "3 أشهر" },
                { label: "4 أشهر", value: "4 أشهر" },
                { label: "6 أشهر", value: "6 أشهر" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setFollowUpInterval(opt.value);
                    const d = new Date();
                    switch (opt.value) {
                      case "أسبوع": d.setDate(d.getDate() + 7); break;
                      case "أسبوعين": d.setDate(d.getDate() + 14); break;
                      case "شهر": d.setMonth(d.getMonth() + 1); break;
                      case "شهرين": d.setMonth(d.getMonth() + 2); break;
                      case "3 أشهر": d.setMonth(d.getMonth() + 3); break;
                      case "4 أشهر": d.setMonth(d.getMonth() + 4); break;
                      case "6 أشهر": d.setMonth(d.getMonth() + 6); break;
                    }
                    setFollowUpDate(d.toISOString().slice(0, 10));
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    followUpInterval === opt.value
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-white text-muted-foreground border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>التاريخ المحدد</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={e => setFollowUpDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Input
                  value={followUpNotes}
                  onChange={e => setFollowUpNotes(e.target.value)}
                  placeholder="ملاحظة..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={handleFollowUpSkip}>
                تخطي
              </Button>
              <Button
                onClick={handleFollowUpConfirm}
                disabled={!followUpDate || followUpSaving}
                className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700"
              >
                {followUpSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
                حفظ الموعد
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== VIEW 3: COMPLETED ===== */}
      {view === "completed" && (
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم، الكود، أو الجوال..."
                    className="pr-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={completedFilter}
                    onValueChange={setCompletedFilter}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="exam_completed">بانتظار المحاسبة</SelectItem>
                      <SelectItem value="completed">مكتمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                المرضى المنجزون
                <Badge variant="secondary" className="mr-2">
                  {filteredCompleted.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الخدمة</TableHead>
                    <TableHead>وقت الإنجاز</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompleted.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        {searchQuery
                          ? "لا توجد نتائج للبحث"
                          : "لا يوجد مرضى منجزون اليوم"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCompleted
                      .filter((p) =>
                        completedFilter === "all"
                          ? true
                          : p.status === completedFilter
                      )
                      .map((entry, index) => (
                        <TableRow
                          key={entry.appointmentId}
                          className="hover:bg-secondary/20 cursor-pointer"
                          onClick={() => openCompletedDetail(entry)}
                        >
                          <TableCell className="font-mono text-xs">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{entry.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {entry.patientCode}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-sm">{entry.serviceLabel}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {entry.checkoutAt
                              ? new Date(entry.checkoutAt).toLocaleTimeString("ar-EG", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {entry.status === "completed" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                مكتمل
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                بانتظار المحاسبة
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-left">
                            <Dialog
                              open={selectedCompleted?.appointmentId === entry.appointmentId}
                              onOpenChange={(open) => {
                                if (!open) setSelectedCompleted(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCompletedDetail(entry);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-lg">
                                    <FileText className="h-5 w-5 text-primary" />
                                    تفاصيل الجلسة - {selectedCompleted?.name}
                                  </DialogTitle>
                                </DialogHeader>
                                {completedDetailLoading ? (
                                  <div className="space-y-4 p-4">
                                    {[...Array(6)].map((_, i) => <Skeleton key={i} className={`h-${i < 2 ? 20 : i < 4 ? 16 : 24} w-full`} />)}
                                  </div>
                                ) : completedDetailError ? (
                                  <div className="p-12 text-center">
                                    <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-3" />
                                    <p className="text-red-500 font-medium mb-3">{completedDetailError}</p>
                                    <Button variant="outline" onClick={() => selectedCompleted && openCompletedDetail(selectedCompleted)}>
                                      إعادة المحاولة
                                    </Button>
                                  </div>
                                ) : selectedCompleted ? (
                                  <div className="space-y-4 py-2">
                                    {/* Patient Info Header */}
                                    <div className="bg-gradient-to-l from-primary/5 via-primary/[0.02] to-background border rounded-xl p-4">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                        {[
                                          { label: "كود المريض", value: selectedCompleted.patientCode, icon: <Hash className="h-3.5 w-3.5" /> },
                                          { label: "العمر", value: `${selectedCompleted.age} سنة`, icon: <User className="h-3.5 w-3.5" /> },
                                          { label: "الجوال", value: selectedCompleted.phone, icon: <Phone className="h-3.5 w-3.5" />, ltr: true },
                                          { label: "الخدمة", value: selectedCompleted.serviceLabel, icon: <Stethoscope className="h-3.5 w-3.5" /> },
                                        ].map((item, i) => (
                                          <div key={i} className="flex items-center gap-2">
                                            <span className="text-primary/60">{item.icon}</span>
                                            <div>
                                              <div className="text-xs text-muted-foreground">{item.label}</div>
                                              <div className={`font-medium ${item.ltr ? "dir-ltr text-left" : ""}`}>{item.value}</div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {(selectedCompleted as any)._visit ? (
                                      <>
                                        {/* Timing */}
                                        <div className="grid grid-cols-3 gap-3">
                                          {[
                                            { label: "وقت الدخول", value: (selectedCompleted as any)._visit.start_time ? new Date((selectedCompleted as any)._visit.start_time).toLocaleTimeString("ar-EG") : "-", icon: <LogIn className="h-4 w-4" />, color: "text-blue-600" },
                                            { label: "وقت الخروج", value: (selectedCompleted as any)._visit.end_time ? new Date((selectedCompleted as any)._visit.end_time).toLocaleTimeString("ar-EG") : "-", icon: <LogOut className="h-4 w-4" />, color: "text-orange-600" },
                                            { label: "مدة الكشف", value: (selectedCompleted as any)._visit.notes?.match(/⏱ مدة الكشف: (.+)/)?.[1] || "-", icon: <Timer className="h-4 w-4" />, color: "text-emerald-600" },
                                          ].map((item, i) => (
                                            <Card key={i} className="bg-gradient-to-b from-background to-muted/20">
                                              <CardContent className="p-3 text-center">
                                                <div className={`flex items-center justify-center gap-1 ${item.color} text-xs mb-1`}>
                                                  {item.icon}
                                                  {item.label}
                                                </div>
                                                <div className="font-bold text-sm">{item.value}</div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>

                                        {/* Diagnosis */}
                                        {(selectedCompleted as any)._visit.diagnosis && (
                                          <Card className="border-primary/10">
                                            <CardHeader className="pb-2 pt-3">
                                              <CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />التشخيص</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{(selectedCompleted as any)._visit.diagnosis}</p>
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* Treatment Plan */}
                                        {(selectedCompleted as any)._visit.treatment_plan && (
                                          <Card className="border-blue-200/50">
                                            <CardHeader className="pb-2 pt-3">
                                              <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" />خطة العلاج</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{(selectedCompleted as any)._visit.treatment_plan}</p>
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* Prescription */}
                                        {(selectedCompleted as any)._visit.prescription && (
                                          <Card className="border-amber-200/50">
                                            <CardHeader className="pb-2 pt-3">
                                              <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-amber-600" />الوصفة الطبية</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{(selectedCompleted as any)._visit.prescription}</p>
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* Doctor Notes */}
                                        {(selectedCompleted as any)._visit.notes && (
                                          <Card className="border-purple-200/50">
                                            <CardHeader className="pb-2 pt-3">
                                              <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-purple-600" />ملاحظات الطبيب</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{(selectedCompleted as any)._visit.notes.split("\n⏱ مدة الكشف")[0]}</p>
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* Session Addons */}
                                        {(selectedCompleted as any)._addons?.length > 0 && (
                                          <Card className="border-teal-200/50">
                                            <CardHeader className="pb-2 pt-3">
                                              <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-teal-600" />إضافات الجلسة</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead className="text-right">النوع</TableHead>
                                                    <TableHead className="text-right">الاسم</TableHead>
                                                    <TableHead className="text-center">العدد</TableHead>
                                                    <TableHead className="text-center">سعر الوحدة</TableHead>
                                                    <TableHead className="text-center">الإجمالي</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {(selectedCompleted as any)._addons.map((a: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                      <TableCell><Badge variant="outline" className="text-xs">{a.item_type === "service" ? "خدمة" : "منتج"}</Badge></TableCell>
                                                      <TableCell className="font-medium">{a.name}</TableCell>
                                                      <TableCell className="text-center">{a.quantity}</TableCell>
                                                      <TableCell className="text-center">{a.unit_price} ج.م</TableCell>
                                                      <TableCell className="text-center font-medium">{a.total_price} ج.م</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* Injections */}
                                        {(selectedCompleted as any)._injections?.length > 0 && (
                                          <Card className="border-rose-200/50">
                                            <CardHeader className="pb-2 pt-3">
                                              <CardTitle className="text-sm flex items-center gap-2"><Syringe className="h-4 w-4 text-rose-600" />سجل الحقن</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead className="text-right">المنطقة</TableHead>
                                                    <TableHead className="text-right">المنتج</TableHead>
                                                    <TableHead className="text-right">العلامة التجارية</TableHead>
                                                    <TableHead className="text-center">الوحدات</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {(selectedCompleted as any)._injections.map((inj: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                      <TableCell className="font-medium">{inj.zone || inj.zoneId}</TableCell>
                                                      <TableCell>{inj.product_name || inj.productType}</TableCell>
                                                      <TableCell>{inj.brand || "-"}</TableCell>
                                                      <TableCell className="text-center">{inj.units || "-"}</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* Laser Sessions */}
                                        {(selectedCompleted as any)._laser?.length > 0 && (
                                          <Card className="border-violet-200/50">
                                            <CardHeader className="pb-2 pt-3">
                                              <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-violet-600" />جلسات الليزر</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead className="text-right">الجهاز</TableHead>
                                                    <TableHead className="text-center">البقعة</TableHead>
                                                    <TableHead className="text-center">الجرعة</TableHead>
                                                    <TableHead className="text-center">العرض النبضي</TableHead>
                                                    <TableHead className="text-center">عدد التمريرات</TableHead>
                                                    <TableHead className="text-right">المنطقة</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {(selectedCompleted as any)._laser.map((s: any) => (
                                                    <TableRow key={s.id}>
                                                      <TableCell className="font-medium">{s.device}</TableCell>
                                                      <TableCell className="text-center">{s.spot_size || "-"}</TableCell>
                                                      <TableCell className="text-center">{s.fluence ? `${s.fluence} J/cm²` : "-"}</TableCell>
                                                      <TableCell className="text-center">{s.pulse_width || "-"}</TableCell>
                                                      <TableCell className="text-center">{s.passes || "-"}</TableCell>
                                                      <TableCell>{s.area || "-"}</TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </CardContent>
                                          </Card>
                                        )}

                                        {/* Financial Summary */}
                                        <Card className="bg-gradient-to-l from-emerald-50 to-amber-50 border-emerald-200/50 dark:from-emerald-950/20 dark:to-amber-950/20">
                                          <CardContent className="p-4">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                              <div>
                                                <div className="text-xs text-muted-foreground mb-1">إجمالي الرسوم</div>
                                                <div className="font-bold text-lg">{(selectedCompleted as any)._visit.total_fee || 0} ج.م</div>
                                              </div>
                                              <div>
                                                <div className="text-xs text-muted-foreground mb-1">المدفوع</div>
                                                <div className="font-bold text-lg text-emerald-600">{(selectedCompleted as any)._visit.paid_amount || 0} ج.م</div>
                                              </div>
                                              <div>
                                                <div className="text-xs text-muted-foreground mb-1">المتبقي</div>
                                                <div className="font-bold text-lg text-red-600">{((selectedCompleted as any)._visit.total_fee || 0) - ((selectedCompleted as any)._visit.paid_amount || 0)} ج.م</div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>

                                        <Separator />
                                        {/* Status Footer */}
                                        <div className="flex justify-between items-center">
                                          <Badge className={selectedCompleted.status === "completed" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                                            {selectedCompleted.status === "completed" ? "مكتمل" : "بانتظار المحاسبة"}
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">
                                            {selectedCompleted.checkoutAt && new Date(selectedCompleted.checkoutAt).toLocaleString("ar-EG")}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="py-12 text-center text-muted-foreground">
                                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                        <p>لا توجد تفاصيل إضافية للجلسة</p>
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== VIEW 4: BOOKINGS ===== */}
      {view === "bookings" && <BookingSection />}

      {/* Global Notification Toast */}
      {showNotification && waitingApproval.length > 0 && (
        <div className="fixed top-4 left-4 z-50 animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="bg-gradient-to-l from-red-500 to-rose-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <BellRing className="h-5 w-5 animate-bounce" />
            <div>
              <div className="font-bold text-sm">
                {waitingApproval.length} مريض يطلب الدخول
              </div>
              <div className="text-xs text-red-100">
                {waitingApproval.map((p) => p.name).join("، ")}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-white/80 hover:text-white"
              onClick={() => setShowNotification(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Visit Detail Dialog */}
      <Dialog open={!!selectedVisitDetail} onOpenChange={(o) => { if (!o) setSelectedVisitDetail(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              تفاصيل الزيارة
            </DialogTitle>
          </DialogHeader>
          {visitDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedVisitDetail ? (
            <div className="space-y-4">
              {/* Visit header */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedVisitDetail.visit_date || selectedVisitDetail.created_at).toLocaleDateString("ar-EG", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric"
                  })}
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedVisitDetail.status || "مكتمل"}
                </Badge>
              </div>

              {/* Diagnosis */}
              {selectedVisitDetail.diagnosis && (
                <Card className="border-primary/10">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />التشخيص</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedVisitDetail.diagnosis}</p>
                  </CardContent>
                </Card>
              )}

              {/* Treatment Plan */}
              {selectedVisitDetail.treatment_plan && (
                <Card className="border-blue-200/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" />خطة العلاج</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedVisitDetail.treatment_plan}</p>
                  </CardContent>
                </Card>
              )}

              {/* Prescription */}
              {selectedVisitDetail.prescription && (
                <Card className="border-amber-200/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-amber-600" />الوصفة الطبية</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedVisitDetail.prescription}</p>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedVisitDetail.notes && (
                <Card className="border-purple-200/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-purple-600" />ملاحظات الطبيب</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedVisitDetail.notes.split("\n⏱ مدة الكشف")[0]}</p>
                  </CardContent>
                </Card>
              )}

              {/* Addons */}
              {selectedVisitDetail._addons?.length > 0 && (
                <Card className="border-teal-200/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-teal-600" />إضافات الجلسة</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right">الاسم</TableHead>
                          <TableHead className="text-center">العدد</TableHead>
                          <TableHead className="text-center">سعر الوحدة</TableHead>
                          <TableHead className="text-center">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVisitDetail._addons.map((a: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell><Badge variant="outline" className="text-xs">{a.item_type === "service" ? "خدمة" : "منتج"}</Badge></TableCell>
                            <TableCell className="font-medium">{a.name}</TableCell>
                            <TableCell className="text-center">{a.quantity}</TableCell>
                            <TableCell className="text-center">{a.unit_price} ج.م</TableCell>
                            <TableCell className="text-center font-medium">{a.total_price} ج.م</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Injections */}
              {selectedVisitDetail._injections?.length > 0 && (
                <Card className="border-rose-200/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Syringe className="h-4 w-4 text-rose-600" />سجل الحقن</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">المنطقة</TableHead>
                          <TableHead className="text-right">المنتج</TableHead>
                          <TableHead className="text-right">العلامة التجارية</TableHead>
                          <TableHead className="text-center">الوحدات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVisitDetail._injections.map((inj: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{inj.zone || inj.zoneId}</TableCell>
                            <TableCell>{inj.product_name || inj.productType}</TableCell>
                            <TableCell>{inj.brand || "-"}</TableCell>
                            <TableCell className="text-center">{inj.units || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Laser */}
              {selectedVisitDetail._laser?.length > 0 && (
                <Card className="border-violet-200/50">
                  <CardHeader className="pb-2 pt-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-violet-600" />جلسات الليزر</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">الجهاز</TableHead>
                          <TableHead className="text-center">البقعة</TableHead>
                          <TableHead className="text-center">الجرعة</TableHead>
                          <TableHead className="text-center">العرض النبضي</TableHead>
                          <TableHead className="text-center">عدد التمريرات</TableHead>
                          <TableHead className="text-right">المنطقة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVisitDetail._laser.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.device}</TableCell>
                            <TableCell className="text-center">{s.spot_size || "-"}</TableCell>
                            <TableCell className="text-center">{s.fluence ? `${s.fluence} J/cm²` : "-"}</TableCell>
                            <TableCell className="text-center">{s.pulse_width || "-"}</TableCell>
                            <TableCell className="text-center">{s.passes || "-"}</TableCell>
                            <TableCell>{s.area || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Financial */}
              <Card className="bg-gradient-to-l from-emerald-50 to-amber-50 border-emerald-200/50 dark:from-emerald-950/20 dark:to-amber-950/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">إجمالي الرسوم</div>
                      <div className="font-bold text-lg">{selectedVisitDetail.total_fee || 0} ج.م</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">المدفوع</div>
                      <div className="font-bold text-lg text-emerald-600">{selectedVisitDetail.paid_amount || 0} ج.م</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">المتبقي</div>
                      <div className="font-bold text-lg text-red-600">{(selectedVisitDetail.total_fee || 0) - (selectedVisitDetail.paid_amount || 0)} ج.م</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              QR Code - صور قبل وبعد
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            {currentPatientData && (
              <p className="text-sm font-bold text-center">{currentPatientData.name_ar}</p>
            )}
            {qrPhotoUrl && (
              <img src={qrPhotoUrl} alt="QR Code" className="w-64 h-64 rounded-xl shadow-lg border" />
            )}
            <p className="text-xs text-muted-foreground text-center">
              المسح الضوئي بالهاتف للوصول إلى صور المريض وإضافة صور جديدة
            </p>
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => {
                if (qrPhotoUrl) {
                  const link = document.createElement("a");
                  link.download = "qr-photo.png";
                  link.href = qrPhotoUrl;
                  link.click();
                }
              }}>
                <Download className="h-4 w-4" />
                تحميل QR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
