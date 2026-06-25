import { useState } from "react";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Database, GitBranch, CheckCircle2, AlertCircle, Download, Upload, Clock, Shield, HardDrive } from "lucide-react";

const BRANCHES = [
  { name: "فرع غزة", status: "متزامن", lastSync: "منذ 5 دقائق", color: "text-green-600" },
  { name: "فرع خان يونس", status: "متزامن", lastSync: "منذ 12 دقيقة", color: "text-green-600" },
];

const BACKUP_HISTORY = [
  { id: 1, type: "تلقائي", date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), size: "4.2 MB", status: "ناجح" },
  { id: 2, type: "يدوي",   date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), size: "4.0 MB", status: "ناجح" },
  { id: 3, type: "تلقائي", date: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), size: "3.9 MB", status: "ناجح" },
  { id: 4, type: "تلقائي", date: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(), size: "3.8 MB", status: "ناجح" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
}

function InfoCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
            {sub && <div className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Backup() {
  const [syncing, setSyncing] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const { data: stats } = useGetDashboardStats({});

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2500);
  };

  const handleBackup = () => {
    setBackingUp(true);
    setTimeout(() => setBackingUp(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المزامنة والنسخ الاحتياطي</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة مزامنة الفروع وحفظ احتياطي لقاعدة البيانات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ml-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "جاري المزامنة..." : "مزامنة الآن"}
          </Button>
          <Button onClick={handleBackup} disabled={backingUp}>
            <Download className={`h-4 w-4 ml-2 ${backingUp ? "animate-pulse" : ""}`} />
            {backingUp ? "جاري الحفظ..." : "نسخ احتياطي"}
          </Button>
        </div>
      </div>

      {backingUp && (
        <Alert>
          <Database className="h-4 w-4" />
          <AlertDescription>جاري إنشاء النسخة الاحتياطية...</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard icon={Database}     label="حجم قاعدة البيانات" value="4.2 MB"   color="bg-blue-100 text-blue-700" />
        <InfoCard icon={HardDrive}    label="إجمالي النسخ الاحتياطية" value="4"   sub="آخر 30 يوم" color="bg-violet-100 text-violet-700" />
        <InfoCard icon={GitBranch}    label="الفروع المتزامنة"   value="2 / 2"    color="bg-green-100 text-green-700" />
        <InfoCard icon={Shield}       label="آخر نسخة احتياطية"  value="منذ ساعتين" color="bg-orange-100 text-orange-700" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Branch Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              حالة مزامنة الفروع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {BRANCHES.map(b => (
              <div key={b.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={`h-4 w-4 ${b.color}`} />
                  <div>
                    <div className="font-medium text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {b.lastSync}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className={`text-xs ${b.color}`}>{b.status}</Badge>
              </div>
            ))}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>حالة المزامنة</span>
                <span>100%</span>
              </div>
              <Progress value={100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              إعدادات النسخ الاحتياطي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="text-sm">النسخ الاحتياطي التلقائي</div>
              <Badge variant="default" className="text-xs bg-green-600">مفعّل</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="text-sm">التكرار</div>
              <span className="text-sm font-medium">كل 2 ساعة</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <div className="text-sm">مدة الاحتفاظ</div>
              <span className="text-sm font-medium">30 يوم</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="text-sm">موقع التخزين</div>
              <span className="text-sm font-medium">خادم محلي</span>
            </div>
            <Button variant="outline" size="sm" className="w-full mt-2">
              <Upload className="h-3.5 w-3.5 ml-2" />
              تعديل إعدادات النسخ
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            سجل النسخ الاحتياطية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {BACKUP_HISTORY.map(b => (
              <div key={b.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <div className="text-sm font-medium">نسخ {b.type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(b.date)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{b.size}</span>
                  <Badge variant="secondary" className="text-xs text-green-600">{b.status}</Badge>
                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
