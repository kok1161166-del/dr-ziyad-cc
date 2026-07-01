import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useGetPatient, useUpdatePatient, useDeletePatient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Edit, Phone, Mail, MapPin, Calendar, Clock, Activity, FileText, User, Eye, Stethoscope, Syringe, Zap, Package, Timer, DollarSign, LogIn, LogOut, Hash, AlertTriangle, Image as ImageIcon, Loader2, QrCode, Share2, Trash2 } from "lucide-react";
import { getVisitPhotosForPatient, deleteVisitPhoto } from "@/lib/db";

export default function PatientDetail() {
  const [, params] = useRoute('/patients/:id');
  const id = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading } = useGetPatient(id, { query: { enabled: !!id, queryKey: ['patient', id] } });

  const deletePatient = useDeletePatient({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم نقل المريض إلى الأرشيف" });
        queryClient.invalidateQueries();
      }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!patient) {
    return <div className="p-8 text-center text-muted-foreground">المريض غير موجود</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="icon">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">ملف المريض</h1>
      </div>

      {/* Profile Header */}
      <Card className="border-t-4 border-t-primary shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary border-2 border-white shadow-sm">
                <User className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1 flex items-center gap-3">
                  {patient.nameAr}
                  {patient.isDeleted && <Badge variant="destructive">محذوف</Badge>}
                </h2>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border shadow-sm">
                    <span className="font-mono font-medium text-foreground">#{patient.localCode}</span>
                  </span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {patient.ageYears ? `${patient.ageYears} سنة` : "العمر غير محدد"}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> <span dir="ltr">{patient.phones?.[0]?.number || "لا يوجد هاتف"}</span></span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
              <Button variant="outline" className="gap-2 flex-1 md:flex-none">
                <Edit className="h-4 w-4" />
                تعديل البيانات
              </Button>
              {!patient.isDeleted && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex-1 md:flex-none">حذف للأرشيف</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف المريض</AlertDialogTitle>
                      <AlertDialogDescription>
                        هل أنت متأكد من حذف المريض ونقله إلى الأرشيف؟ يمكن استعادته لاحقاً.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2">
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deletePatient.mutate({ id })} className="bg-red-600 hover:bg-red-700">نعم، حذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Data */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                البيانات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-y-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">الجنس</div>
                  <div className="font-medium">{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">تاريخ الميلاد</div>
                  <div className="font-medium">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('ar-EG') : '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">الحالة الاجتماعية</div>
                  <div className="font-medium">{patient.maritalStatus || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">الجنسية</div>
                  <div className="font-medium">{patient.nationality || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">المهنة</div>
                  <div className="font-medium">{patient.occupation || '-'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-medium">مصدر الإحالة</div>
                  <div className="font-medium">{patient.referredBy || 'مباشر'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    {patient.phones?.map((p, i) => (
                      <div key={i} className="mb-1">
                        <span dir="ltr" className="font-medium">{p.number}</span>
                        {p.owner && <span className="text-muted-foreground mr-2">({p.owner})</span>}
                      </div>
                    ))}
                    {!patient.phones?.length && <span>لا يوجد</span>}
                  </div>
                </div>
                {patient.email && (
                  <div className="flex gap-3 items-center">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span dir="ltr">{patient.email}</span>
                  </div>
                )}
                {(patient.address || patient.governorate) && (
                  <div className="flex gap-3 items-start">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      {patient.address && <div>{patient.address}</div>}
                      {patient.governorate && <div className="text-muted-foreground mt-0.5">{patient.governorate}</div>}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {patient.notes && (
            <Card className="bg-amber-50/50 border-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-amber-800">ملاحظات عامة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-900 whitespace-pre-wrap">{patient.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Visits & Medical History */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="visits" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visits">سجل الزيارات والحجوزات</TabsTrigger>
              <TabsTrigger value="files">الملفات المرفقة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visits" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <div>
                    <CardTitle>الزيارات الطبية</CardTitle>
                    <CardDescription>إجمالي الزيارات: {patient.totalVisits || 0}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <VisitHistory patientId={id} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="files" className="mt-4">
              <Card>
                <PatientFiles patientId={id} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}س ${m}د`;
  if (m > 0) return `${m}د ${s}ث`;
  return `${s}ث`;
}

function VisitHistory({ patientId }: { patientId: number }) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    fetch(`/api/patients/${patientId}/visits`)
      .then(r => r.json())
      .then(data => { setVisits(data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="text-center py-8"><Skeleton className="h-32 w-full" /></div>;

  if (visits.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
        <p>لا يوجد زيارات مسجلة لهذا المريض بعد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {visits.map((visit) => (
        <Card key={visit.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedVisit(visit)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">{new Date(visit.date).toLocaleDateString("ar-EG")}</div>
                  {visit.diagnosis && <div className="text-sm text-muted-foreground mt-0.5">{visit.diagnosis}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {visit.duration && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3.5 w-3.5" />
                    {formatDuration(visit.duration)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {visit.totalFee} ج.م
                </span>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedVisit(visit); }}>
                  <Eye className="h-4 w-4 ml-1" />
                  عرض
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <VisitDetailDialog visit={selectedVisit} onClose={() => setSelectedVisit(null)} />
    </div>
  );
}

function VisitDetailDialog({ visit, onClose }: { visit: any; onClose: () => void }) {
  if (!visit) return null;
  return (
    <Dialog open={!!visit} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            تفاصيل الزيارة - {new Date(visit.date).toLocaleDateString("ar-EG")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Timing Cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "وقت الدخول", value: visit.startTime ? new Date(visit.startTime).toLocaleTimeString("ar-EG") : "-", icon: <LogIn className="h-4 w-4" />, color: "text-blue-600" },
              { label: "وقت الخروج", value: visit.endTime ? new Date(visit.endTime).toLocaleTimeString("ar-EG") : "-", icon: <LogOut className="h-4 w-4" />, color: "text-orange-600" },
              { label: "مدة الكشف", value: formatDuration(visit.duration), icon: <Timer className="h-4 w-4" />, color: "text-emerald-600" },
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
          {visit.diagnosis && (
            <Card className="border-primary/10">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />التشخيص</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{visit.diagnosis}</p></CardContent>
            </Card>
          )}

          {/* Treatment Plan */}
          {visit.treatmentPlan && (
            <Card className="border-blue-200/50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" />خطة العلاج</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{visit.treatmentPlan}</p></CardContent>
            </Card>
          )}

          {/* Prescription */}
          {visit.prescription && (
            <Card className="border-amber-200/50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-amber-600" />الوصفة الطبية</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{visit.prescription}</p></CardContent>
            </Card>
          )}

          {/* Doctor Notes */}
          {visit.notes && (
            <Card className="border-purple-200/50">
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-purple-600" />ملاحظات الطبيب</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap leading-relaxed">{visit.notes}</p></CardContent>
            </Card>
          )}

          {/* Session Addons */}
          {visit.sessionAddons?.length > 0 && (
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
                    {visit.sessionAddons.map((a: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell><Badge variant="outline" className="text-xs">{a.itemType === "service" ? "خدمة" : "منتج"}</Badge></TableCell>
                        <TableCell className="font-medium">{a.name}</TableCell>
                        <TableCell className="text-center">{a.quantity}</TableCell>
                        <TableCell className="text-center">{a.unitPrice} ج.م</TableCell>
                        <TableCell className="text-center font-medium">{a.totalPrice} ج.م</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Injections */}
          {visit.injectionLogs?.length > 0 && (
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
                    {visit.injectionLogs.map((i: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{i.zone || "-"}</TableCell>
                        <TableCell>{i.productName || "-"}</TableCell>
                        <TableCell>{i.brand || "-"}</TableCell>
                        <TableCell className="text-center">{i.units || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Laser Sessions */}
          {visit.laserLogs?.length > 0 && (
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
                    {visit.laserLogs.map((l: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{l.device || "-"}</TableCell>
                        <TableCell className="text-center">{l.spotSize || "-"}</TableCell>
                        <TableCell className="text-center">{l.fluence ? `${l.fluence} J/cm²` : "-"}</TableCell>
                        <TableCell className="text-center">{l.pulseWidth || "-"}</TableCell>
                        <TableCell className="text-center">{l.passes || "-"}</TableCell>
                        <TableCell>{l.area || "-"}</TableCell>
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
                  <div className="font-bold text-lg">{visit.totalFee || 0} ج.م</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">المدفوع</div>
                  <div className="font-bold text-lg text-emerald-600">{visit.paidAmount || 0} ج.م</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">المتبقي</div>
                  <div className="font-bold text-lg text-red-600">{visit.remainingAmount || 0} ج.م</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function PatientFiles({ patientId }: { patientId: number }) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrPhotoUrl, setQrPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadPhotos = async () => {
      if (!patientId) return;
      try {
        const data = await getVisitPhotosForPatient(patientId);
        setPhotos(data);
      } catch (err) {
        console.error("Error loading photos:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPhotos();
  }, [patientId]);

  const handleDeletePhoto = async (photo: any) => {
    if (!confirm("هل أنت متأكد من حذف الصورة؟")) return;
    try {
      if (photo.cloudinary_public_id) {
        await fetch(`/api/upload/${photo.cloudinary_public_id}`, { method: "DELETE" });
      }
      await deleteVisitPhoto(photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast({ title: "تم", description: "تم حذف الصورة بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الصورة", variant: "destructive" });
    }
  };

  const handleShowQr = async (photo: any) => {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/shared-photo?id=${photo.id}`;
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2, color: { dark: "#1e3a5f", light: "#ffffff" } });
      setQrPhotoUrl(dataUrl);
      setShowQrDialog(true);
    } catch {
      navigator.clipboard.writeText(url);
      toast({ title: "تم", description: "تم نسخ الرابط" });
    }
  };

  const handleShareLink = async (photo: any) => {
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
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (photos.length === 0) {
    return (
      <CardContent className="text-center py-16 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
        لا توجد ملفات أو صور مرفقة لهذا المريض.
      </CardContent>
    );
  }

  return (
    <>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-xl overflow-hidden border shadow-sm bg-white aspect-square">
              <img 
                src={photo.cloudinary_url} 
                alt="صورة المريض" 
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                <a href={photo.cloudinary_url} target="_blank" rel="noreferrer" className="pointer-events-auto">
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    عرض الصورة
                  </Button>
                </a>
              </div>

              <div className="absolute top-2 left-2 right-2 flex justify-between items-start opacity-100 transition-opacity z-20 pointer-events-none">
                <div className="flex flex-col gap-1 pointer-events-auto">
                  <Button variant="secondary" size="sm" className="h-7 px-2 shadow-sm bg-white/90 hover:bg-white text-blue-600 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); handleShareLink(photo); }} title="مشاركة الرابط">
                    <Share2 className="h-3.5 w-3.5" />
                    مشاركة
                  </Button>
                  <Button variant="secondary" size="icon" className="h-7 w-7 shadow-sm bg-white/90 hover:bg-white text-slate-700" onClick={(e) => { e.stopPropagation(); handleShowQr(photo); }} title="عرض كود QR">
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button variant="destructive" size="icon" className="h-7 w-7 shadow-sm opacity-90 hover:opacity-100 pointer-events-auto" onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo); }} title="حذف">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              {photo.notes && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs truncate z-20">
                  {photo.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              مشاركة الصورة
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrPhotoUrl && (
              <img src={qrPhotoUrl} alt="QR Code" className="w-64 h-64 rounded-xl shadow-lg border" />
            )}
            <p className="text-sm text-center text-muted-foreground">
              امسح الكود بالكاميرا لفتح وتحميل الصورة
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
