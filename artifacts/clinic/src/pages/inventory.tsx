import { useState } from "react";
import { 
  useListInventoryItems, useCreateInventoryItem, 
  useInventoryTransaction, useListSupplierDebts 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Package, AlertTriangle, ArrowRightLeft, Clock, Factory } from "lucide-react";

const itemSchema = z.object({
  barcode: z.string().optional(),
  branch: z.string().min(1, "الفرع مطلوب"),
  name: z.string().min(2, "الاسم مطلوب"),
  categoryId: z.coerce.number().optional().nullable(),
  quantity: z.coerce.number().min(0, "الكمية لا يمكن أن تكون سالبة"),
  unit: z.string().min(1, "الوحدة مطلوبة (مثل: علبة، حبة)"),
  lowStockThreshold: z.coerce.number().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  supplierName: z.string().optional(),
  supplierContact: z.string().optional(),
  supplierAddress: z.string().optional(),
  notifyLowStock: z.boolean().default(true),
  notifyExpiry: z.boolean().default(true)
});

const txSchema = z.object({
  type: z.enum(['add', 'withdraw']),
  quantity: z.coerce.number().min(0.01, "الكمية يجب أن تكون أكبر من 0"),
  note: z.string().optional(),
  cost: z.coerce.number().optional().nullable()
});

