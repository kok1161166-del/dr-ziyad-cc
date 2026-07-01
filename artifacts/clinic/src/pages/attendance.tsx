import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useListUsers } from "@workspace/api-client-react";
import { getTodayAttendance, getAttendance, checkIn, checkOut, logActivity } from "@/lib/db";
import type { DbAttendance } from "@/lib/db";
import {
  Clock, LogIn, LogOut, User, Calendar, Search, Filter,
  CheckCircle2, XCircle, AlertCircle, Loader2,
} from "lucide-react";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

type AttendanceStatus = "active" | "done" | "absent";

export default function Attendance() {
  const { toast } = useToast();
  const { data: users = [], isLoading: usersLoading } = useListUsers();

  const [attendance, setAttendance] = useState<DbAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [tab, setTab] = useState("today");

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [history, setHistory] = useState<DbAttendance[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const loadTodayAttendance = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const data = await getTodayAttendance();
      setAttendance(data);
    } catch {
      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  useEffect(() => { loadTodayAttendance(); }, [loadTodayAttendance]);

  const loadHistory = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setHistoryLoading(true);
    try {
      const data = await getAttendance(dateFrom, dateTo);
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  const handleCheckIn = async (user: typeof users[number]) => {
    try {
      await checkIn({
        user_id: user.id,
        user_name: user.name,
        role_name: user.roleName,
        date: todayStr(),
      });
      logActivity({
        user_id: user.id,
        user_name: user.name,
        action_type: "check_in",
        entity_type: "attendance",
        entity_name: user.name,
        details: { role_name: user.roleName },
      }).catch(() => {});
      loadTodayAttendance();
      toast({ title: "تم", description: `تم تسجيل حضور ${user.name}` });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل تسجيل الحضور", variant: "destructive" });
    }
  };

  const handleCheckOut = async (id: number, name: string, userId: number) => {
    try {
      await checkOut(id);
      logActivity({
        user_id: userId,
        user_name: name,
        action_type: "check_out",
        entity_type: "attendance",
        entity_name: name,
      }).catch(() => {});
      loadTodayAttendance();
      toast({ title: "تم", description: `تم تسجيل انصراف ${name}` });
    } catch {
      toast({ title: "خطأ", description: "فشل تسجيل الانصراف", variant: "destructive" });
    }
  };

  const checkedInUserIds = attendance.map(a => a.user_id);
  const activeRecords = attendance.filter(a => !a.check_out);
  const completedRecords = attendance.filter(a => a.check_out);
  const absentUsers = users.filter(u => !checkedInUserIds.includes(u.id));

  const filteredAbsent = absentUsers.filter(u =>
    !searchQuery || u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.roleName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayAbsentCount = users.length - attendance.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            الحضور والانصراف
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{todayStr()}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-xs text-muted-foreground">إجمالي الموظفين</div>
            <div className="text-2xl font-bold mt-1">{users.length}</div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/50">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-emerald-600">حاضر حالياً</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{activeRecords.length}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200/50">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-blue-600">انصرفوا</div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{completedRecords.length}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200/50">
          <CardContent className="p-4 text-center">
            <div className="text-xs text-red-600">لم يحضروا</div>
            <div className="text-2xl font-bold mt-1 text-red-600">{todayAbsentCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="today" className="gap-2">
            <Clock className="h-4 w-4" />
            حضور اليوم
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="h-4 w-4" />
            سجل الحضور
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-primary" />
                  الموظفون
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      className="pr-9 h-9 w-[200px]"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading || attendanceLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Present employees */}
                  {attendance.map(record => {
                    const user = users.find(u => u.id === record.user_id);
                    return (
                      <Card key={record.id} className={`hover:shadow-md transition-all border-r-4 ${record.check_out ? "border-r-blue-400" : "border-r-emerald-400"}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium">{record.user_name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5 flex-wrap">
                                  <Badge variant="secondary" className="text-xs">{record.role_name}</Badge>
                                  <span className="flex items-center gap-1">
                                    <LogIn className="h-3 w-3 text-emerald-600" />
                                    {formatTime(record.check_in)}
                                  </span>
                                  {record.check_out && (
                                    <span className="flex items-center gap-1">
                                      <LogOut className="h-3 w-3 text-blue-600" />
                                      {formatTime(record.check_out)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {record.check_out ? (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                  <CheckCircle2 className="h-3 w-3 ml-1" />
                                  منصرف
                                </Badge>
                              ) : (
                                <>
                                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3 ml-1" />
                                    حاضر
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                    onClick={() => handleCheckOut(record.id!, record.user_name, record.user_id)}
                                  >
                                    <LogOut className="h-4 w-4" />
                                    تسجيل انصراف
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Absent employees */}
                  {filteredAbsent.map(user => (
                    <Card key={user.id} className="hover:shadow-md transition-all border-r-4 border-r-red-300 opacity-70">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                              <User className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-muted-foreground">{user.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">{user.roleName}</Badge>
                                <span className="flex items-center gap-1 text-red-400">
                                  <XCircle className="h-3 w-3" />
                                  لم يحضر
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleCheckIn(user)}
                          >
                            <LogIn className="h-4 w-4" />
                            تسجيل حضور
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {users.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p>لا يوجد موظفون</p>
                      <p className="text-xs mt-1">يمكنك إضافة موظفين من صفحة الصلاحيات</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  سجل الحضور
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">من</Label>
                      <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">إلى</Label>
                      <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 mt-5" onClick={loadHistory}>
                    <Filter className="h-4 w-4" />
                    عرض
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p>لا توجد سجلات حضور في هذا النطاق</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map(record => (
                    <Card key={record.id} className={`border-r-4 ${record.check_out ? "border-r-blue-300" : "border-r-emerald-300"}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{record.user_name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-xs">{record.role_name}</Badge>
                                <span>{record.date}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1">
                              <LogIn className="h-3 w-3 text-emerald-600" />
                              {formatTime(record.check_in)}
                            </span>
                            {record.check_out ? (
                              <span className="flex items-center gap-1">
                                <LogOut className="h-3 w-3 text-blue-600" />
                                {formatTime(record.check_out)}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-xs">
                                <AlertCircle className="h-3 w-3 ml-1" />
                                لم ينصرف
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
