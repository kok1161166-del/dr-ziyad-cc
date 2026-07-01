import { useState } from "react";
import { useListVaults, useListVaultTransactions, useCreateVaultTransaction } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet, ArrowDownRight, ArrowUpRight, Lock, Unlock, History, ArrowRightLeft } from "lucide-react";

const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer_in', 'transfer_out']),
  amount: z.coerce.number().min(0.01, "المبلغ يجب أن يكون أكبر من صفر"),
  targetVaultId: z.coerce.number().optional(),
  note: z.string().optional()
});

function VaultDetails({ vaultId, vaultName }: { vaultId: number, vaultName: string }) {
  const { data: transactions, isLoading } = useListVaultTransactions(vaultId);

  const getTransactionTypeBadge = (type: string) => {
    switch(type) {
      case 'deposit': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">إيداع</Badge>;
      case 'withdrawal': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">سحب</Badge>;
      case 'transfer_in': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">تحويل وارد</Badge>;
      case 'transfer_out': return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">تحويل صادر</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold mb-3">سجل حركات الخزنة ({vaultName})</h3>
      <div className="border rounded-md max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="bg-secondary/50 sticky top-0">
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>المستخدم</TableHead>
              <TableHead>ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-4"><Skeleton className="h-8 w-full" /></TableCell></TableRow>
            ) : !Array.isArray(transactions) || transactions.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">لا يوجد حركات مسجلة</TableCell></TableRow>
            ) : (
              transactions.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm" dir="ltr">{new Date(t.createdAt).toLocaleString('ar-EG')}</TableCell>
                  <TableCell>{getTransactionTypeBadge(t.type)}</TableCell>
                  <TableCell className="font-bold font-mono text-sm" dir="ltr">₪ {t.amount}</TableCell>
                  <TableCell className="text-sm">{t.performedBy || '-'}</TableCell>
                  <TableCell className="text-sm">{t.note || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function Vaults() {
  const { data: vaults, isLoading } = useListVaults();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedVaultId, setSelectedVaultId] = useState<number | null>(null);

  const createTransaction = useCreateVaultTransaction({
    mutation: {
      onSuccess: () => {
        toast({ title: "تمت العملية", description: "تم تسجيل الحركة بنجاح" });
        queryClient.invalidateQueries({ queryKey: ['/api/financial/vaults'] });
        form.reset();
      },
      onError: () => {
        toast({ title: "خطأ", description: "فشلت العملية", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "deposit",
      amount: 0,
      note: ""
    }
  });

  const onSubmit = (values: z.infer<typeof transactionSchema>) => {
    if (!selectedVaultId) return;
    createTransaction.mutate({ id: selectedVaultId!, data: values });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">الخزن المالية</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))
        ) : Array.isArray(vaults) && vaults.map(vault => (
          <Card key={vault.id} className="overflow-hidden hover-elevate">
            <div className={`h-1.5 w-full ${vault.balance < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  {vault.name}
                </CardTitle>
                {vault.isLocked ? (
                  <Badge variant="outline" className="text-muted-foreground"><Lock className="h-3 w-3 mr-1" /> مقفلة</Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50"><Unlock className="h-3 w-3 mr-1" /> نشطة</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-2">
                <div className="text-sm text-muted-foreground mb-1">الرصيد الحالي</div>
                <div className={`text-3xl font-bold font-mono tracking-tight ${vault.balance < 0 ? 'text-red-600' : 'text-foreground'}`} dir="ltr">
                  ₪ {vault.balance.toLocaleString()}
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-secondary/30 p-3 flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" className="flex-1 text-xs h-8 bg-primary hover:bg-primary/90" onClick={() => setSelectedVaultId(vault.id)} disabled={vault.isLocked}>
                    <ArrowRightLeft className="h-3 w-3 mr-1 ml-1" />
                    حركة جديدة
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تسجيل حركة في ({vault.name})</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الحركة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="deposit">إيداع</SelectItem>
                              <SelectItem value="withdrawal">سحب</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ (₪)</FormLabel>
                          <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="note" render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات (اختياري)</FormLabel>
                          <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={createTransaction.isPending}>
                          {createTransaction.isPending ? "جاري الحفظ..." : "حفظ الحركة"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex-1 text-xs h-8" onClick={() => setSelectedVaultId(vault.id)}>
                    <History className="h-3 w-3 mr-1 ml-1" />
                    سجل الحركات
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>التفاصيل المالية</DialogTitle>
                  </DialogHeader>
                  {selectedVaultId === vault.id && <VaultDetails vaultId={vault.id} vaultName={vault.name} />}
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}