export default function Inventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const { data: items, isLoading: itemsLoading } = useListInventoryItems({});
  const { data: debts, isLoading: debtsLoading } = useListSupplierDebts();

  const createItem = useCreateInventoryItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إضافة المادة للمخزون بنجاح" });
        queryClient.invalidateQueries();
        setIsItemDialogOpen(false);
        itemForm.reset();
      }
    }
  });

  const processTransaction = useInventoryTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "تمت العملية", description: "تم تسجيل حركة المخزون بنجاح" });
        queryClient.invalidateQueries();
        setSelectedItemId(null);
        txForm.reset();
      },
      onError: (err: any) => {
        toast({ title: "خطأ", description: err.message || "فشلت الحركة", variant: "destructive" });
      }
    }
  });

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      branch: "غزة",
      unit: "حبة",
      quantity: 0,
      notifyLowStock: true,
      notifyExpiry: true
    }
  });

  const txForm = useForm<z.infer<typeof txSchema>>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      type: "withdraw",
      quantity: 1
    }
  });

  const onItemSubmit = (values: z.infer<typeof itemSchema>) => {
    createItem.mutate({ data: values });
  };

  const onTxSubmit = (values: z.infer<typeof txSchema>) => {
    if (!selectedItemId) return;
    processTransaction.mutate({ id: selectedItemId!, data: values });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" /> إدارة المخزون
        </h1>
      </div>

      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
          <TabsTrigger value="inventory">المخزون</TabsTrigger>
          <TabsTrigger value="debts">ديون الموردين</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> إضافة مادة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>إضافة مادة للمخزون</DialogTitle>
                </DialogHeader>
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={itemForm.control} name="name" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>اسم المادة *</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={itemForm.control} name="branch" render={({ field }) => (
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

                      <FormField control={itemForm.control} name="barcode" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الباركود (اختياري)</FormLabel>
                          <FormControl><Input dir="ltr" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={itemForm.control} name="quantity" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الكمية الافتتاحية *</FormLabel>
                          <FormControl><Input type="number" step="any" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={itemForm.control} name="unit" render={({ field }) => (
                        <FormItem>
                          <FormLabel>وحدة القياس *</FormLabel>
                          <FormControl><Input placeholder="علبة، حبة، مل، لتر" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={itemForm.control} name="lowStockThreshold" render={({ field }) => (
                        <FormItem>
                          <FormLabel>حد النقصان (تنبيه) *</FormLabel>
                          <FormControl><Input type="number" step="any" {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={itemForm.control} name="expiryDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الانتهاء</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <Card className="border-secondary">
                      <CardHeader className="py-3 px-4 bg-secondary/20"><CardTitle className="text-sm font-medium">معلومات المورد</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 pb-4">
                        <FormField control={itemForm.control} name="supplierName" render={({ field }) => (
                          <FormItem><FormLabel>اسم المورد</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={itemForm.control} name="supplierContact" render={({ field }) => (
                          <FormItem><FormLabel>هاتف المورد</FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                        )} />
                      </CardContent>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-6 p-4 bg-secondary/30 rounded-lg border">
                      <FormField control={itemForm.control} name="notifyLowStock" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg gap-4 flex-1">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">تنبيه عند النقصان</FormLabel>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={itemForm.control} name="notifyExpiry" render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg gap-4 flex-1">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm">تنبيه قبل انتهاء الصلاحية</FormLabel>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createItem.isPending}>
                        {createItem.isPending ? "جاري الحفظ..." : "حفظ المادة"}
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
                    <TableHead>المادة</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead>الوحدة</TableHead>
                    <TableHead>الصلاحية</TableHead>
                    <TableHead>المورد</TableHead>
                    <TableHead className="text-left">حركة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : !items || items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">لا يوجد مواد في المخزون</TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => {
                      const isLowStock = item.notifyLowStock && item.lowStockThreshold && item.quantity <= item.lowStockThreshold;
                      const isExpired = item.notifyExpiry && item.expiryDate && new Date(item.expiryDate) < new Date();
                      
                      return (
                        <TableRow key={item.id} className={isExpired ? "bg-red-50/50" : ""}>
                          <TableCell>
                            <div className="font-medium text-primary-foreground/90">{item.name}</div>
                            {item.barcode && <div className="text-xs text-muted-foreground font-mono mt-1">{item.barcode}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{item.branch}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-mono font-bold text-lg ${isLowStock ? 'text-red-600' : ''}`}>
                              {item.quantity}
                            </span>
                            {isLowStock && <AlertTriangle className="h-4 w-4 text-red-500 inline ml-1" />}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.unit}</TableCell>
                          <TableCell>
                            {item.expiryDate ? (
                              <div className={`flex items-center gap-1.5 text-sm ${isExpired ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                <Clock className="h-3 w-3" /> 
                                {new Date(item.expiryDate).toLocaleDateString('ar-EG')}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-sm">{item.supplierName || '-'}</TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Dialog open={selectedItemId === item.id} onOpenChange={(open) => !open && setSelectedItemId(null)}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8" onClick={() => setSelectedItemId(item.id)}>
                                    <ArrowRightLeft className="h-3 w-3 mr-1.5" /> حركة مخزون
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>حركة مخزون: {item.name}</DialogTitle>
                                    <DialogDescription>الكمية الحالية: {item.quantity} {item.unit}</DialogDescription>
                                  </DialogHeader>
                                  <Form {...txForm}>
                                    <form onSubmit={txForm.handleSubmit(onTxSubmit)} className="space-y-4 pt-2">
                                      <FormField control={txForm.control} name="type" render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>نوع الحركة</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                              <SelectItem value="add">إضافة (توريد)</SelectItem>
                                              <SelectItem value="withdraw">سحب (استهلاك)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </FormItem>
                                      )} />
                                      <FormField control={txForm.control} name="quantity" render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>الكمية ({item.unit})</FormLabel>
                                          <FormControl><Input type="number" step="any" {...field} /></FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )} />
                                      {txForm.watch("type") === 'add' && (
                                        <FormField control={txForm.control} name="cost" render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>التكلفة الإجمالية لهذه الكمية (₪)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} /></FormControl>
                                            <FormDescription>ستسجل كدين للمورد إذا لم يتم دفعها فوراً</FormDescription>
                                          </FormItem>
                                        )} />
                                      )}
                                      <FormField control={txForm.control} name="note" render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>ملاحظات</FormLabel>
                                          <FormControl><Input {...field} /></FormControl>
                                        </FormItem>
                                      )} />
                                      <div className="flex justify-end pt-4">
                                        <Button type="submit" disabled={processTransaction.isPending}>تأكيد الحركة</Button>
                                      </div>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Factory className="h-5 w-5 text-primary" /> كشف ديون الموردين
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>المورد</TableHead>
                    <TableHead>المادة / الصنف</TableHead>
                    <TableHead>المبلغ المستحق</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>تاريخ التسجيل</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : !debts || debts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">لا يوجد ديون للموردين</TableCell>
                    </TableRow>
                  ) : (
                    debts.map(debt => (
                      <TableRow key={debt.id} className={!debt.isPaid && (!debt.dueDate || new Date(debt.dueDate) < new Date()) ? "bg-amber-50/30" : ""}>
                        <TableCell className="font-medium">{debt.supplierName}</TableCell>
                        <TableCell className="text-sm">{debt.itemName}</TableCell>
                        <TableCell className="font-mono font-bold text-amber-600" dir="ltr">₪ {debt.amount}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('ar-EG') : 'غير محدد'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(debt.createdAt).toLocaleDateString('ar-EG')}</TableCell>
                        <TableCell className="text-center">
                          {debt.isPaid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">مسدد</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">غير مسدد</Badge>
                          )}
                        </TableCell>
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
  );
}