import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { 
  useListAppointments, useCreateAppointment, 
  useUpdateAppointmentStatus, useRecordAppointmentPayment, 
  useCancelAppointment, useListPatients, useListServices, useListBranches 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Calendar as CalendarIcon, Clock, Filter, DollarSign, XCircle, ChevronDown, CheckCircle, Activity, User, Phone } from "lucide-react";

const appointmentSchema = z.object({
  patientId: z.coerce.number().min(1, "اختر المريض"),
  branch: z.string().min(1, "الفرع مطلوب"),
  appointmentDate: z.string().min(1, "تاريخ الحجز مطلوب"),
  appointmentTime: z.string().min(1, "وقت الحجز مطلوب"),
  source: z.enum(['walk_in', 'phone', 'social_media', 'website', 'email']),
  paymentMethod: z.enum(['cash', 'credit_card', 'check', 'bank_transfer', 'postal_transfer']),
  serviceIds: z.array(z.coerce.number()).optional(),
  doctorId: z.coerce.number().optional().nullable(),
  notes: z.string().optional()
});

const paymentSchema = z.object({
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من 0"),
  paymentMethod: z.enum(['cash', 'credit_card', 'check', 'bank_transfer', 'postal_transfer']),
  note: z.string().optional()
});

const getStatusBadge = (status: string) => {
  const map: Record<string, { label: string; className: string }> = {
    waiting_arrival: { label: "منتظر الوصول", className: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    in_reception: { label: "في الاستقبال", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    in_examination: { label: "في غرفة الكشف", className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100" },
    completed: { label: "أنهى الكشف", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
    session_done: { label: "أنهى الجلسة", className: "bg-teal-100 text-teal-800 hover:bg-teal-100" },
    postponed: { label: "تأجيل الحجز", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
    no_show: { label: "لم يحضر", className: "bg-red-100 text-red-800 hover:bg-red-100" },
    cancelled: { label: "ملغي", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  };
  const s = map[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  return <Badge variant="secondary" className={s.className}>{s.label}</Badge>;
};

export default function Appointments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const search = useSearch();
  const today = new Date().toISOString().split('T')[0];
  const [dateFilter, setDateFilter] = useState<string>(today);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [paymentAppId, setPaymentAppId] = useState<number | null>(null);

  // When navigating from receivables with ?id=xxx, remove date filter and open payment dialog
  useEffect(() => {
    const params = new URLSearchParams(search);
    const deepId = params.get("id");
    if (deepId) {
      setDateFilter("");
      setPaymentAppId(parseInt(deepId));
    }
  }, [search]);

  const { data, isLoading } = useListAppointments(dateFilter ? { date: dateFilter } : {});
  const { data: patientsList } = useListPatients({ limit: 100 });
  const { data: servicesList } = useListServices({});
  const { data: branches } = useListBranches();

  const createAppointment = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إضافة الحجز بنجاح" });
        queryClient.invalidateQueries();
        setIsAddOpen(false);
        addForm.reset();
      }
    }
  });

  const updateStatus = useUpdateAppointmentStatus({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم التحديث", description: "تم تغيير حالة الحجز" });
        queryClient.invalidateQueries();
      }
    }
  });

  const recordPayment = useRecordAppointmentPayment({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الدفع", description: "تم تسجيل الدفعة بنجاح" });
        queryClient.invalidateQueries();
        setPaymentAppId(null);
        paymentForm.reset();
      }
    }
  });

  const cancelAppointment = useCancelAppointment({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإلغاء", description: "تم إلغاء الحجز بنجاح" });
        queryClient.invalidateQueries();
      }
    }
  });

  const addForm = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      branch: "غزة",
      appointmentDate: today,
      appointmentTime: "10:00",
      source: "phone",
      paymentMethod: "cash",
      serviceIds: [],
    }
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: "cash",
      note: ""
    }
  });

  const onAddSubmit = (values: z.infer<typeof appointmentSchema>) => {
    createAppointment.mutate({ data: values });
  };

  const onPaymentSubmit = (values: z.infer<typeof paymentSchema>) => {
    if (!paymentAppId) return;
    recordPayment.mutate({ id: paymentAppId, data: values });
  };

  const handleStatusChange = (id: number, status: any) => {
    updateStatus.mutate({ id, data: { status } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">الحجوزات</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة حجز جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تسجيل حجز جديد</DialogTitle>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={addForm.control} name="patientId" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>المريض *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر المريض..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {patientsList?.patients.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.nameAr} - {p.localCode}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={addForm.control} name="branch" render={({ field }) => (
                    <FormItem>
                      <FormLabel>الفرع *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {branches?.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                          {!branches && (
                            <>
                              <SelectItem value="غزة">فرع غزة</SelectItem>
                              <SelectItem value="خان يونس">فرع خان يونس</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <div className="hidden md:block"></div>

                  <FormField control={addForm.control} name="appointmentDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الحجز *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={addForm.control} name="appointmentTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>وقت الحجز *</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={addForm.control} name="source" render={({ field }) => (
                    <FormItem>
                      <FormLabel>مصدر الحجز</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="walk_in">زيارة مباشرة</SelectItem>
                          <SelectItem value="phone">هاتف</SelectItem>
                          <SelectItem value="social_media">تواصل اجتماعي</SelectItem>
                          <SelectItem value="website">الموقع الإلكتروني</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={addForm.control} name="paymentMethod" render={({ field }) => (
                    <FormItem>
                      <FormLabel>طريقة الدفع المتوقعة</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="cash">نقدي</SelectItem>
                          <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                          <SelectItem value="check">شيك</SelectItem>
                          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />

                  <FormField control={addForm.control} name="serviceIds" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>الخدمات المطلوبة</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          const current = field.value || [];
                          const id = parseInt(val);
                          if (!current.includes(id)) {
                            field.onChange([...current, id]);
                          }
                        }}
                      >
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر الخدمات..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {servicesList?.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name} (₪{s.price})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value?.map(id => {
                          const service = servicesList?.find(s => s.id === id);
                          return service ? (
                            <Badge key={id} variant="secondary" className="gap-1 px-2 py-1">
                              {service.name}
                              <button type="button" onClick={() => field.onChange(field.value?.filter(i => i !== id))} className="text-muted-foreground hover:text-red-500">
                                <XCircle className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={addForm.control} name="notes" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>ملاحظات الاستقبال</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>إلغاء</Button>
                  <Button type="submit" disabled={createAppointment.isPending}>تأكيد الحجز</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex gap-2 items-center">
            <div className="relative max-w-[200px]">
              <Input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)} 
                className="pl-9"
              />
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <Button variant="outline" onClick={() => setDateFilter(today)}>اليوم</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-secondary/20">
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>المريض</TableHead>
                <TableHead>الخدمات</TableHead>
                <TableHead>الوقت</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الرسوم</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : data?.appointments?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                    لا يوجد حجوزات لهذا اليوم
                  </TableCell>
                </TableRow>
              ) : (
                data?.appointments?.map((app, index) => (
                  <TableRow key={app.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-primary-foreground/90">{app.patientNameAr}</div>
                      <div className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" /> {app.patientCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm" title={app.serviceNames?.join("، ") || "لم يحدد"}>
                        {app.serviceNames?.join("، ") || <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span dir="ltr">{app.appointmentTime}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 px-2 flex gap-1 bg-transparent hover:bg-secondary/50">
                            {getStatusBadge(app.status)}
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'waiting_arrival')}>منتظر الوصول</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'in_reception')}>في الاستقبال</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'in_examination')}>في غرفة الكشف</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'completed')}>أنهى الكشف</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'postponed')}>تأجيل الحجز</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange(app.id, 'no_show')}>لم يحضر</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => cancelAppointment.mutate({ id: app.id })}>إلغاء الحجز</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-bold font-mono tracking-tight" dir="ltr">₪ {app.totalFee}</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="h-2.5 w-2.5" /> مدفوع: {app.paidAmount}
                        </div>
                        {app.remainingAmount > 0 && (
                          <div className="text-[10px] text-red-500 flex items-center gap-1">
                            <Activity className="h-2.5 w-2.5" /> متبقي: {app.remainingAmount}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {app.remainingAmount > 0 && (
                          <Dialog open={paymentAppId === app.id} onOpenChange={(open) => {
                            if (open) {
                              setPaymentAppId(app.id);
                              paymentForm.reset({ amount: app.remainingAmount, paymentMethod: "cash", note: "" });
                            } else {
                              setPaymentAppId(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800">
                                <DollarSign className="h-3 w-3 ml-1" /> دفع
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>تسجيل دفعة نقدية</DialogTitle>
                              </DialogHeader>
                              <Form {...paymentForm}>
                                <form onSubmit={paymentForm.handleSubmit(onPaymentSubmit)} className="space-y-4 pt-2">
                                  <div className="p-3 bg-secondary/20 rounded-md mb-4 flex justify-between items-center">
                                    <span className="text-sm font-medium">المبلغ المتبقي:</span>
                                    <span className="text-lg font-bold text-red-600 font-mono" dir="ltr">₪ {app.remainingAmount}</span>
                                  </div>
                                  <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>المبلغ المدفوع (₪) *</FormLabel>
                                      <FormControl><Input type="number" step="any" max={app.remainingAmount} {...field} /></FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )} />
                                  <FormField control={paymentForm.control} name="paymentMethod" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>طريقة الدفع</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                          <SelectItem value="cash">نقدي</SelectItem>
                                          <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                                          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )} />
                                  <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setPaymentAppId(null)}>إلغاء</Button>
                                    <Button type="submit" disabled={recordPayment.isPending}>تأكيد الدفع</Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
