import { useState, useEffect } from "react";
import { 
  useGetSystemSettings, useUpdateSystemSettings, 
  useGetTaxSettings, useUpdateTaxSettings,
  useListBranches, useListReferralProviders, useCreateReferralProvider
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Settings as SettingsIcon, Receipt, Network, Save, Plus } from "lucide-react";

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
            <TabsList className="w-full max-w-2xl grid grid-cols-3 mb-6">
              <TabsTrigger value="system" className="gap-2"><SettingsIcon className="h-4 w-4" /> الإعدادات العامة</TabsTrigger>
              <TabsTrigger value="tax" className="gap-2"><Receipt className="h-4 w-4" /> الإعدادات الضريبية</TabsTrigger>
              <TabsTrigger value="providers" className="gap-2"><Network className="h-4 w-4" /> جهات الإحالة</TabsTrigger>
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
          </Tabs>
        </div>
      </div>
    </div>
  );
}