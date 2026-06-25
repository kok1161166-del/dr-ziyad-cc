import { useState } from "react";
import { 
  useListRoles, useCreateRole, useUpdateRole, 
  useListUsers, useCreateUser, useUpdateUser, useListBranches 
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit, Shield, Users, ShieldAlert, Key } from "lucide-react";

// Permission keys mapping to Arabic
const PERMISSIONS_MAP: Record<string, string> = {
  addPatient: "إضافة مريض",
  editPatient: "تعديل مريض",
  viewPatientFile: "عرض ملف المريض",
  listPatients: "قائمة المرضى",
  deletePatient: "حذف مريض",
  exportPatients: "تصدير المرضى",
  addAppointment: "إضافة حجز",
  viewTodayAppointments: "حجوزات اليوم",
  viewAllAppointments: "جميع الحجوزات",
  editAppointment: "تعديل الحجز",
  monitorAppointments: "مراقبة الحجوزات",
  addExpense: "إضافة مصروف",
  viewExpenses: "عرض المصروفات",
  deleteExpense: "حذف مصروف",
  viewFinancialReports: "التقارير المالية",
  payReceivables: "دفع المستحقات",
  updateDiagnosis: "تحديث التشخيص",
  editMedicalRecord: "تعديل السجل الطبي",
  viewVisitHistory: "تاريخ الزيارات",
  addVitals: "العلامات الحيوية",
  viewAnalytics: "التحليلات",
  manageInventory: "إدارة المخزون",
  manageUsers: "إدارة المستخدمين",
  manageSettings: "الإعدادات العامة"
};

const userSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  username: z.string().min(4, "اسم المستخدم مطلوب"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").optional().or(z.literal("")),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  roleId: z.coerce.number().min(1, "الدور مطلوب"),
  branch: z.string().optional()
});

const defaultPermissions = Object.keys(PERMISSIONS_MAP).reduce((acc, key) => {
  acc[key] = false;
  return acc;
}, {} as Record<string, boolean>);

