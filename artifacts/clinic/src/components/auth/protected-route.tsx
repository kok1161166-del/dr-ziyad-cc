import { useLocation } from "wouter";
import { useAuth } from "./auth-provider";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredPermission?: string;
};

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If a specific permission is required, check it
  if (requiredPermission) {
    const permissions = user.permissions as Record<string, boolean>;
    if (!permissions || !permissions[requiredPermission]) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
          <h2 className="text-2xl font-bold text-red-600 mb-2">عفواً، لا تملك الصلاحية</h2>
          <p className="text-gray-600 mb-4">هذه الصفحة مخصصة للإدارة أو تحتاج لصلاحيات إضافية.</p>
          <button 
            onClick={() => setLocation("/")}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            العودة للرئيسية
          </button>
        </div>
      );
    }
  }

  return <>{children}</>;
}
