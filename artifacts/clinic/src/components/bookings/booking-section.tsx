import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  getBookings, createBooking, updateBooking, deleteBooking, searchPatients,
} from "@/lib/db";
import type { DbBooking, DbPatient } from "@/lib/db";
import {
  Calendar, Plus, Trash2, User, Phone, Clock,
  CheckCircle2, UserCheck, X, Loader2,
} from "lucide-react";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const bookingFilters = [
  { id: "today", label: "اليوم" },
  { id: "tomorrow", label: "غداً" },
  { id: "week", label: "هذا الأسبوع" },
  { id: "month", label: "هذا الشهر" },
  { id: "all", label: "الكل" },
] as const;

type BookingFilter = (typeof bookingFilters)[number]["id"];

const bookingStatusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  confirmed: { label: "مؤكد", className: "bg-blue-50 text-blue-700 border-blue-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  arrived: { label: "حضر", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <UserCheck className="h-3 w-3" /> },
  cancelled: { label: "ملغي", className: "bg-red-50 text-red-700 border-red-200", icon: <X className="h-3 w-3" /> },
};

export function BookingSection() {
  const { toast } = useToast();

  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("today");

  const [showDialog, setShowDialog] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<DbPatient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<DbPatient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [bookingDate, setBookingDate] = useState(todayStr());
  const [bookingTime, setBookingTime] = useState("");
  const [bookingService, setBookingService] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setBookingsLoading(true);
    try {
      const today = todayStr();
      let from: string | undefined;
      let to: string | undefined;
      if (bookingFilter === "today") { from = today; to = today; }
      else if (bookingFilter === "tomorrow") {
        const t = new Date(); t.setDate(t.getDate() + 1);
        const d = t.toISOString().slice(0, 10);
        from = d; to = d;
      } else if (bookingFilter === "week") {
        from = today;
        const t = new Date(); t.setDate(t.getDate() + 7);
        to = t.toISOString().slice(0, 10);
      } else if (bookingFilter === "month") {
        from = today;
        const t = new Date(); t.setMonth(t.getMonth() + 1);
        to = t.toISOString().slice(0, 10);
      }
      const data = await getBookings(from, to);
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingFilter]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    if (!patientSearch.trim()) { setPatientResults([]); return; }
    setPatientsLoading(true);
    const timer = setTimeout(async () => {
      const results = await searchPatients(patientSearch.trim());
      setPatientResults(results);
      setPatientsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setPatientResults([]);
    setBookingDate(todayStr());
    setBookingTime("");
    setBookingService("");
    setBookingNotes("");
  };

  const handleAdd = async () => {
    if (!selectedPatient?.id) return;
    try {
      await createBooking({
        name: selectedPatient.name_ar,
        phone: selectedPatient.phones?.[0]?.number || undefined,
        booking_date: bookingDate,
        booking_time: bookingTime || undefined,
        service: bookingService || undefined,
        notes: bookingNotes || undefined,
        status: "confirmed",
      });
      resetForm();
      setShowDialog(false);
      fetchBookings();
      toast({ title: "تم", description: `تم إضافة حجز لـ ${selectedPatient.name_ar}` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل إضافة الحجز", variant: "destructive" });
    }
  };

  const handleStatusToggle = async (booking: DbBooking) => {
    const next: Record<string, string> = { confirmed: "arrived", arrived: "cancelled", cancelled: "confirmed" };
    try {
      await updateBooking(booking.id!, { status: next[booking.status] || "confirmed" });
      fetchBookings(true);
    } catch {
      toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteBooking(id);
      fetchBookings(true);
      toast({ title: "تم", description: "تم حذف الحجز" });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الحجز", variant: "destructive" });
    }
  };

  const todayCount = bookings.filter(b => b.booking_date === todayStr()).length;
  const todayConfirmed = bookings.filter(b => b.booking_date === todayStr() && b.status === "confirmed").length;
  const todayArrived = bookings.filter(b => b.booking_date === todayStr() && b.status === "arrived").length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xs text-muted-foreground">حجوزات اليوم</div>
            <div className="text-2xl font-bold mt-1">{todayCount}</div>
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              الحجوزات
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
                {bookingFilters.map(f => (
                  <Button
                    key={f.id}
                    variant={bookingFilter === f.id ? "default" : "ghost"}
                    size="sm"
                    className={`text-xs h-8 ${bookingFilter === f.id ? "" : "text-muted-foreground"}`}
                    onClick={() => setBookingFilter(f.id)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
              <Button size="sm" className="gap-2" onClick={() => { resetForm(); setShowDialog(true); }}>
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
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { resetForm(); setShowDialog(true); }}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة حجز
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
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
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              حجز جديد
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!selectedPatient ? (
              <div className="space-y-2">
                <Label>البحث عن مريض <span className="text-red-500">*</span></Label>
                <Input
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                  placeholder="ابحث باسم المريض أو رقم الهاتف أو الهوية..."
                  autoFocus
                />
                {patientsLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري البحث...
                  </div>
                )}
                {patientSearch.trim() && !patientsLoading && patientResults.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">لا يوجد مريض مطابق</p>
                )}
                {patientResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                    {patientResults.map(patient => (
                      <button
                        key={patient.id ?? patient.local_code}
                        type="button"
                        className="w-full text-right px-3 py-2.5 hover:bg-muted transition-colors flex items-center justify-between"
                        onClick={() => {
                          setSelectedPatient(patient);
                          setPatientSearch("");
                          setPatientResults([]);
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
                      <p className="font-medium">{selectedPatient.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{selectedPatient.phones?.[0]?.number || "—"}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedPatient(null)}>
                    تغيير
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>التاريخ *</Label>
                <Input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>الوقت</Label>
                <Input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} />
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
              <Input value={bookingService} onChange={e => setBookingService(e.target.value)} placeholder="نوع الخدمة (اختياري)" />
            </div>
            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} placeholder="ملاحظات إضافية" rows={2} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleAdd} disabled={!selectedPatient}>
                <Plus className="h-4 w-4 ml-1" />
                إضافة الحجز
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
