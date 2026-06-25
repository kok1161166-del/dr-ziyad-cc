import { useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Calendar as CalendarIcon, Clock, Filter, DollarSign } from "lucide-react";

const getStatusBadge = (status: string) => {
  const map: Record<string, { label: string; className: string }> = {
    waiting_arrival: { label: "منتظر الوصول", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    in_reception: { label: "في الاستقبال", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    in_examination: { label: "في غرفة الكشف", className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100" },
    completed: { label: "أنهى الكشف", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    session_done: { label: "أنهى الجلسة", className: "bg-teal-100 text-teal-800 hover:bg-teal-100" },
    postponed: { label: "تأجيل الحجز", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
    no_show: { label: "لم يحضر", className: "bg-red-100 text-red-800 hover:bg-red-100" },
  };
  const s = map[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
};

export default function Appointments() {
  const { data, isLoading } = useListAppointments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">الحجوزات</h1>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة حجز جديد
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              تاريخ الحجز (اليوم)
            </Button>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              تصفية
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>المريض</TableHead>
                <TableHead>الخدمات</TableHead>
                <TableHead>الوقت</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الرسوم</TableHead>
                <TableHead className="text-left">أدوات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : data?.appointments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                    لا يوجد حجوزات
                  </TableCell>
                </TableRow>
              ) : (
                data?.appointments?.map((app, index) => (
                  <TableRow key={app.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{app.patientNameAr}</div>
                      <div className="text-xs text-muted-foreground font-mono">{app.patientCode}</div>
                    </TableCell>
                    <TableCell>
                      {app.serviceNames?.join("، ") || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span dir="ltr">{app.appointmentTime}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(app.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">₪ {app.totalFee}</div>
                      <div className="text-xs text-emerald-600">مدفوع: ₪ {app.paidAmount}</div>
                      {app.remainingAmount > 0 && <div className="text-xs text-red-500">متبقي: ₪ {app.remainingAmount}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="h-8 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800">
                          <DollarSign className="h-3 w-3 ml-1" /> دفع
                        </Button>
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
