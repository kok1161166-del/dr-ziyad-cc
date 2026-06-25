import { useState } from "react";
import { useListAppointments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Send, Bell, Megaphone, CheckCircle2, Clock, Phone, Users, Calendar } from "lucide-react";

const TODAY = new Date().toISOString().split("T")[0];

const TEMPLATES = [
  { id: 1, name: "تذكير موعد اليوم", text: "مرحباً {{name}}، نذكركم بموعدكم اليوم في عيادة د. زياد أبو دقة." },
  { id: 2, name: "تأكيد الحجز", text: "عزيزنا {{name}}، تم تأكيد حجزكم بتاريخ {{date}}. نتطلع لرؤيتكم." },
  { id: 3, name: "عرض خاص", text: "عزيزنا {{name}}، يسعدنا إعلامكم عن عرض خاص في عيادتنا. للمزيد اتصل بنا." },
  { id: 4, name: "متابعة بعد الزيارة", text: "مرحباً {{name}}، نتمنى أن تكونوا بخير بعد زيارتكم. للاستفسار لا تترددوا." },
];

const CAMPAIGNS = [
  { id: 1, name: "حملة رمضان 2025", status: "مكتملة", sent: 142, date: "2025-03-01", type: "عرض" },
  { id: 2, name: "تذكير مرضى السكري", status: "مكتملة", sent: 58, date: "2025-04-15", type: "متابعة" },
  { id: 3, name: "عرض صيف 2025", status: "مجدولة", sent: 0, date: "2025-07-01", type: "عرض" },
];

function StatsCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Communication() {
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageText, setMessageText] = useState("");
  const [channel, setChannel] = useState("whatsapp");

  const { data: appointments } = useListAppointments({ date: TODAY });
  const todayCount = appointments?.total ?? 0;

  const handleTemplateSelect = (id: string) => {
    setSelectedTemplate(id);
    const t = TEMPLATES.find(t => t.id === parseInt(id));
    if (t) setMessageText(t.text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">التواصل والتسويق</h1>
          <p className="text-muted-foreground text-sm mt-1">رسائل تذكير المرضى والحملات التسويقية</p>
        </div>
        <Button onClick={() => setComposeOpen(true)}>
          <Send className="h-4 w-4 ml-2" />
          إرسال رسالة
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={Users} label="مرضى اليوم" value={String(todayCount)} color="bg-blue-100 text-blue-700" />
        <StatsCard icon={MessageSquare} label="رسائل هذا الشهر" value="0" color="bg-green-100 text-green-700" />
        <StatsCard icon={CheckCircle2} label="تم التسليم" value="0" color="bg-violet-100 text-violet-700" />
        <StatsCard icon={Megaphone} label="حملات نشطة" value={String(CAMPAIGNS.filter(c => c.status === "مجدولة").length)} color="bg-orange-100 text-orange-700" />
      </div>

      <Tabs defaultValue="reminders">
        <TabsList>
          <TabsTrigger value="reminders"><Bell className="h-4 w-4 ml-1" />التذكيرات</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="h-4 w-4 ml-1" />الحملات</TabsTrigger>
          <TabsTrigger value="templates"><MessageSquare className="h-4 w-4 ml-1" />القوالب</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                مرضى اليوم — تذكير الموعد
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments?.appointments && appointments.appointments.length > 0 ? (
                <div className="space-y-2">
                  {appointments.appointments.slice(0, 10).map(apt => (
                    <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {apt.patientNameAr?.charAt(0) ?? "؟"}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{apt.patientNameAr}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {apt.appointmentTime ?? "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{apt.status}</Badge>
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-7">
                          <MessageSquare className="h-3 w-3" />
                          واتساب
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">لا توجد مواعيد اليوم</p>
                </div>
              )}
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>لتفعيل الإرسال التلقائي عبر واتساب أو SMS، يرجى ربط الخدمة من إعدادات التكاملات.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <div className="space-y-3">
            {CAMPAIGNS.map(c => (
              <Card key={c.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {c.date} · {c.type} · {c.sent > 0 ? `${c.sent} رسالة مرسلة` : "لم يتم الإرسال بعد"}
                      </div>
                    </div>
                    <Badge variant={c.status === "مكتملة" ? "secondary" : "default"}>{c.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="outline" className="w-full">
            <Megaphone className="h-4 w-4 ml-2" />
            حملة جديدة
          </Button>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <Card key={t.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => { handleTemplateSelect(String(t.id)); setComposeOpen(true); }}>
                <CardContent className="pt-4 pb-3">
                  <div className="font-medium text-sm mb-1">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.text}</div>
                  <Button size="sm" variant="ghost" className="mt-2 h-6 text-xs">
                    <Send className="h-3 w-3 ml-1" />
                    استخدام القالب
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إرسال رسالة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>قناة الإرسال</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">واتساب</SelectItem>
                  <SelectItem value="sms">رسالة SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>استخدام قالب</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger><SelectValue placeholder="اختر قالباً..." /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>نص الرسالة</Label>
              <Textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={4} placeholder="اكتب نص الرسالة هنا..." />
            </div>
            <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              يتطلب الإرسال الفعلي ربط خدمة واتساب Business أو SMS. تواصل مع الدعم لتفعيلها.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>إلغاء</Button>
            <Button disabled>
              <Send className="h-4 w-4 ml-2" />
              إرسال (يتطلب تفعيل)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
