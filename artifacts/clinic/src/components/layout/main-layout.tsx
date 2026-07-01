import { Link, useLocation, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  DollarSign,
  Stethoscope,
  Package,
  BarChart2,
  FileText,
  Shield,
  Settings,
  Menu,
  Bell,
  ChevronDown,
  UserCog,
  ClipboardList,
  MessageSquare,
  RefreshCw,
  Clock,
  LogIn,
  UserCheck,
  History,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  subItems?: { title: string; href: string; permission?: string }[];
  permission?: string;
}

const navItems: NavItem[] = [
  { title: "لوحة التحكم", href: "/", icon: LayoutDashboard, permission: "dashboard.view" },
  { 
    title: "المرضى", 
    href: "/patients", 
    icon: Users,
    permission: "patients.view",
    subItems: [
      { title: "قائمة المرضى", href: "/patients", permission: "patients.view" },
      { title: "مريض جديد", href: "/patients/new", permission: "patients.edit" },
      { title: "الأرشيف", href: "/patients/archived", permission: "patients.view" },
    ]
  },
  { title: "الحجوزات", href: "/appointments", icon: Calendar, permission: "appointments.view" },
  { 
    title: "المالية", 
    href: "/financial", 
    icon: DollarSign,
    permission: "financial.view",
    subItems: [
      { title: "الملخص", href: "/financial", permission: "financial.view" },
      { title: "الخزن", href: "/financial/vaults", permission: "financial.view" },
      { title: "المصروفات", href: "/financial/expenses", permission: "financial.view" },
      { title: "المستحقات", href: "/financial/receivables", permission: "financial.view" },
    ]
  },
  { title: "الخدمات", href: "/services", icon: Stethoscope, permission: "services.view" },
  { title: "المخزون", href: "/inventory", icon: Package, permission: "inventory.view" },
  { title: "التحليلات", href: "/analytics", icon: BarChart2, permission: "dashboard.view" },
  { title: "القوالب الطبية", href: "/templates", icon: FileText, permission: "settings.view" },
  { title: "الصلاحيات", href: "/roles", icon: Shield, permission: "roles.manage" },
  { title: "شؤون الموظفين", href: "/staff", icon: UserCog, permission: "staff.manage" },
  { title: "الحضور والانصراف", href: "/attendance", icon: Clock, permission: "staff.manage" },
  { title: "سجل النشاطات", href: "/activity-log", icon: History, permission: "dashboard.view" },
  { title: "التواصل والتسويق", href: "/communication", icon: MessageSquare, permission: "dashboard.view" },
  { title: "الملاحظات والمهام", href: "/tasks", icon: ClipboardList, permission: "dashboard.view" },
  { title: "المزامنة والنسخ", href: "/backup", icon: RefreshCw, permission: "settings.view" },
  { title: "الإعدادات", href: "/settings", icon: Settings, permission: "settings.view" },
];

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <aside className={cn(
      "bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300",
      collapsed ? "w-[80px]" : "w-64"
    )}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && <h1 className="text-xl font-bold font-sans text-white">العيادة</h1>}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white">
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-2">
          {navItems.map((item) => {
            const hasPermission = item.permission ? (user?.permissions as Record<string, boolean>)?.[item.permission] : true;
            if (!hasPermission) return null;

            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            if (item.subItems && !collapsed) {
              const visibleSubItems = item.subItems.filter(sub => 
                sub.permission ? (user?.permissions as Record<string, boolean>)?.[sub.permission] : true
              );
              
              if (visibleSubItems.length === 0) return null;

              return (
                <Collapsible key={item.href} defaultOpen={isActive}>
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 rounded-md transition-colors",
                      "hover:bg-sidebar-accent hover:text-white",
                      isActive ? "bg-sidebar-accent text-white font-medium" : "text-sidebar-foreground"
                    )}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                      <ChevronDown className="h-4 w-4 mr-auto transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 py-1 space-y-1">
                    {visibleSubItems.map((sub) => {
                      const isSubActive = location === sub.href;
                      return (
                        <Link key={sub.href} href={sub.href} className={cn(
                          "block px-3 py-2 rounded-md text-sm transition-colors",
                          isSubActive ? "bg-sidebar-accent/50 text-white font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                        )}>
                          {sub.title}
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                "hover:bg-sidebar-accent hover:text-white",
                isActive ? "bg-sidebar-accent text-white font-medium" : "text-sidebar-foreground",
                collapsed && "justify-center"
              )}>
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

import { useAuth } from "@/components/auth/auth-provider";
import { useLogout } from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";

export function Header() {
  const { user, refetch } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { mutate: logout } = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        setLocation("/login");
      }
    }
  });

  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {user?.roleName || "المستخدم"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>{user?.roleName || "المستخدم"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="h-6 w-px bg-border mx-1" />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-status-done"></div>
          متصل
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8 bg-primary/10 text-primary">
                <AvatarFallback>{user?.name?.substring(0, 2) || "م"}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{user?.name || "مستخدم النظام"}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>الملف الشخصي</DropdownMenuItem>
            <DropdownMenuItem>تغيير كلمة المرور</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => logout()}>
              تسجيل الخروج
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex font-sans" dir="rtl">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
