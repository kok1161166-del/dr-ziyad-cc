import { useState } from "react";
import { useListExpenses, useCreateExpense, useListExpenseCategories, useListVaults } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, TrendingDown, Filter, FileText } from "lucide-react";

const expenseSchema = z.object({
  categoryId: z.coerce.number().min(1, "اختر الفئة"),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر"),
  vaultId: z.coerce.number().min(1, "اختر الخزنة للصرف منها"),
  note: z.string().optional()
});

export default function Expenses() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>("all");
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: "", dateTo: "", categoryId: "" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: expensesList, isLoading } = useListExpenses({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined,
    categoryId: appliedFilters.categoryId && appliedFilters.categoryId !== "all" ? parseInt(appliedFilters.categoryId) : undefined
  });

  const { data: categories } = useListExpenseCategories();
  const { data: vaults } = useListVaults();

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الإضافة", description: "تم تسجيل المصروف بنجاح" });
        queryClient.invalidateQueries();
        setIsDialogOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "خطأ", description: "فشلت عملية التسجيل", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      note: ""
    }
  });

  const handleFilter = () => {
    setAppliedFilters({ dateFrom, dateTo, categoryId: categoryIdFilter });
  };

  const totalAmount = expensesList?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">المصروفات</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-rose-600 hover:bg-rose-700">
              <Plus className="h-4 w-4" /> إضافة مصروف
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تسجيل مصروف جديد</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => createExpense.mutate({ data }))} className="space-y-4 mt-2">
                <FormField control={form.control} name="categoryId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>فئة المصروف</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر الفئة..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ (₪)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="vaultId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>سحب من خزنة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر الخزنة..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {vaults?.filter(v => !v.isLocked).map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name} (رصيد: {v.balance})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="note" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات / البيان</FormLabel>
                    <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                  </FormItem>
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
              <div className="text-3xl font-bold font-mono tracking-tight text-rose-700 mt-4" dir="ltr">
                ₪ {totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-rose-600/80 mt-2">حسب التصفيات المحددة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> تصفية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الفئة</label>
                <Select value={categoryIdFilter} onValueChange={setCategoryIdFilter}>
                  <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
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
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : !expensesList || expensesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                        لا يوجد مصروفات مسجلة
                      </TableCell>
                    </TableRow>
                  ) : (
                    expensesList.map(exp => (
                      <TableRow key={exp.id}>
                        <TableCell className="text-sm">{new Date(exp.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                        <TableCell><Badge variant="secondary">{exp.categoryName}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate" title={exp.note || ''}>{exp.note || '-'}</TableCell>
                        <TableCell className="font-bold text-rose-600 font-mono" dir="ltr">₪ {exp.amount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{exp.vaultName}</TableCell>
                        <TableCell className="text-sm">{exp.performedBy || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}