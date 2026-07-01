import { useState } from "react";
import { 
  useListExpenses, useCreateExpense, 
  useListExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory,
  useListRoutineExpenses, useCreateRoutineExpense, useUpdateRoutineExpense, useDeleteRoutineExpense,
  useListVaults
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, TrendingDown, Filter, FileText, Tag, RepeatIcon, Edit, Trash2 } from "lucide-react";

const expenseSchema = z.object({
  categoryId: z.coerce.number().min(1, "اختر الفئة"),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر"),
  vaultId: z.coerce.number().min(1, "اختر الخزنة للصرف منها"),
  note: z.string().optional()
});

const categorySchema = z.object({
  name: z.string().min(2, "اسم الفئة مطلوب"),
  description: z.string().optional()
});

const routineSchema = z.object({
  categoryId: z.coerce.number().min(1, "اختر الفئة"),
  title: z.string().min(2, "عنوان المصروف مطلوب"),
  amount: z.coerce.number().min(0, "المبلغ يجب أن يكون أكبر من صفر"),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  branch: z.string().optional(),
  note: z.string().optional(),
  isActive: z.boolean().default(true)
});

const frequencyLabel = { daily: "يومي", weekly: "أسبوعي", monthly: "شهري" };

export default function Expenses() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>("all");
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: "", dateTo: "", categoryId: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [isRoutineDialogOpen, setIsRoutineDialogOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: expensesList, isLoading } = useListExpenses({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined,
    categoryId: appliedFilters.categoryId && appliedFilters.categoryId !== "all" ? parseInt(appliedFilters.categoryId) : undefined
  });
  const { data: categories, isLoading: catsLoading } = useListExpenseCategories();
  const { data: vaults } = useListVaults();
  const { data: routineExpenses, isLoading: routineLoading } = useListRoutineExpenses();

  // ── forms declared first so mutations can safely reference them in callbacks ──
  const expForm = useForm<z.infer<typeof expenseSchema>>({ resolver: zodResolver(expenseSchema), defaultValues: { amount: 0, note: "" } });
  const catForm = useForm<z.infer<typeof categorySchema>>({ resolver: zodResolver(categorySchema), defaultValues: { name: "", description: "" } });
  const routineForm = useForm<z.infer<typeof routineSchema>>({ resolver: zodResolver(routineSchema), defaultValues: { frequency: "monthly", isActive: true, amount: 0 } });

  // ── expense mutations ──
  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => { toast({ title: "تم الإضافة", description: "تم تسجيل المصروف بنجاح" }); queryClient.invalidateQueries(); setIsDialogOpen(false); expForm.reset(); },
      onError: () => { toast({ title: "خطأ", description: "فشلت عملية التسجيل", variant: "destructive" }); }
    }
  });

  // ── category mutations ──
  const createCat = useCreateExpenseCategory({ mutation: { onSuccess: () => { toast({ title: "تم الإضافة" }); queryClient.invalidateQueries(); setIsCatDialogOpen(false); catForm.reset(); } } });
  const updateCat = useUpdateExpenseCategory({ mutation: { onSuccess: () => { toast({ title: "تم التعديل" }); queryClient.invalidateQueries(); setIsCatDialogOpen(false); setEditingCatId(null); catForm.reset(); } } });
  const deleteCat = useDeleteExpenseCategory({ mutation: { onSuccess: () => { toast({ title: "تم الحذف" }); queryClient.invalidateQueries(); } } });

  const openEditCat = (cat: { id: number; name: string; description?: string | null }) => {
    setEditingCatId(cat.id);
    catForm.setValue("name", cat.name);
    catForm.setValue("description", cat.description ?? "");
    setIsCatDialogOpen(true);
  };

  const onCatSubmit = (data: z.infer<typeof categorySchema>) => {
    if (editingCatId) updateCat.mutate({ id: editingCatId, data });
    else createCat.mutate({ data });
  };

  // ── routine mutations ──
  const createRoutine = useCreateRoutineExpense({ mutation: { onSuccess: () => { toast({ title: "تم الإضافة" }); queryClient.invalidateQueries(); setIsRoutineDialogOpen(false); routineForm.reset(); } } });
  const updateRoutine = useUpdateRoutineExpense({ mutation: { onSuccess: () => { toast({ title: "تم التعديل" }); queryClient.invalidateQueries(); setIsRoutineDialogOpen(false); setEditingRoutineId(null); routineForm.reset(); } } });
  const deleteRoutine = useDeleteRoutineExpense({ mutation: { onSuccess: () => { toast({ title: "تم الحذف" }); queryClient.invalidateQueries(); } } });

  const openEditRoutine = (r: any) => {
    setEditingRoutineId(r.id);
    routineForm.reset({ categoryId: r.categoryId, title: r.title, amount: r.amount, frequency: r.frequency, branch: r.branch ?? "", note: r.note ?? "", isActive: r.isActive });
    setIsRoutineDialogOpen(true);
  };

  const onRoutineSubmit = (data: z.infer<typeof routineSchema>) => {
    const payload = { ...data, branch: (!data.branch || data.branch === "__all__") ? null : data.branch };
    if (editingRoutineId) updateRoutine.mutate({ id: editingRoutineId, data: payload });
    else createRoutine.mutate({ data: payload });
  };

  const handleFilter = () => setAppliedFilters({ dateFrom, dateTo, categoryId: categoryIdFilter });
  const totalAmount = Array.isArray(expensesList) ? expensesList.reduce((sum, exp) => sum + exp.amount, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">المصروفات</h1>
      </div>

      <Tabs defaultValue="log" className="w-full">
        <TabsList className="mb-6 grid grid-cols-3 max-w-xl">
          <TabsTrigger value="log" className="gap-2"><FileText className="h-4 w-4" /> سجل المصروفات</TabsTrigger>
          <TabsTrigger value="routine" className="gap-2"><RepeatIcon className="h-4 w-4" /> المصروفات الروتينية</TabsTrigger>
          <TabsTrigger value="categories" className="gap-2"><Tag className="h-4 w-4" /> أقسام المصروفات</TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Expense Log ─── */}
        <TabsContent value="log">
          <div className="flex justify-end mb-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-rose-600 hover:bg-rose-700"><Plus className="h-4 w-4" /> إضافة مصروف</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>تسجيل مصروف جديد</DialogTitle></DialogHeader>
                <Form {...expForm}>
                  <form onSubmit={expForm.handleSubmit(data => createExpense.mutate({ data }))} className="space-y-4 mt-2">
                    <FormField control={expForm.control} name="categoryId" render={({ field }) => (
                      <FormItem><FormLabel>فئة المصروف</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر الفئة..." /></SelectTrigger></FormControl>
                          <SelectContent>{Array.isArray(categories) && categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={expForm.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>المبلغ (₪)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={expForm.control} name="vaultId" render={({ field }) => (
                      <FormItem><FormLabel>سحب من خزنة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString()}>
                          <FormControl><SelectTrigger><SelectValue placeholder="اختر الخزنة..." /></SelectTrigger></FormControl>
                          <SelectContent>{vaults?.filter(v => !v.isLocked).map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name} (رصيد: {v.balance})</SelectItem>)}</SelectContent>
                        </Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={expForm.control} name="note" render={({ field }) => (
                      <FormItem><FormLabel>ملاحظات / البيان</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl></FormItem>
                    )} />
                    <div className="flex justify-end pt-4 gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createExpense.isPending} className="bg-rose-600 hover:bg-rose-700">حفظ المصروف</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card className="bg-rose-50 border-rose-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-100 rounded-md"><TrendingDown className="h-5 w-5 text-rose-600" /></div>
                    <h3 className="font-semibold text-rose-900">إجمالي المصروفات</h3>
                  </div>
                  <div className="text-3xl font-bold font-mono tracking-tight text-rose-700 mt-4" dir="ltr">₪ {totalAmount.toLocaleString()}</div>
                  <p className="text-xs text-rose-600/80 mt-2">حسب التصفيات المحددة</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> تصفية</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">الفئة</label>
                    <Select value={categoryIdFilter} onValueChange={setCategoryIdFilter}>
                      <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الفئات</SelectItem>
                        {Array.isArray(categories) && categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleFilter}>تطبيق الفلتر</Button>
                </CardContent>
              </Card>
            </div>
            <div className="md:col-span-3">
              <Card className="h-full">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-secondary/30">
                      <TableRow>
                        <TableHead className="w-[100px]">التاريخ</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>البيان / الملاحظات</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الخزنة</TableHead>
                        <TableHead>بواسطة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {[20, 24, 48, 16, 20, 16].map((w, j) => <TableCell key={j}><Skeleton className={`h-4 w-${w}`} /></TableCell>)}
                        </TableRow>
                      )) : !Array.isArray(expensesList) || expensesList.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />لا يوجد مصروفات مسجلة
                        </TableCell></TableRow>
                      ) : expensesList.map(exp => (
                        <TableRow key={exp.id}>
                          <TableCell className="text-sm">{new Date(exp.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                          <TableCell><Badge variant="secondary">{exp.categoryName}</Badge></TableCell>
                          <TableCell className="max-w-[200px] truncate" title={exp.note || ''}>{exp.note || '-'}</TableCell>
                          <TableCell className="font-bold text-rose-600 font-mono" dir="ltr">₪ {exp.amount}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{exp.vaultName}</TableCell>
                          <TableCell className="text-sm">{exp.performedBy || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── TAB 2: Routine Expenses ─── */}
        <TabsContent value="routine">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>المصروفات الروتينية</CardTitle>
                <CardDescription>المصروفات الثابتة والمتكررة للعيادة (إيجار، رواتب، فواتير...)</CardDescription>
              </div>
              <Dialog open={isRoutineDialogOpen} onOpenChange={open => { setIsRoutineDialogOpen(open); if (!open) { setEditingRoutineId(null); routineForm.reset({ frequency: "monthly", isActive: true, amount: 0 }); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> إضافة مصروف روتيني</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingRoutineId ? "تعديل المصروف الروتيني" : "إضافة مصروف روتيني"}</DialogTitle></DialogHeader>
                  <Form {...routineForm}>
                    <form onSubmit={routineForm.handleSubmit(onRoutineSubmit)} className="space-y-4 pt-2">
                      <FormField control={routineForm.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>العنوان *</FormLabel><FormControl><Input placeholder="مثال: إيجار العيادة" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={routineForm.control} name="categoryId" render={({ field }) => (
                          <FormItem><FormLabel>الفئة</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString()}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                              <SelectContent>{Array.isArray(categories) && categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={routineForm.control} name="frequency" render={({ field }) => (
                          <FormItem><FormLabel>التكرار</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="daily">يومي</SelectItem>
                                <SelectItem value="weekly">أسبوعي</SelectItem>
                                <SelectItem value="monthly">شهري</SelectItem>
                              </SelectContent>
                            </Select></FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={routineForm.control} name="amount" render={({ field }) => (
                          <FormItem><FormLabel>المبلغ (₪)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={routineForm.control} name="branch" render={({ field }) => (
                          <FormItem><FormLabel>الفرع</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || "__all__"}>
                              <FormControl><SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="__all__">جميع الفروع</SelectItem>
                                <SelectItem value="فرع غزة">فرع غزة</SelectItem>
                                <SelectItem value="فرع خان يونس">فرع خان يونس</SelectItem>
                              </SelectContent>
                            </Select></FormItem>
                        )} />
                      </div>
                      <FormField control={routineForm.control} name="note" render={({ field }) => (
                        <FormItem><FormLabel>ملاحظات</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={routineForm.control} name="isActive" render={({ field }) => (
                        <FormItem className="flex items-center gap-3 pt-2">
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          <FormLabel className="!mt-0">نشط</FormLabel>
                        </FormItem>
                      )} />
                      <div className="flex justify-end pt-4 gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsRoutineDialogOpen(false)}>إلغاء</Button>
                        <Button type="submit" disabled={createRoutine.isPending || updateRoutine.isPending}>{editingRoutineId ? "حفظ التعديل" : "إضافة"}</Button>
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
                    <TableHead>العنوان</TableHead>
                    <TableHead>الفئة</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>التكرار</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="w-[80px]">أدوات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routineLoading ? (
                    <TableRow><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ) : !Array.isArray(routineExpenses) || routineExpenses.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <RepeatIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />لا يوجد مصروفات روتينية مضافة
                    </TableCell></TableRow>
                  ) : routineExpenses.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell><Badge variant="outline">{r.categoryName || '-'}</Badge></TableCell>
                      <TableCell className="font-bold text-rose-600 font-mono" dir="ltr">₪ {r.amount}</TableCell>
                      <TableCell>{frequencyLabel[r.frequency as keyof typeof frequencyLabel] || r.frequency}</TableCell>
                      <TableCell className="text-sm">{r.branch || 'الكل'}</TableCell>
                      <TableCell>
                        <Badge variant={r.isActive ? "default" : "secondary"} className={r.isActive ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                          {r.isActive ? "نشط" : "موقوف"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditRoutine(r)}><Edit className="h-3.5 w-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>حذف المصروف الروتيني</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من الحذف؟</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRoutine.mutate({ id: r.id })} className="bg-destructive">حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: Expense Categories ─── */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>أقسام المصروفات</CardTitle>
                <CardDescription>إدارة فئات وتصنيفات المصروفات</CardDescription>
              </div>
              <Dialog open={isCatDialogOpen} onOpenChange={open => { setIsCatDialogOpen(open); if (!open) { setEditingCatId(null); catForm.reset(); } }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> إضافة قسم</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingCatId ? "تعديل القسم" : "إضافة قسم جديد"}</DialogTitle></DialogHeader>
                  <Form {...catForm}>
                    <form onSubmit={catForm.handleSubmit(onCatSubmit)} className="space-y-4 pt-2">
                      <FormField control={catForm.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>اسم القسم *</FormLabel><FormControl><Input placeholder="مثال: رواتب الموظفين" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={catForm.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>الوصف</FormLabel><FormControl><Input placeholder="وصف اختياري للقسم" {...field} /></FormControl></FormItem>
                      )} />
                      <div className="flex justify-end pt-4 gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCatDialogOpen(false)}>إلغاء</Button>
                        <Button type="submit" disabled={createCat.isPending || updateCat.isPending}>{editingCatId ? "حفظ التعديل" : "إضافة القسم"}</Button>
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
                    <TableHead>#</TableHead>
                    <TableHead>اسم القسم</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="w-[80px]">أدوات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catsLoading ? (
                    <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ) : !Array.isArray(categories) || categories.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <Tag className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />لا يوجد أقسام مضافة
                    </TableCell></TableRow>
                  ) : categories.map((cat, i) => (
                    <TableRow key={cat.id}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{cat.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCat(cat)}><Edit className="h-3.5 w-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>حذف قسم المصروفات</AlertDialogTitle><AlertDialogDescription>سيتم حذف القسم "{cat.name}" نهائياً.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteCat.mutate({ id: cat.id })} className="bg-destructive">حذف</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
