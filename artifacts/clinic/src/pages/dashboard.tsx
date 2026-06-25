import { 
  useGetDashboardStats, 
  useGetDailyFunnel,
  useClearAllAppointments,
  useClearAllVisits
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Users, DollarSign, UserPlus, Clock, LogIn, Activity, CheckCircle, CalendarX, XCircle, AlertOctagon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: funnel, isLoading: funnelLoading } = useGetDailyFunnel();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearAppointmentsMutation = useClearAllAppointments({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم المسح", description: "تم مسح جميع الحجوزات بنجاح" });
        queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء مسح الحجوزات", variant: "destructive" });
      }
    }
  });

  const clearVisitsMutation = useClearAllVisits({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم المسح", description: "تم مسح جميع الزيارات بنجاح" });
        queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء مسح الزيارات", variant: "destructive" });
      }
    }
  });

  const handleClearAppointments = () => {
    clearAppointmentsMutation.mutate();
  };

  const handleClearVisits = () => {
    clearVisitsMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">لوحة التحكم</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="إجمالي حجوزات اليوم" value={stats?.todayAppointments} icon={Calendar} loading={statsLoading} />
        <MetricCard title="مرضى جدد اليوم" value={stats?.newPatientsToday} icon={UserPlus} loading={statsLoading} />
        <MetricCard title="إجمالي المرضى" value={stats?.totalPatients} icon={Users} loading={statsLoading} />
        <MetricCard title="إيرادات اليوم" value={`₪ ${stats?.todayRevenue || 0}`} icon={DollarSign} loading={statsLoading} />
      </div>

      {/* Daily Funnel */}
      <div>
        <h2 className="text-xl font-bold mb-4">مسار الحجوزات اليومي</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <FunnelCard title="منتظر الوصول" count={funnel?.waitingArrival} icon={Clock} color="bg-amber-100 text-amber-600" loading={funnelLoading} />
          <FunnelCard title="في الاستقبال" count={funnel?.inReception} icon={LogIn} color="bg-blue-100 text-blue-600" loading={funnelLoading} />
          <FunnelCard title="في غرفة الكشف" count={funnel?.inExamination} icon={Activity} color="bg-indigo-100 text-indigo-600" loading={funnelLoading} />
          <FunnelCard title="أنهى الكشف" count={funnel?.completed} icon={CheckCircle} color="bg-emerald-100 text-emerald-600" loading={funnelLoading} />
          <FunnelCard title="تأجيل الحجز" count={funnel?.postponed} icon={CalendarX} color="bg-purple-100 text-purple-600" loading={funnelLoading} />
          <FunnelCard title="لم يحضر" count={funnel?.noShow} icon={XCircle} color="bg-red-100 text-red-600" loading={funnelLoading} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-12">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertOctagon className="h-5 w-5" />
              منطقة الخطر
            </CardTitle>
            <CardDescription className="text-red-600/80">
              إجراءات لا يمكن التراجع عنها. يرجى الحذر.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">تصفية الحجوزات</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    هذا الإجراء سيقوم بمسح جميع الحجوزات من قاعدة البيانات ولا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex gap-2">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAppointments} className="bg-red-600 hover:bg-red-700">نعم، امسح الحجوزات</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">مسح سجل الزيارات</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    هذا الإجراء سيقوم بمسح جميع الزيارات الطبية من قاعدة البيانات ولا يمكن التراجع عنه.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex gap-2">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearVisits} className="bg-red-600 hover:bg-red-700">نعم، امسح الزيارات</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="mr-auto flex gap-4 text-sm font-medium text-red-800 bg-red-100/50 p-2 rounded-md border border-red-200">
              <div>إجمالي الزيارات: {stats?.totalVisits || 0}</div>
              <div>إجمالي الحجوزات: {stats?.totalAppointments || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, loading }: { title: string, value: string | number | undefined, icon: any, loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value !== undefined ? value : "-"}</div>
        )}
      </CardContent>
    </Card>
  );
}

function FunnelCard({ title, count, icon: Icon, color, loading }: { title: string, count: number | undefined, icon: any, color: string, loading: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className={`p-3 flex justify-center items-center ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="p-3 text-center">
          <div className="text-xs text-muted-foreground font-medium mb-1 truncate" title={title}>{title}</div>
          {loading ? (
            <Skeleton className="h-6 w-12 mx-auto" />
          ) : (
            <div className="text-xl font-bold">{count !== undefined ? count : 0}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
