import { useState, useEffect } from "react";
import { 
  useGetSystemSettings, useUpdateSystemSettings, 
  useGetTaxSettings, useUpdateTaxSettings,
  useListBranches, useListReferralProviders, useCreateReferralProvider,
  useListWorkingDays, useUpsertWorkingDays,
  useListHolidays, useCreateHoliday, useDeleteHoliday
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Receipt, Network, Save, Plus, CalendarDays, Trash2 } from "lucide-react";

const providerSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional()
});

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: systemSettings, isLoading: sysLoading } = useGetSystemSettings();
  const { data: taxSettings, isLoading: taxLoading } = useGetTaxSettings();
  const { data: branches } = useListBranches();
  const { data: providers, isLoading: provLoading } = useListReferralProviders();

  const updateSystem = useUpdateSystemSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم تحديث إعدادات النظام" });
        queryClient.invalidateQueries();
      }
    }
  });

  const updateTax = useUpdateTaxSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم تحديث الإعدادات الضريبية" });
        queryClient.invalidateQueries();
      }
    }
  });

  const createProvider = useCreateReferralProvider({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم إضافة جهة الإحالة بنجاح" });
        queryClient.invalidateQueries();
        setIsProvOpen(false);
        provForm.reset();
      }
    }
  });

  // Local state for forms
  const [sysState, setSysState] = useState({
    activeBranch: "غزة",
    appointmentOrder: "by_time",
    autoRefreshMinutes: 5,
    displayBranch: ""
  });

  const [taxState, setTaxState] = useState({
    taxType: "on_request",
    taxTitle: "ضريبة القيمة المضافة",
    taxPercentage: 16
  });

  // ── Working days state ──
  const { data: workingDays, isLoading: wdLoading } = useListWorkingDays();
  const { data: holidays, isLoading: holLoading } = useListHolidays();
  const { data: branchList } = useListBranches();

  const upsertWD = useUpsertWorkingDays({
    mutation: {
      onSuccess: () => { toast({ title: "تم الحفظ", description: "تم تحديث أيام العمل" }); queryClient.invalidateQueries(); }
    }
  });

  const createHoliday = useCreateHoliday({
    mutation: { onSuccess: () => { toast({ title: "تمت الإضافة" }); queryClient.invalidateQueries(); setIsHolOpen(false); holForm.reset(); } }
  });
  const deleteHoliday = useDeleteHoliday({
    mutation: { onSuccess: () => { toast({ title: "تم الحذف" }); queryClient.invalidateQueries(); } }
  });

  const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const BRANCHES = branchList?.map(b => b.name) ?? [];

  // Build a local editable schedule: branch → dayOfWeek → {isWorking, openTime, closeTime}
  type DayEntry = { isWorking: boolean; openTime: string; closeTime: string };
  const [schedule, setSchedule] = useState<Record<string, Record<number, DayEntry>>>({});

  useEffect(() => {
    if (workingDays) {
      const map: Record<string, Record<number, DayEntry>> = {};
      BRANCHES.forEach(b => {
        map[b] = {};
        for (let d = 0; d < 7; d++) {
          const found = workingDays.find(w => w.branch === b && w.dayOfWeek === d);
          map[b][d] = { isWorking: found?.isWorking ?? (d < 5), openTime: found?.openTime ?? "09:00", closeTime: found?.closeTime ?? "17:00" };
        }
      });
      setSchedule(map);
    }
  }, [workingDays]);

  const onSaveSchedule = () => {
    const rows: Array<{ branch: string; dayOfWeek: number; isWorking: boolean; openTime: string; closeTime: string }> = [];
    BRANCHES.forEach(b => {
      for (let d = 0; d < 7; d++) {
        const entry = schedule[b]?.[d];
        if (entry) rows.push({ branch: b, dayOfWeek: d, isWorking: entry.isWorking, openTime: entry.openTime, closeTime: entry.closeTime });
      }
    });
    upsertWD.mutate({ data: rows });
  };

  const holSchema = z.object({ date: z.string().min(1, "التاريخ مطلوب"), title: z.string().min(2, "العنوان مطلوب"), branch: z.string().optional() });
  const [isHolOpen, setIsHolOpen] = useState(false);
  const holForm = useForm<z.infer<typeof holSchema>>({ resolver: zodResolver(holSchema), defaultValues: { date: "", title: "", branch: "" } });

  const [isProvOpen, setIsProvOpen] = useState(false);
  const provForm = useForm<z.infer<typeof providerSchema>>({
    resolver: zodResolver(providerSchema),
    defaultValues: { name: "", specialty: "", phone: "", address: "" }
  });

  // Sync server data to local state
  useEffect(() => {
    if (systemSettings) {
      setSysState({
        activeBranch: systemSettings.activeBranch || "غزة",
        appointmentOrder: systemSettings.appointmentOrder || "by_time",
        autoRefreshMinutes: systemSettings.autoRefreshMinutes || 5,
        displayBranch: systemSettings.displayBranch || ""
      });
    }
  }, [systemSettings]);

  useEffect(() => {
    if (taxSettings) {
      setTaxState({
        taxType: taxSettings.taxType || "on_request",
        taxTitle: taxSettings.taxTitle || "ضريبة القيمة المضافة",
        taxPercentage: taxSettings.taxPercentage || 16
      });
    }
  }, [taxSettings]);

  const onSysSave = () => {
    updateSystem.mutate({ data: sysState as any });
  };

  const onTaxSave = () => {
    updateTax.mutate({ data: taxState as any });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-primary" /> إعدادات النظام
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-4">
          <Tabs defaultValue="system" className="w-full">
            <TabsList className="w-full max-w-3xl grid grid-cols-4 mb-6">
              <TabsTrigger value="system" className="gap-2"><SettingsIcon className="h-4 w-4" /> الإعدادات العامة</TabsTrigger>
              <TabsTrigger value="tax" className="gap-2"><Receipt className="h-4 w-4" /> الإعدادات الضريبية</TabsTrigger>
              <TabsTrigger value="providers" className="gap-2"><Network className="h-4 w-4" /> جهات الإحالة</TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2"><CalendarDays className="h-4 w-4" /> أيام العمل</TabsTrigger>
            </TabsList>

            <TabsContent value="system">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>إعدادات النظام الأساسية</CardTitle>
                  <CardDescription>التحكم في طريقة عمل النظام وفروعه</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {sysLoading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">الفرع النشط حالياً</label>
                        <Select value={sysState.activeBranch} onValueChange={v => setSysState({...sysState, activeBranch: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {branches?.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium">ترتيب عرض الحجوزات في الشاشات</label>
                        <RadioGroup value={sysState.appointmentOrder} onValueChange={v => setSysState({...sysState, appointmentOrder: v})} className="flex gap-6">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="by_time" id="order1" />
                            <label htmlFor="order1" className="text-sm font-normal cursor-pointer">حسب وقت الحجز</label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="by_creation" id="order2" />
                            <label htmlFor="order2" className="text-sm font-normal cursor-pointer">حسب أولوية التسجيل</label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">تحديث تلقائي للشاشات (بالدقائق)</label>
                        <Input 
                          type="number" 
                          value={sysState.autoRefreshMinutes} 
                          onChange={e => setSysState({...sysState, autoRefreshMinutes: parseInt(e.target.value) || 0})} 
                        />
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t flex justify-end">
                    <Button onClick={onSysSave} disabled={updateSystem.isPending} className="gap-2">
                      <Save className="h-4 w-4" /> حفظ الإعدادات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tax">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle>الإعدادات الضريبية والفواتير</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {taxLoading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div> : (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-medium">نظام احتساب الضريبة</label>
                        <RadioGroup value={taxState.taxType} onValueChange={v => setTaxState({...taxState, taxType: v})} className="flex flex-col gap-3">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="on_request" id="tax1" />
                            <label htmlFor="tax1" className="text-sm font-normal cursor-pointer">حسب الطلب (لا تضاف إلا عند طلب المريض لفاتورة ضريبية)</label>
                          </div>
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="automatic" id="tax2" />
                            <label htmlFor="tax2" className="text-sm font-normal cursor-pointer">تلقائي (تضاف على جميع الحجوزات والخدمات تلقائياً)</label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">مسمى الضريبة في الفاتورة</label>
                          <Input 
                            value={taxState.taxTitle} 
                            onChange={e => setTaxState({...taxState, taxTitle: e.target.value})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">النسبة المئوية (%)</label>
                          <Input 
                            type="number" 
                            value={taxState.taxPercentage} 
                            onChange={e => setTaxState({...taxState, taxPercentage: parseFloat(e.target.value) || 0})} 
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="pt-4 border-t flex justify-end">
                    <Button onClick={onTaxSave} disabled={updateTax.isPending} className="gap-2">
                      <Save className="h-4 w-4" /> حفظ الضرائب
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="providers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>جهات الإحالة الخارجية</CardTitle>
                    <CardDescription>الأطباء أو المراكز التي تحول المرضى لعيادتك</CardDescription>
                  </div>
                  <Dialog open={isProvOpen} onOpenChange={setIsProvOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> إضافة جهة</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>إضافة جهة إحالة جديدة</DialogTitle></DialogHeader>
                      <Form {...provForm}>
                        <form onSubmit={provForm.handleSubmit(data => createProvider.mutate({ data }))} className="space-y-4 pt-2">
                          <FormField control={provForm.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>الاسم *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={provForm.control} name="specialty" render={({ field }) => (
                            <FormItem><FormLabel>التخصص</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={provForm.control} name="phone" render={({ field }) => (
                            <FormItem><FormLabel>الهاتف</FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                          )} />
                          <FormField control={provForm.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>العنوان</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                          )} />
                          <div className="flex justify-end pt-4 gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsProvOpen(false)}>إلغاء</Button>
                            <Button type="submit" disabled={createProvider.isPending}>إضافة</Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader className="bg-secondary/20">
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>التخصص</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>العنوان</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {provLoading ? (
                        <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                      ) : !providers || providers.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا يوجد جهات مضافة</TableCell></TableRow>
                      ) : (
                        providers.map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell className="text-sm">{p.specialty || '-'}</TableCell>
                            <TableCell className="text-sm" dir="ltr">{p.phone || '-'}</TableCell>
                            <TableCell className="text-sm">{p.address || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="schedule">
              <div className="space-y-6">
                {/* Working days per branch */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle>أيام العمل لكل فرع</CardTitle>
                      <CardDescription>حدد أيام وساعات عمل كل فرع</CardDescription>
                    </div>
                    <Button onClick={onSaveSchedule} disabled={upsertWD.isPending} className="gap-2"><Save className="h-4 w-4" /> حفظ الجدول</Button>
                  </CardHeader>
                  <CardContent>
                    {wdLoading ? <Skeleton className="h-48 w-full" /> : (
                      <div className="space-y-8">
                        {BRANCHES.map(branch => (
                          <div key={branch}>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 border-b pb-2">{branch}</h3>
                            <div className="space-y-2">
                              {DAY_NAMES.map((dayName, d) => {
                                const entry = schedule[branch]?.[d] ?? { isWorking: d < 5, openTime: "09:00", closeTime: "17:00" };
                                return (
                                  <div key={d} className={`flex items-center gap-4 p-3 rounded-lg border ${entry.isWorking ? 'bg-emerald-50 border-emerald-200' : 'bg-secondary/30 border-transparent'}`}>
                                    <Switch
                                      checked={entry.isWorking}
                                      onCheckedChange={val => setSchedule(s => ({ ...s, [branch]: { ...s[branch], [d]: { ...entry, isWorking: val } } }))}
                                    />
                                    <span className={`w-20 text-sm font-medium ${!entry.isWorking ? 'text-muted-foreground' : ''}`}>{dayName}</span>
                                    {entry.isWorking ? (
                                      <div className="flex items-center gap-3 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">من</span>
                                          <Input type="time" value={entry.openTime} className="w-32 h-8 text-sm"
                                            onChange={e => setSchedule(s => ({ ...s, [branch]: { ...s[branch], [d]: { ...entry, openTime: e.target.value } } }))} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground">إلى</span>
                                          <Input type="time" value={entry.closeTime} className="w-32 h-8 text-sm"
                                            onChange={e => setSchedule(s => ({ ...s, [branch]: { ...s[branch], [d]: { ...entry, closeTime: e.target.value } } }))} />
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-sm text-muted-foreground italic">إجازة</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Holidays */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle>الإجازات والأعياد</CardTitle>
                      <CardDescription>أضف الإجازات الرسمية والمناسبات الخاصة</CardDescription>
                    </div>
                    <Dialog open={isHolOpen} onOpenChange={setIsHolOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> إضافة إجازة</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>إضافة إجازة أو عطلة</DialogTitle></DialogHeader>
                        <Form {...holForm}>
                          <form onSubmit={holForm.handleSubmit(data => createHoliday.mutate({ data: { date: data.date, title: data.title, branch: (!data.branch || data.branch === "__all__") ? null : data.branch } }))} className="space-y-4 pt-2">
                            <FormField control={holForm.control} name="title" render={({ field }) => (
                              <FormItem><FormLabel>العنوان *</FormLabel><FormControl><Input placeholder="مثال: عيد الفطر المبارك" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={holForm.control} name="date" render={({ field }) => (
                              <FormItem><FormLabel>التاريخ *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={holForm.control} name="branch" render={({ field }) => (
                              <FormItem><FormLabel>يطبق على</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "__all__"}>
                                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    <SelectItem value="__all__">جميع الفروع</SelectItem>
                                    <SelectItem value="فرع غزة">فرع غزة</SelectItem>
                                    <SelectItem value="فرع خان يونس">فرع خان يونس</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )} />
                            <div className="flex justify-end pt-4 gap-2">
                              <Button type="button" variant="outline" onClick={() => setIsHolOpen(false)}>إلغاء</Button>
                              <Button type="submit" disabled={createHoliday.isPending}>إضافة</Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader className="bg-secondary/20">
                        <TableRow>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>العنوان</TableHead>
                          <TableHead>الفرع</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holLoading ? (
                          <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                        ) : !holidays || holidays.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">لا يوجد إجازات مضافة</TableCell></TableRow>
                        ) : holidays.map(h => (
                          <TableRow key={h.id}>
                            <TableCell className="font-mono text-sm">{h.date}</TableCell>
                            <TableCell className="font-medium">{h.title}</TableCell>
                            <TableCell className="text-sm">{h.branch || 'جميع الفروع'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteHoliday.mutate({ id: h.id })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}