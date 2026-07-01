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
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Plus, Trash2, User, Phone, FileText, BookUser, MessageSquare, Eye, UserPlus } from "lucide-react";

const phoneOwnerOptions = ["شخصي", "الأب", "الأم", "الزوج/الزوجة", "الابن/الابنة", "أخ/أخت", "أخرى"];
const maritalOptions = ["أعزب/عزباء", "متزوج/متزوجة", "مطلق/مطلقة", "أرمل/أرملة", "غير محدد"];
const insuranceOptions = ["بدون تأمين", "تأمين حكومي", "تأمين وكالة", "تأمين خاص", "تأمين نقابة", "أخرى"];
const referralOptions = ["مباشر", "طبيب آخر", "صيدلية", "مستشفى", "مختبر", "أخرى"];
const sourceOptions = ["زيارة سابقة", "فيسبوك", "انستغرام", "جوجل", "صديق/قريب", "إعلان", "أخرى"];

const governorateList = ["غزة", "شمال غزة", "الوسطى", "خانيونس", "رفح", "القدس", "الضفة الغربية", "أخرى"];
const governorateCities: Record<string, string[]> = {
  "غزة": ["مدينة غزة"],
  "شمال غزة": ["جباليا", "بيت لاهيا", "بيت حانون"],
  "الوسطى": ["دير البلح", "النصيرات", "البريج", "المغازي", "الزوايدة"],
  "خانيونس": ["مدينة خانيونس", "القرارة", "بني سهيلا", "عبسان", "خزاعة"],
  "رفح": ["مدينة رفح", "تل السلطان", "الشابورة"],
  "القدس": ["القدس الشرقية", "ضواحي القدس"],
  "الضفة الغربية": ["رام الله", "نابلس", "الخليل", "بيت لحم", "جنين", "طولكرم", "قلقيلية", "أريحا"],
};
const gazaNeighborhoods = ["الرمال", "تل الهوا", "الشيخ رضوان", "النصر", "الشجاعية", "الزيتون", "الدرج", "التفاح", "الشيخ عجلين", "الصبرة"];

