import { useState } from "react";
import { 
  useListServices, useCreateService, useUpdateService, useDeleteService,
  useListServiceGroups, useCreateServiceGroup 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, Stethoscope, Clock, ShieldAlert, Check, X, Building2 } from "lucide-react";

const serviceSchema = z.object({
  groupId: z.coerce.number().optional().nullable(),
  branch: z.string().min(1, "الفرع مطلوب"),
  name: z.string().min(2, "الاسم مطلوب"),
  isVisible: z.boolean().default(true),
  priceType: z.enum(['fixed', 'variable']),
  price: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
  units: z.coerce.number().min(1, "الوحدات يجب أن تكون 1 على الأقل"),
  patientFee: z.coerce.number().min(0, "رسوم المريض لا يمكن أن تكون سالبة"),
  durationMinutes: z.coerce.number().optional().nullable(),
  usesConsumables: z.boolean().default(false)
});

const groupSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  type: z.enum(['private', 'insurance']),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable()
});

export default function Services() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);

  const { data: services, isLoading: servicesLoading } = useListServices({});
  const { data: groups, isLoading: groupsLoading } = useListServiceGroups();

  const createService = useCreateService({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إضافة الخدمة بنجاح" });
        queryClient.invalidateQueries();
        setIsServiceDialogOpen(false);
        serviceForm.reset();
      }
    }
  });

  const updateService = useUpdateService({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم التعديل", description: "تم تحديث بيانات الخدمة بنجاح" });
        queryClient.invalidateQueries();
        setIsServiceDialogOpen(false);
        setEditingServiceId(null);
      }
    }
  });

  const deleteService = useDeleteService({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف الخدمة بنجاح" });
        queryClient.invalidateQueries();
      }
    }
  });

  const createGroup = useCreateServiceGroup({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إضافة المجموعة بنجاح" });
        queryClient.invalidateQueries();
        setIsGroupDialogOpen(false);
        groupForm.reset();
      }
    }
  });

  const serviceForm = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      branch: "غزة",
      isVisible: true,
      priceType: "fixed",
      price: 0,
      units: 1,
      patientFee: 0,
      usesConsumables: false
    }
  });

  const groupForm = useForm<z.infer<typeof groupSchema>>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      type: "private"
    }
  });

  const openEditService = (service: any) => {
    setEditingServiceId(service.id);
    serviceForm.reset({
      groupId: service.groupId,
      branch: service.branch,
      name: service.name,
      isVisible: service.isVisible,
      priceType: service.priceType,
      price: service.price,
      units: service.units,
      patientFee: service.patientFee,
      durationMinutes: service.durationMinutes,
      usesConsumables: service.usesConsumables
    });
    setIsServiceDialogOpen(true);
  };

  const onServiceSubmit = (values: z.infer<typeof serviceSchema>) => {
    if (editingServiceId) {
      updateService.mutate({ id: editingServiceId, data: values });
    } else {
      createService.mutate({ data: values });
    }
  };

  const onGroupSubmit = (values: z.infer<typeof groupSchema>) => {
    createGroup.mutate({ data: values });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary" /> قائمة الخدمات
        </h1>
      </div>

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
          <TabsTrigger value="services">الخدمات الطبية</TabsTrigger>
          <TabsTrigger value="groups">مجموعات الخدمات (التأمين/الخاص)</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isServiceDialogOpen} onOpenChange={(open) => {
              setIsServiceDialogOpen(open);
              if (!open) { setEditingServiceId(null); serviceForm.reset(); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> خدمة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingServiceId ? 'تعديل الخدمة' : 'إضافة خدمة جديدة'}</DialogTitle>
                </DialogHeader>
                <Form {...serviceForm}>
                  <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={serviceForm.control} name="name" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>اسم الخدمة *</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={serviceForm.control} name="groupId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>المجموعة</FormLabel>
                          <Select onValueChange={v => field.onChange(v === "none" || !v ? null : parseInt(v))} value={field.value?.toString() ?? "none"}>
                            <FormControl><SelectTrigger><SelectValue placeholder="بدون مجموعة" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="none">بدون مجموعة</SelectItem>
                              {Array.isArray(groups) && groups.map(g => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={serviceForm.control} name="branch" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الفرع</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="غزة">فرع غزة</SelectItem>
                              <SelectItem value="خان يونس">فرع خان يونس</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={serviceForm.control} name="priceType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع السعر</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="fixed">ثابت</SelectItem>
                              <SelectItem value="variable">متغير</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={serviceForm.control} name="price" render={({ field }) => (
                        <FormItem>
                          <FormLabel>السعر الكلي (₪) *</FormLabel>
                          <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={serviceForm.control} name="patientFee" render={({ field }) => (
                        <FormItem>
                          <FormLabel>يتحمله المريض (₪) *</FormLabel>
                          <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                          <FormDescription>للتأمين أدخل نسبة تحمل المريض، للخاص يكون نفس السعر الكلي</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={serviceForm.control} name="units" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوحدات</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={serviceForm.control} name="durationMinutes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>المدة المتوقعة (دقائق)</FormLabel>
                          <FormControl><Input type="number" {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 p-4 bg-secondary/30 rounded-lg border">
                      <FormField control={serviceForm.control} name="isVisible" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg gap-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">تفعيل الخدمة</FormLabel>
                            <FormDescription>هل تظهر في قائمة الحجوزات؟</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />

                      <FormField control={serviceForm.control} name="usesConsumables" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg gap-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">تستهلك مستلزمات؟</FormLabel>
                            <FormDescription>يتم ربطها مع المخزون لاحقاً</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsServiceDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createService.isPending || updateService.isPending}>
                        {createService.isPending || updateService.isPending ? "جاري الحفظ..." : "حفظ الخدمة"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>الخدمة</TableHead>
                    <TableHead>المجموعة</TableHead>
                    <TableHead>السعر الكلي</TableHead>
                    <TableHead>رسوم المريض</TableHead>
                    <TableHead>الوقت</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-left">أدوات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : !Array.isArray(services) || services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">لا يوجد خدمات مضافة</TableCell>
                    </TableRow>
                  ) : (
                    services.map(service => (
                      <TableRow key={service.id}>
                        <TableCell>
                          <div className="font-medium text-primary-foreground/90 flex items-center gap-2">
                            {service.name}
                            {service.usesConsumables && <Badge variant="outline" className="text-[10px] h-4 py-0 bg-blue-50 text-blue-700 border-blue-200">مستلزمات</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="h-3 w-3" /> {service.branch}
                          </div>
                        </TableCell>
                        <TableCell>
                          {service.groupName ? <Badge variant="secondary">{service.groupName}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        <TableCell className="font-mono font-medium" dir="ltr">₪ {service.price}</TableCell>
                        <TableCell className="font-mono font-bold text-emerald-600" dir="ltr">₪ {service.patientFee}</TableCell>
                        <TableCell>
                          {service.durationMinutes ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" /> {service.durationMinutes} د
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {service.isVisible ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => openEditService(service)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>حذف الخدمة</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    هل أنت متأكد من حذف خدمة ({service.name})؟
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex gap-2">
                                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteService.mutate({ id: service.id })} className="bg-red-600 hover:bg-red-700">نعم، احذف</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> مجموعة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة مجموعة خدمات</DialogTitle>
                </DialogHeader>
                <Form {...groupForm}>
                  <form onSubmit={groupForm.handleSubmit(onGroupSubmit)} className="space-y-4 pt-2">
                    <FormField control={groupForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم المجموعة *</FormLabel>
                        <FormControl><Input placeholder="مثال: نقابة المهندسين" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={groupForm.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>النوع</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="private">خاص / مؤسسة خاصة</SelectItem>
                            <SelectItem value="insurance">تأمين صحي</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={groupForm.control} name="validFrom" render={({ field }) => (
                        <FormItem>
                          <FormLabel>صالح من (اختياري)</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={groupForm.control} name="validTo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>صالح إلى (اختياري)</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsGroupDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createGroup.isPending}>حفظ المجموعة</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupsLoading ? (
               Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-24" /></CardContent></Card>)
            ) : !Array.isArray(groups) || groups.length === 0 ? (
              <div className="col-span-full p-8 text-center text-muted-foreground border rounded-lg bg-secondary/20">
                لا يوجد مجموعات حالياً
              </div>
            ) : (
              groups.map(group => (
                <Card key={group.id} className="hover-elevate">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.type === 'insurance' ? (
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">تأمين</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">خاص</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {group.validFrom && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>صالح من:</span>
                        <span dir="ltr">{new Date(group.validFrom).toLocaleDateString('ar-EG')}</span>
                      </div>
                    )}
                    {group.validTo && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>صالح إلى:</span>
                        <span dir="ltr">{new Date(group.validTo).toLocaleDateString('ar-EG')}</span>
                      </div>
                    )}
                    {(!group.validFrom && !group.validTo) && (
                      <div className="text-muted-foreground flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" /> فترة الصلاحية مفتوحة</div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}