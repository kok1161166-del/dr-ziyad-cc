import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getActivityLog } from "@/lib/db";
import type { DbAuditLog } from "@/lib/db";
import {
  History, Filter, Calendar, User, Search, ChevronLeft, ChevronRight,
  Plus, Edit3, Trash2, LogIn, LogOut, CheckCircle2, XCircle,
  ShoppingCart, DollarSign, FileText, UserPlus, Clock, Loader2,
} from "lucide-react";

const PAGE_SIZE = 50;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG") + " " + d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} ي`;
}

const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  create: { label: "إضافة", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <Plus className="h-3 w-3" /> },
  update: { label: "تعديل", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Edit3 className="h-3 w-3" /> },
  delete: { label: "حذف", color: "bg-red-100 text-red-700 border-red-200", icon: <Trash2 className="h-3 w-3" /> },
  check_in: { label: "حضور", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <LogIn className="h-3 w-3" /> },
  check_out: { label: "انصراف", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <LogOut className="h-3 w-3" /> },
  arrive: { label: "وصل", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancel: { label: "إلغاء", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  purchase: { label: "شراء", color: "bg-purple-100 text-purple-700 border-purple-200", icon: <ShoppingCart className="h-3 w-3" /> },
  payment: { label: "دفع", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <DollarSign className="h-3 w-3" /> },
};

const entityConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  booking: { label: "حجز", icon: <Calendar className="h-3 w-3" /> },
  patient: { label: "مريض", icon: <User className="h-3 w-3" /> },
  appointment: { label: "موعد", icon: <Clock className="h-3 w-3" /> },
  visit: { label: "زيارة", icon: <FileText className="h-3 w-3" /> },
  attendance: { label: "حضور", icon: <LogIn className="h-3 w-3" /> },
  product_sale: { label: "مبيعات", icon: <ShoppingCart className="h-3 w-3" /> },
  payment: { label: "دفعة", icon: <DollarSign className="h-3 w-3" /> },
};

function describeLog(entry: DbAuditLog): string {
  const action = actionConfig[entry.action_type]?.label || entry.action_type;
  const entity = entityConfig[entry.entity_type]?.label || entry.entity_type;
  const name = entry.entity_name || "";
  const desc = entry.details?.description as string || "";

  if (entry.action_type === "create" && entry.entity_type === "booking") {
    return desc || `حجز جديد لـ ${name}`;
  }
  if (entry.action_type === "check_in" && entry.entity_type === "attendance") {
    return `تسجيل حضور ${name}`;
  }
  if (entry.action_type === "check_out" && entry.entity_type === "attendance") {
    return `تسجيل انصراف ${name}`;
  }
  if (entry.action_type === "create" && entry.entity_type === "patient") {
    return `تسجيل مريض جديد: ${name}`;
  }
  if (entry.action_type === "create" && entry.entity_type === "appointment") {
    return desc || `موعد جديد لـ ${name}`;
  }
  if (entry.action_type === "arrive") {
    return `تأكيد حضور المريض ${name}`;
  }
  if (entry.action_type === "purchase") {
    return desc || `شراء منتجات بقيمة ${name}`;
  }
  if (entry.action_type === "payment") {
    return desc || `دفعة بقيمة ${name}`;
  }
  if (entry.action_type === "update" && entry.entity_type === "booking") {
    return desc || `تحديث حالة الحجز لـ ${name}`;
  }
  if (entry.action_type === "cancel" && entry.entity_type === "booking") {
    return desc || `إلغاء حجز ${name}`;
  }
  return desc || `${action} ${entity} ${name}`.trim();
}

export default function ActivityLog() {
  const [logs, setLogs] = useState<DbAuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [entityType, setEntityType] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getActivityLog({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        entityType: entityType === "all" ? undefined : entityType,
        actionType: actionType === "all" ? undefined : actionType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(result.data);
      setTotalCount(result.count);
    } catch {
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, entityType, actionType, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const filteredLogs = searchQuery
    ? logs.filter(l =>
        l.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.entity_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        describeLog(l).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            سجل النشاطات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount > 0 ? `${totalCount} نشاط` : "جاري التحميل..."}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-primary" />
              تصفية
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setPage(0); fetchLogs(); }}>
              <Filter className="h-4 w-4" />
              تطبيق
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">نوع النشاط</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="create">إضافة</SelectItem>
                  <SelectItem value="update">تعديل</SelectItem>
                  <SelectItem value="delete">حذف</SelectItem>
                  <SelectItem value="check_in">تسجيل حضور</SelectItem>
                  <SelectItem value="check_out">تسجيل انصراف</SelectItem>
                  <SelectItem value="arrive">تأكيد حضور</SelectItem>
                  <SelectItem value="cancel">إلغاء</SelectItem>
                  <SelectItem value="purchase">شراء</SelectItem>
                  <SelectItem value="payment">دفع</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">القسم</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="booking">الحجوزات</SelectItem>
                  <SelectItem value="patient">المرضى</SelectItem>
                  <SelectItem value="appointment">المواعيد</SelectItem>
                  <SelectItem value="visit">الزيارات</SelectItem>
                  <SelectItem value="attendance">الحضور</SelectItem>
                  <SelectItem value="product_sale">المبيعات</SelectItem>
                  <SelectItem value="payment">المدفوعات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-[140px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-[140px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">بحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="اسم موظف أو مريض..."
                  className="pr-9 h-9 w-[200px]"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-1 p-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <History className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-medium mb-1">لا توجد نشاطات</p>
              <p className="text-sm">لم يتم تسجيل أي نشاط بعد</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredLogs.map((entry, i) => {
                const actionCfg = actionConfig[entry.action_type] || { label: entry.action_type, color: "bg-gray-100 text-gray-700 border-gray-200", icon: null };
                const entityCfg = entityConfig[entry.entity_type] || { label: entry.entity_type, icon: null };
                return (
                  <div key={entry.id ?? i} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{entry.user_name}</span>
                        <Badge variant="outline" className={`text-xs ${actionCfg.color}`}>
                          <span className="flex items-center gap-1">{actionCfg.icon}{actionCfg.label}</span>
                        </Badge>
                        {entityCfg.icon && (
                          <Badge variant="secondary" className="text-xs">
                            <span className="flex items-center gap-1">{entityCfg.icon}{entityCfg.label}</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-1">
                        {describeLog(entry)}
                      </p>
                      {(entry.details as Record<string, string> | null)?.changed_from && (entry.details as Record<string, string> | null)?.changed_to && (
                        <div className="mt-1 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg inline-block">
                          <span>من <span className="line-through">{(entry.details as Record<string, string>).changed_from}</span> إلى <span className="font-medium">{(entry.details as Record<string, string>).changed_to}</span></span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground text-left shrink-0 flex flex-col items-end gap-1">
                      <span className="whitespace-nowrap" title={formatDateTime(entry.created_at!)}>
                        {formatTimeAgo(entry.created_at!)}
                      </span>
                      <span className="text-[10px] opacity-60">
                        {new Date(entry.created_at!).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronRight className="h-4 w-4" />
            السابق
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            صفحة {page + 1} من {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            التالي
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
