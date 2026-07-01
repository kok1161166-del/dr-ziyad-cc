import { useGetDashboardStats, useGetDailyFunnel } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, DollarSign, UserPlus, Clock, LogIn, Activity, CheckCircle, CalendarX, XCircle, Stethoscope, ClipboardList } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: funnel, isLoading: funnelLoading } = useGetDailyFunnel();
  const [, setLocation] = useLocation();

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

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => setLocation("/reception")} className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-right text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]">
          <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/5" />
          <ClipboardList className="h-10 w-10 mb-3 opacity-90" />
          <h3 className="text-xl font-bold">لوحة السكرتير</h3>
          <p className="mt-1 text-sm text-blue-100">إدارة الطابور، تسجيل مرضى جدد، الفواتير والمدفوعات</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-200 group-hover:text-white transition-colors">
            الدخول ←
          </span>
        </button>

        <button onClick={() => setLocation("/doctor")} className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-right text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]">
          <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-white/5" />
          <Stethoscope className="h-10 w-10 mb-3 opacity-90" />
          <h3 className="text-xl font-bold">لوحة الطبيب</h3>
          <p className="mt-1 text-sm text-emerald-100">قائمة المرضى، الكشف التجميلي، سجل الحقن والليزر</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-200 group-hover:text-white transition-colors">
            الدخول ←
          </span>
        </button>
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