export default function Roles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: roles, isLoading: rolesLoading } = useListRoles();
  const { data: branches } = useListBranches();

  const createUser = useCreateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إضافة المستخدم بنجاح" });
        queryClient.invalidateQueries();
        setIsUserDialogOpen(false);
        userForm.reset();
      }
    }
  });

  const updateUser = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم التعديل", description: "تم تحديث المستخدم بنجاح" });
        queryClient.invalidateQueries();
        setIsUserDialogOpen(false);
        setEditingUserId(null);
      }
    }
  });

  const createRole = useCreateRole({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحفظ", description: "تم إنشاء الدور بنجاح" });
        queryClient.invalidateQueries();
        setIsRoleDialogOpen(false);
      }
    }
  });

  const userForm = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: { name: "", username: "", password: "", email: "", branch: "غزة" }
  });

  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(defaultPermissions);

  const openEditUser = (user: any) => {
    setEditingUserId(user.id);
    userForm.reset({
      name: user.name,
      username: user.username,
      email: user.email || "",
      roleId: user.roleId,
      branch: user.branch || "",
      password: "" // Keep empty for security
    });
    setIsUserDialogOpen(true);
  };

  const onUserSubmit = (values: z.infer<typeof userSchema>) => {
    if (editingUserId) {
      const updateData: any = { 
        name: values.name, 
        roleId: values.roleId,
        branch: values.branch
      };
      if (values.password) updateData.password = values.password; // Only send if changed
      updateUser.mutate({ id: editingUserId, data: updateData });
    } else {
      if (!values.password) {
        toast({ title: "خطأ", description: "كلمة المرور مطلوبة للمستخدم الجديد", variant: "destructive" });
        return;
      }
      createUser.mutate({ data: values as any });
    }
  };

  const onRoleSubmit = () => {
    if (!roleName) {
      toast({ title: "خطأ", description: "اسم الدور مطلوب", variant: "destructive" });
      return;
    }
    createRole.mutate({ data: { name: roleName, permissions: permissions as any } });
  };

  const handlePermissionChange = (key: string, checked: boolean) => {
    setPermissions(prev => ({ ...prev, [key]: checked }));
  };

  const toggleUserStatus = (user: any) => {
    updateUser.mutate({ id: user.id, data: { isFrozen: !user.isFrozen } });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-primary" /> إدارة الصلاحيات والمستخدمين
        </h1>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 mb-6">
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> المستخدمون</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield className="h-4 w-4" /> الأدوار والصلاحيات</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
              setIsUserDialogOpen(open);
              if (!open) { setEditingUserId(null); userForm.reset(); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> إضافة مستخدم</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUserId ? 'تعديل بيانات مستخدم' : 'تسجيل مستخدم جديد في النظام'}</DialogTitle>
                </DialogHeader>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4 pt-2">
                    <FormField control={userForm.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الكامل *</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={userForm.control} name="username" render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المستخدم (للدخول) *</FormLabel>
                          <FormControl><Input dir="ltr" disabled={!!editingUserId} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={userForm.control} name="password" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{editingUserId ? 'تغيير كلمة المرور (اختياري)' : 'كلمة المرور *'}</FormLabel>
                          <FormControl><Input type="password" dir="ltr" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={userForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>البريد الإلكتروني</FormLabel>
                        <FormControl><Input dir="ltr" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={userForm.control} name="roleId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الدور والصلاحيات *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {roles?.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={userForm.control} name="branch" render={({ field }) => (
                        <FormItem>
                          <FormLabel>الفرع</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {branches?.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsUserDialogOpen(false)}>إلغاء</Button>
                      <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>حفظ المستخدم</Button>
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
                    <TableHead>الاسم</TableHead>
                    <TableHead>اسم المستخدم</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الفرع</TableHead>
                    <TableHead className="text-center">حالة الحساب</TableHead>
                    <TableHead className="text-left">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : !users || users.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">لا يوجد مستخدمين</TableCell></TableRow>
                  ) : (
                    users.map(user => (
                      <TableRow key={user.id} className={user.isFrozen ? "bg-secondary/30 opacity-70" : ""}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{user.username}</TableCell>
                        <TableCell><Badge variant="outline" className="bg-primary/5">{user.roleName}</Badge></TableCell>
                        <TableCell className="text-sm">{user.branch || 'الكل'}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={!user.isFrozen} onCheckedChange={() => toggleUserStatus(user)} />
                          <span className="text-xs ml-2 text-muted-foreground">{user.isFrozen ? 'مجمّد' : 'نشط'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEditUser(user)}><Edit className="h-4 w-4" /></Button>
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

        <TabsContent value="roles" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isRoleDialogOpen} onOpenChange={(open) => {
              setIsRoleDialogOpen(open);
              if (!open) { setRoleName(""); setPermissions(defaultPermissions); }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> دور جديد</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>إضافة دور وصلاحيات</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">اسم الدور *</label>
                    <Input value={roleName} onChange={e => setRoleName(e.target.value)} placeholder="مثال: طبيب، موظف استقبال..." />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3 pb-2 border-b">تحديد الصلاحيات الممنوحة لهذا الدور</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6 bg-secondary/10 p-4 rounded-lg border">
                      {Object.entries(PERMISSIONS_MAP).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox 
                            id={key} 
                            checked={permissions[key]} 
                            onCheckedChange={(checked) => handlePermissionChange(key, checked as boolean)} 
                          />
                          <label htmlFor={key} className="text-sm font-medium leading-none cursor-pointer">
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={onRoleSubmit} disabled={createRole.isPending}>حفظ الدور</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 border rounded-lg overflow-hidden bg-card">
              <div className="bg-secondary/30 p-3 font-medium border-b text-sm">الأدوار المتوفرة</div>
              {rolesLoading ? (
                <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-auto">
                  {roles?.map(role => (
                    <div key={role.id} className="p-3 hover:bg-secondary/20 transition-colors flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{role.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">نظرة عامة على الصلاحيات</CardTitle>
                  <CardDescription>هذا الجدول يوضح الصلاحيات للأدوار الموجودة</CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader className="bg-secondary/20 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[200px]">الصلاحية</TableHead>
                        {roles?.map(r => <TableHead key={r.id} className="text-center">{r.name}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(PERMISSIONS_MAP).map(([key, label]) => (
                        <TableRow key={key}>
                          <TableCell className="text-sm font-medium border-l bg-secondary/5">{label}</TableCell>
                          {roles?.map(role => (
                            <TableCell key={`${role.id}-${key}`} className="text-center">
                              {((role.permissions as any)[key]) ? (
                                <div className="h-2 w-2 rounded-full bg-emerald-500 mx-auto" title="مفعل" />
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-secondary mx-auto opacity-30" />
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}