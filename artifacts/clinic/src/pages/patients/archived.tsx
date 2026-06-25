import { useListDeletedPatients, useRestorePatient, usePermanentDeletePatient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function ArchivedPatients() {
  const { data: patients, isLoading } = useListDeletedPatients();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const restorePatient = useRestorePatient({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الاستعادة", description: "تم استعادة المريض بنجاح" });
        queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "خطأ", description: "فشلت عملية الاستعادة", variant: "destructive" });
      }
    }
  });

  const permanentDeletePatient = usePermanentDeletePatient({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف المريض نهائياً" });
        queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "خطأ", description: "فشلت عملية الحذف النهائي", variant: "destructive" });
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="icon">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">أرشيف المرضى (المحذوفين)</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-amber-800">هؤلاء المرضى محذوفون</h3>
          <p className="text-amber-700 text-sm mt-1">يمكنك استعادة ملفاتهم للعمل عليها مجدداً، أو حذفها نهائياً مما سيؤدي إلى مسح كافة بياناتهم من النظام ولا يمكن التراجع عن هذا الإجراء.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>العمر</TableHead>
                <TableHead>الموبايل</TableHead>
                <TableHead>إجمالي الزيارات</TableHead>
                <TableHead>تاريخ الحذف</TableHead>
                <TableHead className="text-left">أدوات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : !patients || patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    لا يوجد مرضى في الأرشيف
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient, index) => (
                  <TableRow key={patient.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{patient.localCode}</TableCell>
                    <TableCell className="font-medium">{patient.nameAr}</TableCell>
                    <TableCell>{patient.ageYears ? `${patient.ageYears} سنة` : "-"}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{patient.phones?.[0]?.number || "-"}</TableCell>
                    <TableCell>{patient.totalVisits}</TableCell>
                    <TableCell>{new Date().toLocaleDateString("ar-EG")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800">
                              <RefreshCw className="h-3 w-3" /> استعادة
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>استعادة ملف المريض</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من رغبتك في استعادة ملف المريض {patient.nameAr}؟ سيتمكن من الظهور في قائمة المرضى النشطين.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex gap-2">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => restorePatient.mutate({ id: patient.id })} className="bg-emerald-600 hover:bg-emerald-700">نعم، استعادة</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-red-700 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-800">
                              <Trash2 className="h-3 w-3" /> حذف نهائي
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف نهائي للمريض</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من الحذف النهائي لملف {patient.nameAr}؟ هذا الإجراء سيقوم بمسح كافة بياناته وزياراته من النظام ولا يمكن التراجع عنه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex gap-2">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => permanentDeletePatient.mutate({ id: patient.id })} className="bg-red-600 hover:bg-red-700">نعم، حذف نهائي</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}