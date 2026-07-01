import { useState } from "react";
import { 
  useListPrescriptionTemplates, useCreatePrescriptionTemplate, 
  useUpdatePrescriptionTemplate, useDeletePrescriptionTemplate,
  useListInvestigationTemplates, useCreateInvestigationTemplate 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Trash2, FileText, Pill, Microscope, Search, X } from "lucide-react";

const rxSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  content: z.string().min(5, "محتوى الوصفة مطلوب"),
  category: z.string().optional()
});

const invSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  type: z.enum(['labs', 'imaging', 'endoscopy', 'pathology']),
  testInput: z.string().optional() // Temporary field for inputting tags
});

export default function Templates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRxDialogOpen, setIsRxDialogOpen] = useState(false);
  const [isInvDialogOpen, setIsInvDialogOpen] = useState(false);
  const [editingRxId, setEditingRxId] = useState<number | null>(null);
  const [rxSearch, setRxSearch] = useState("");
  const [invTests, setInvTests] = useState<string[]>([]);

  const { data: rxTemplates, isLoading: rxLoading } = useListPrescriptionTemplates();
  const { data: invTemplates, isLoading: invLoading } = useListInvestigationTemplates();

  const createRx = useCreatePrescriptionTemplate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إضافة قالب الوصفة بنجاح" });
        queryClient.invalidateQueries();
        setIsRxDialogOpen(false);
        rxForm.reset();
      }
    }
  });

  const updateRx = useUpdatePrescriptionTemplate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم التعديل", description: "تم تحديث القالب بنجاح" });
        queryClient.invalidateQueries();
        setIsRxDialogOpen(false);
        setEditingRxId(null);
      }
    }
  });

  const deleteRx = useDeletePrescriptionTemplate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم حذف قالب الوصفة بنجاح" });
        queryClient.invalidateQueries();
      }
    }
  });

  const createInv = useCreateInvestigationTemplate({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إضافة قالب الطلبات بنجاح" });
        queryClient.invalidateQueries();
        setIsInvDialogOpen(false);
        invForm.reset();
        setInvTests([]);
      }
    }
  });

  const rxForm = useForm<z.infer<typeof rxSchema>>({
    resolver: zodResolver(rxSchema),
    defaultValues: { name: "", content: "", category: "" }
  });

  const invForm = useForm<z.infer<typeof invSchema>>({
    resolver: zodResolver(invSchema),
    defaultValues: { name: "", type: "labs", testInput: "" }
  });

  const openEditRx = (rx: any) => {
    setEditingRxId(rx.id);
    rxForm.reset({ name: rx.name, content: rx.content, category: rx.category || "" });
    setIsRxDialogOpen(true);
  };

  const onRxSubmit = (values: z.infer<typeof rxSchema>) => {
    if (editingRxId) {
      updateRx.mutate({ id: editingRxId, data: values });
    } else {
      createRx.mutate({ data: values });
    }
  };

  const onInvSubmit = (values: z.infer<typeof invSchema>) => {
    if (invTests.length === 0) {
      toast({ title: "خطأ", description: "يجب إضافة فحص واحد على الأقل", variant: "destructive" });
      return;
    }
    createInv.mutate({ data: { name: values.name, type: values.type, tests: invTests } });
  };

  const addTest = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = invForm.getValues("testInput")?.trim();
      if (val && !invTests.includes(val)) {
        setInvTests([...invTests, val]);
        invForm.setValue("testInput", "");
      }
    }
  };

  const removeTest = (test: string) => {
    setInvTests(invTests.filter(t => t !== test));
  };

  const rxList = Array.isArray(rxTemplates) ? rxTemplates : [];
  const filteredRx = rxList.filter(t => t.name.includes(rxSearch) || t.content.includes(rxSearch));

  const getInvTypeBadge = (type: string) => {
    switch(type) {
      case 'labs': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">مخبرية (Labs)</Badge>;
      case 'imaging': return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">تصوير (Imaging)</Badge>;
      case 'endoscopy': return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">مناظير (Endoscopy)</Badge>;
      case 'pathology': return <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">أنسجة (Pathology)</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> القوالب الطبية
        </h1>
      </div>

      <Tabs defaultValue="rx" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
          <TabsTrigger value="rx" className="gap-2"><Pill className="h-4 w-4" /> وصفات طبية جاهزة</TabsTrigger>
          <TabsTrigger value="inv" className="gap-2"><Microscope className="h-4 w-4" /> طلبات تحاليل ومخبرية</TabsTrigger>
        </TabsList>

        <TabsContent value="rx" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث في القوالب..." value={rxSearch} onChange={e => setRxSearch(e.target.value)} className="pr-9" />
            </div>
            
            <Dialog open={isRxDialogOpen} onOpenChange={(open) => {
              setIsRxDialogOpen(open);
              if (!open) { setEditingRxId(null); rxForm.reset(); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> قالب وصفة جديد</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRxId ? 'تعديل قالب الوصفة' : 'إضافة قالب وصفة جديد'}</DialogTitle>
                </DialogHeader>
                <Form {...rxForm}>
                  <form onSubmit={rxForm.handleSubmit(onRxSubmit)} className="space-y-4 pt-2">
                    <FormField control={rxForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم القالب (عنوان) *</FormLabel>
                        <FormControl><Input placeholder="مثال: بروتوكول علاج التهاب اللوزتين" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={rxForm.control} name="category" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الفئة / التخصص (اختياري)</FormLabel>
                        <FormControl><Input placeholder="مثال: أطفال، باطنة..." {...field} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={rxForm.control} name="content" render={({ field }) => (
                      <FormItem>
                        <FormLabel>محتوى الوصفة الطبية (الأدوية والجرعات) *</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-[150px] resize-none leading-relaxed" 
                            dir="ltr"
                            placeholder="Amoxicillin 500mg - 1x3 for 7 days&#10;Paracetamol 500mg - PRN" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsRxDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createRx.isPending || updateRx.isPending}>حفظ القالب</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rxLoading ? (
               Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-32" /></CardContent></Card>)
            ) : filteredRx.length === 0 ? (
              <div className="col-span-full p-12 text-center text-muted-foreground border rounded-lg bg-secondary/20">
                <Pill className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                لا يوجد قوالب وصفات طبية
              </div>
            ) : (
              filteredRx.map(rx => (
                <Card key={rx.id} className="flex flex-col hover-elevate overflow-hidden border-t-2 border-t-primary">
                  <CardHeader className="pb-2 flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base leading-tight mb-1">{rx.name}</CardTitle>
                      {rx.category && <span className="text-xs text-muted-foreground">{rx.category}</span>}
                    </div>
                    <div className="flex gap-1 -mt-1 -mr-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" onClick={() => openEditRx(rx)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف القالب</AlertDialogTitle>
                            <AlertDialogDescription>هل أنت متأكد من حذف قالب "{rx.name}"؟</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex gap-2">
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRx.mutate({ id: rx.id })} className="bg-red-600 hover:bg-red-700">نعم، احذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="bg-secondary/30 p-3 rounded-md text-sm font-mono whitespace-pre-wrap leading-relaxed h-full" dir="ltr">
                      {rx.content}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="inv" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Dialog open={isInvDialogOpen} onOpenChange={(open) => {
              setIsInvDialogOpen(open);
              if (!open) { invForm.reset(); setInvTests([]); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> مجموعة طلبات جديدة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة مجموعة تحاليل/تصوير</DialogTitle>
                </DialogHeader>
                <Form {...invForm}>
                  <form onSubmit={invForm.handleSubmit(onInvSubmit)} className="space-y-4 pt-2">
                    <FormField control={invForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم القائمة (مثال: فحوصات ما قبل العملية) *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={invForm.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>النوع</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="labs">فحوصات مخبرية (Labs)</SelectItem>
                            <SelectItem value="imaging">تصوير طبي (Imaging)</SelectItem>
                            <SelectItem value="endoscopy">مناظير (Endoscopy)</SelectItem>
                            <SelectItem value="pathology">أنسجة وعينات (Pathology)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    
                    <div>
                      <FormField control={invForm.control} name="testInput" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الفحوصات المطلوبة</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="اكتب اسم الفحص واضغط Enter للإضافة..." 
                              dir="ltr" 
                              {...field} 
                              onKeyDown={addTest} 
                            />
                          </FormControl>
                        </FormItem>
                      )} />
                      
                      <div className="flex flex-wrap gap-2 mt-3 p-3 border rounded-md min-h-[80px] bg-secondary/10">
                        {invTests.length === 0 && <span className="text-sm text-muted-foreground my-auto">لم يتم إضافة فحوصات بعد</span>}
                        {invTests.map((test, i) => (
                          <Badge key={i} variant="secondary" className="px-2 py-1 gap-1 text-sm font-mono" dir="ltr">
                            {test}
                            <button type="button" onClick={() => removeTest(test)} className="text-muted-foreground hover:text-red-500 rounded-full ml-1 focus:outline-none">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsInvDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createInv.isPending}>حفظ القائمة</Button>
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
                    <TableHead className="w-1/4">اسم القائمة</TableHead>
                    <TableHead className="w-[150px]">النوع</TableHead>
                    <TableHead>الفحوصات المشمولة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : !Array.isArray(invTemplates) || invTemplates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">لا يوجد قوالب طلبات</TableCell>
                    </TableRow>
                  ) : (
                    invTemplates.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium text-base">{inv.name}</TableCell>
                        <TableCell>{getInvTypeBadge(inv.type)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5 py-1">
                            {inv.tests.map((test, i) => (
                              <Badge key={i} variant="outline" className="font-mono text-xs font-normal" dir="ltr">{test}</Badge>
                            ))}
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
      </Tabs>
    </div>
  );
}