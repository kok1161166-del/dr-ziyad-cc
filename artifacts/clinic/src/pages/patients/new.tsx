import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useGetNextPatientCode, 
  useCreatePatient, 
  useListReferralProviders 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

const patientSchema = z.object({
  localCode: z.coerce.number().optional(),
  nameAr: z.string().min(2, "الاسم مطلوب"),
  nameEn: z.string().optional(),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.string().optional(),
  phones: z.array(z.object({
    number: z.string().min(5, "رقم الهاتف مطلوب"),
    owner: z.string().optional()
  })).optional(),
  homePhone: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  governorate: z.string().optional(),
  birthPlace: z.string().optional(),
  occupation: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  insuranceStatus: z.string().optional(),
  referredBy: z.string().optional(),
  notes: z.string().optional()
});

export default function NewPatient() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: codeData } = useGetNextPatientCode();
  const { data: providersData } = useListReferralProviders();
  
  const createPatient = useCreatePatient({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم بنجاح", description: "تم تسجيل المريض بنجاح" });
        queryClient.invalidateQueries();
        setLocation("/patients");
      },
      onError: () => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء التسجيل", variant: "destructive" });
      }
    }
  });

  const form = useForm<z.infer<typeof patientSchema>>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      gender: "male",
      phones: [{ number: "", owner: "" }],
      nameAr: "",
      nameEn: "",
      dateOfBirth: "",
      homePhone: "",
      maritalStatus: "",
      nationality: "",
      address: "",
      governorate: "",
      birthPlace: "",
      occupation: "",
      email: "",
      insuranceStatus: "",
      referredBy: "",
      notes: ""
    }
  });

  // Set default code when loaded
  if (codeData?.nextCode && !form.getValues("localCode")) {
    form.setValue("localCode", codeData.nextCode);
  }

  const onSubmit = (values: z.infer<typeof patientSchema>) => {
    // Filter empty phones
    const filteredPhones = values.phones?.filter(p => p.number.trim() !== "");
    createPatient.mutate({ data: { ...values, phones: filteredPhones } });
  };

  const addPhone = () => {
    const current = form.getValues("phones") || [];
    form.setValue("phones", [...current, { number: "", owner: "" }]);
  };

  const removePhone = (index: number) => {
    const current = form.getValues("phones") || [];
    form.setValue("phones", current.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/patients")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">تسجيل مريض جديد</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="localCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كود المريض</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.valueAsNumber)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="hidden md:block"></div>

              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم (عربي) *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم (إنجليزي)</FormLabel>
                    <FormControl>
                      <Input {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>الجنس *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="male" id="r1" />
                          <FormLabel htmlFor="r1" className="font-normal cursor-pointer">ذكر</FormLabel>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="female" id="r2" />
                          <FormLabel htmlFor="r2" className="font-normal cursor-pointer">أنثى</FormLabel>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الميلاد</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>معلومات الاتصال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <FormLabel className="mb-4 block">أرقام الهواتف</FormLabel>
                <div className="space-y-3">
                  {(form.watch("phones") || []).map((_, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <FormField
                        control={form.control}
                        name={`phones.${index}.number`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="رقم الهاتف" dir="ltr" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`phones.${index}.owner`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="المالك (مثال: الأب، الأم)" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addPhone} className="gap-2 mt-2">
                    <Plus className="h-4 w-4" /> إضافة رقم آخر
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="homePhone" render={({ field }) => (
                  <FormItem><FormLabel>هاتف المنزل</FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input dir="ltr" {...field} /></FormControl><FormMessage/></FormItem>
                )} />
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>العنوان التفصيلي</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="governorate" render={({ field }) => (
                  <FormItem><FormLabel>المحافظة / المدينة</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة الاجتماعية</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="single">أعزب/عزباء</SelectItem>
                      <SelectItem value="married">متزوج/متزوجة</SelectItem>
                      <SelectItem value="divorced">مطلق/مطلقة</SelectItem>
                      <SelectItem value="widowed">أرمل/أرملة</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="nationality" render={({ field }) => (
                <FormItem><FormLabel>الجنسية</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="occupation" render={({ field }) => (
                <FormItem><FormLabel>المهنة</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="insuranceStatus" render={({ field }) => (
                <FormItem><FormLabel>حالة التأمين</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="referredBy" render={({ field }) => (
                <FormItem>
                  <FormLabel>مصدر الإحالة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="اختر مصدر الإحالة..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">بدون إحالة (زيارة مباشرة)</SelectItem>
                      {providersData?.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem className="md:col-span-2"><FormLabel>ملاحظات عامة</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl></FormItem>
              )} />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation("/patients")}>إلغاء</Button>
            <Button type="submit" disabled={createPatient.isPending}>
              {createPatient.isPending ? "جاري الحفظ..." : "حفظ بيانات المريض"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
