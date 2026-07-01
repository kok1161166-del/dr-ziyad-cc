import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth/auth-provider";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, refetch } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { mutate: login, isPending } = useLogin({
    mutation: {
      onSuccess: () => {
        refetch();
        setLocation("/");
      },
      onError: (err: any) => {
        setErrorMsg(err?.data?.error || err?.message || "حدث خطأ أثناء تسجيل الدخول");
      }
    }
  });

  if (user) {
    setLocation("/");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!username || !password) {
      setErrorMsg("الرجاء إدخال اسم المستخدم وكلمة المرور");
      return;
    }
    login({ data: { username, password } });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden" dir="rtl">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <ShieldCheck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            نظام إدارة العيادة
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            تسجيل الدخول للوصول إلى لوحة التحكم
          </p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-xl text-center">أهلاً بك مجدداً</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMsg && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm font-semibold">{errorMsg}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="username">اسم المستخدم</Label>
                <div className="relative">
                  <User className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="أدخل اسم المستخدم"
                    className="pl-3 pr-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-primary h-12"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">كلمة المرور</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-primary h-12 text-left text-lg tracking-widest"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    جاري التحقق...
                  </>
                ) : (
                  "دخول"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        <p className="text-center text-xs text-slate-400 mt-8">
          &copy; {new Date().getFullYear()} نظام العيادة الشامل. جميع الحقوق محفوظة.
        </p>
      </motion.div>
    </div>
  );
}
