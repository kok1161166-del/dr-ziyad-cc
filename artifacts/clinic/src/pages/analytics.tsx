import { useState } from "react";
import { 
  useGetPatientsAnalytics, 
  useGetAppointmentsAnalytics, 
  useGetClinicalAnalytics 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, Users, Calendar, Stethoscope, BarChart2, PieChart as PieChartIcon } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8b5cf6', '#ec4899', '#14b8a6'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-md shadow-md">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }}></span>
            {entry.name}: <span className="font-bold text-foreground">{entry.value}</span>
            {entry.payload.percentage && ` (${entry.payload.percentage}%)`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: "", dateTo: "" });

  const { data: patientStats, isLoading: patientsLoading } = useGetPatientsAnalytics({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined
  });

  const { data: apptStats, isLoading: apptsLoading } = useGetAppointmentsAnalytics({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined
  });

  const { data: clinicalStats, isLoading: clinicalLoading } = useGetClinicalAnalytics({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined
  });

  const handleFilter = () => setAppliedFilters({ dateFrom, dateTo });

  const genderData = [
    { name: 'ذكور', value: patientStats?.genderMale || 0 },
    { name: 'إناث', value: patientStats?.genderFemale || 0 }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-primary" /> لوحة التحليلات والإحصاءات
        </h1>
      </div>

      <Card className="bg-background">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[250px]">
            <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[250px]">
            <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <Button onClick={handleFilter} className="gap-2">
            <Filter className="h-4 w-4" /> تطبيق الفلتر
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="patients" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-6">
          <TabsTrigger value="patients" className="gap-2"><Users className="h-4 w-4" /> تحليل المرضى</TabsTrigger>
          <TabsTrigger value="appointments" className="gap-2"><Calendar className="h-4 w-4" /> تحليل الحجوزات</TabsTrigger>
          <TabsTrigger value="clinical" className="gap-2"><Stethoscope className="h-4 w-4" /> التحليل السريري</TabsTrigger>
        </TabsList>

        {/* PATIENTS TAB */}
        <TabsContent value="patients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" /> التوزيع العمري
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {patientsLoading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={patientStats?.ageDistribution || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="عدد المرضى" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-muted-foreground" /> التوزيع حسب الجنس
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {patientsLoading ? <Skeleton className="h-full w-full" /> : genderData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">لا توجد بيانات</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                        {genderData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">توزيع المحافظات والمناطق</CardTitle>
              </CardHeader>
              <CardContent>
                {patientsLoading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                  <div className="space-y-4">
                    {patientStats?.governorateStats?.map((gov, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{gov.label || 'غير محدد'}</span>
                          <span className="text-muted-foreground">{gov.count} مريض ({gov.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${gov.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {!patientStats?.governorateStats?.length && <div className="text-center py-4 text-muted-foreground">لا توجد بيانات</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* APPOINTMENTS TAB */}
        <TabsContent value="appointments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">أعلى الخدمات طلباً</CardTitle>
                <CardDescription>أكثر الخدمات الطبية التي تم حجزها خلال الفترة المحددة</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {apptsLoading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={apptStats?.topServices || []} margin={{ top: 10, right: 30, left: 100, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                      <XAxis type="number" axisLine={false} tickLine={false} />
                      <YAxis dataKey="serviceName" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12 }} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="عدد الطلبات" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">حالات الحجوزات</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {apptsLoading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={apptStats?.statusBreakdown?.map(s => ({ name: s.status, value: s.count, percentage: s.percentage })) || []} 
                           cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {(apptStats?.statusBreakdown || []).map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">إنتاجية الأطباء / الطاقم</CardTitle>
              </CardHeader>
              <CardContent>
                {apptsLoading ? <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
                  <div className="space-y-4">
                    {apptStats?.byStaff?.map((staff, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {staff.staffName.charAt(0)}
                          </div>
                          <span className="font-medium">{staff.staffName}</span>
                        </div>
                        <div className="text-lg font-bold font-mono">{staff.count} <span className="text-xs text-muted-foreground font-sans font-normal">حجز</span></div>
                      </div>
                    ))}
                    {!apptStats?.byStaff?.length && <div className="text-center py-8 text-muted-foreground">لا توجد بيانات</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CLINICAL TAB */}
        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">أكثر التشخيصات شيوعاً</CardTitle>
              </CardHeader>
              <CardContent>
                {clinicalLoading ? <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                  <div className="space-y-4">
                    {clinicalStats?.topDiagnoses?.map((diag, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{diag.diagnosis}</span>
                          <span className="text-muted-foreground">{diag.count} حالة ({diag.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500" style={{ width: `${diag.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {!clinicalStats?.topDiagnoses?.length && <div className="text-center py-4 text-muted-foreground">لا توجد بيانات</div>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">الأدوية الأكثر وصفاً</CardTitle>
              </CardHeader>
              <CardContent>
                {clinicalLoading ? <div className="space-y-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
                  <div className="space-y-4">
                    {clinicalStats?.topMedications?.map((med, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium" dir="ltr">{med.medication}</span>
                          <span className="text-muted-foreground">{med.count} وصفة ({med.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${med.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                    {!clinicalStats?.topMedications?.length && <div className="text-center py-4 text-muted-foreground">لا توجد بيانات</div>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">مصادر الإحالة (العيادات الخارجية / الأطباء)</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                {clinicalLoading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clinicalStats?.referralStats || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="provider" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="عدد الإحالات" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}