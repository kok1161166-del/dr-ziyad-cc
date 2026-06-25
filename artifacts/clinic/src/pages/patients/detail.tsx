import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useGetPatient, useUpdatePatient, useDeletePatient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Edit, Phone, Mail, MapPin, Calendar, Clock, Activity, FileText, User } from "lucide-react";

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
                  <Button size="sm" className="gap-2">
                    <Activity className="h-4 w-4" />
                    إضافة زيارة
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p>لا يوجد زيارات مسجلة لهذا المريض بعد.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="files" className="mt-4">
              <Card>
                <CardContent className="text-center py-16 text-muted-foreground">
                  لا توجد ملفات مرفقة لهذا المريض.
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}