const patientSchema = z.object({
  localCode: z.coerce.number().optional(),
  nameAr: z.string().min(2, "الاسم مطلوب"),
  nameEn: z.string().optional(),
  gender: z.enum(["male", "female"]),
  dateOfBirth: z.string().optional(),
  idNumber: z.string().optional(),
  phones: z.array(z.object({
    number: z.string().min(5, "رقم الهاتف مطلوب"),
    owner: z.string().optional()
  })).optional(),
  homePhone: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  address: z.string().optional(),
  governorate: z.string().optional(),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  birthPlace: z.string().optional(),
  occupation: z.string().optional(),
  email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  insuranceStatus: z.string().optional(),
  referredBy: z.string().optional(),
  source: z.string().optional(),
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
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/patients")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">تسجيل مريض جديد</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    بيانات المريض
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-5">
                    {/* Basic Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        المعلومات الأساسية
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="localCode" render={({ field }) => (
                          <FormItem><FormLabel>كود المريض</FormLabel><FormControl><Input type="number" {...field} value={field.value || ""} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="hidden md:block"></div>
                        <FormField control={form.control} name="nameAr" render={({ field }) => (
                          <FormItem><FormLabel>الاسم (عربي) *</FormLabel><FormControl><Input {...field} placeholder="الاسم ثلاثي" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="nameEn" render={({ field }) => (
                          <FormItem><FormLabel>الاسم (إنجليزي)</FormLabel><FormControl><Input {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="gender" render={({ field }) => (
                          <FormItem>
                            <FormLabel>الجنس *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="female">أنثى</SelectItem>
                                <SelectItem value="male">ذكر</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                          <FormItem><FormLabel>تاريخ الميلاد</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="idNumber" render={({ field }) => (
                          <FormItem><FormLabel>رقم الهوية / الإقامة</FormLabel><FormControl><Input dir="ltr" {...field} placeholder="رقم الهوية" /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator />

                    {/* Contact Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        معلومات الاتصال
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="phones.0.number" render={({ field }) => (
                          <FormItem><FormLabel>رقم الهاتف *</FormLabel><FormControl><Input placeholder="059XXXXXXXX" dir="ltr" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="phones.0.owner" render={({ field }) => (
                          <FormItem>
                            <FormLabel>المالك (صاحب الرقم)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {phoneOwnerOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="homePhone" render={({ field }) => (
                          <FormItem><FormLabel>هاتف المنزل</FormLabel><FormControl><Input dir="ltr" placeholder="08XXXXXXXX" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="email" render={({ field }) => (
                          <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input dir="ltr" placeholder="email@example.com" {...field} /></FormControl><FormMessage/></FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator />

                    {/* Address */}
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        العنوان
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="governorate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>المحافظة</FormLabel>
                            <Select onValueChange={(val) => { field.onChange(val); form.setValue("city", ""); form.setValue("neighborhood", ""); }} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر المحافظة..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {governorateList.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="city" render={({ field }) => (
                          <FormItem>
                            <FormLabel>المدينة / المنطقة</FormLabel>
                            <Select disabled={!form.watch("governorate")} onValueChange={(val) => { field.onChange(val); form.setValue("neighborhood", ""); }} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder={form.watch("governorate") ? "اختر المدينة..." : "اختر المحافظة أولاً"} /></SelectTrigger></FormControl>
                              <SelectContent>
                                {(form.watch("governorate") ? governorateCities[form.watch("governorate") as string] || [] : []).map(c => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        {form.watch("governorate") === "غزة" && form.watch("city") === "مدينة غزة" && (
                          <FormField control={form.control} name="neighborhood" render={({ field }) => (
                            <FormItem>
                              <FormLabel>الحي</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="اختر الحي..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {gazaNeighborhoods.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )} />
                        )}
                        <FormField control={form.control} name="address" render={({ field }) => (
                          <FormItem className={form.watch("governorate") === "غزة" && form.watch("city") === "مدينة غزة" ? "" : "md:col-span-2"}>
                            <FormLabel>العنوان التفصيلي</FormLabel>
                            <FormControl><Input {...field} placeholder="الشارع، رقم المبنى، طابق" /></FormControl>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator />

                    {/* Additional Info */}
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <BookUser className="h-4 w-4" />
                        معلومات إضافية
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                          <FormItem>
                            <FormLabel>الحالة الاجتماعية</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {maritalOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="nationality" render={({ field }) => (
                          <FormItem><FormLabel>الجنسية</FormLabel><FormControl><Input {...field} placeholder="فلسطيني" /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="occupation" render={({ field }) => (
                          <FormItem><FormLabel>المهنة</FormLabel><FormControl><Input {...field} placeholder="المهنة" /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="insuranceStatus" render={({ field }) => (
                          <FormItem>
                            <FormLabel>حالة التأمين</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {insuranceOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="referredBy" render={({ field }) => (
                          <FormItem>
                            <FormLabel>مصدر الإحالة</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر مصدر الإحالة..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="none">بدون إحالة (زيارة مباشرة)</SelectItem>
                                {Array.isArray(providersData) && providersData.map(p => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="source" render={({ field }) => (
                          <FormItem>
                            <FormLabel>كيف عرفت عنا؟</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                {sourceOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )} />
                      </div>
                    </div>

                    <Separator />

                    {/* Notes */}
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        ملاحظات عامة
                      </h3>
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormControl><Textarea className="resize-none min-h-[80px]" placeholder="أي ملاحظات عامة عن المريض..." {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-3">
                    <Button variant="outline" type="button" onClick={() => setLocation("/patients")}>إلغاء</Button>
                    <Button type="submit" disabled={createPatient.isPending} className="bg-gradient-to-r from-blue-600 to-blue-700">
                      {createPatient.isPending ? "جاري الحفظ..." : "حفظ بيانات المريض"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Preview Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-rose-500" />
                    معاينة البطاقة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-xl border bg-gradient-to-b from-blue-600/5 to-rose-600/5 p-5 text-center">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-rose-500 mx-auto mb-3 flex items-center justify-center shadow-lg">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold text-lg">{form.watch("nameAr") || "اسم المريض"}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {form.watch("localCode") ? `كود: ${form.watch("localCode")}` : "كود المريض"}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between p-2 bg-white rounded border">
                        <span className="text-muted-foreground">رقم الهاتف</span>
                        <span className="font-medium">{form.watch("phones")?.[0]?.number || "---"}</span>
                      </div>
                      <div className="flex justify-between p-2 bg-white rounded border">
                        <span className="text-muted-foreground">العنوان</span>
                        <span className="font-medium">
                          {[form.watch("governorate"), form.watch("city")].filter(Boolean).join(" - ") || "---"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
