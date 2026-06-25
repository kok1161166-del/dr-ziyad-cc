import { Link, useLocation } from "wouter";
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
  ChevronDown
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
  subItems?: { title: string; href: string }[];
}

const navItems: NavItem[] = [
  { title: "لوحة التحكم", href: "/", icon: LayoutDashboard },
  { 
    title: "المرضى", 
    href: "/patients", 
    icon: Users,
    subItems: [
      { title: "قائمة المرضى", href: "/patients" },
      { title: "مريض جديد", href: "/patients/new" },
      { title: "الأرشيف", href: "/patients/archived" },
    ]
  },
  { title: "الحجوزات", href: "/appointments", icon: Calendar },
  { 
    title: "المالية", 
    href: "/financial", 
    icon: DollarSign,
    subItems: [
      { title: "الملخص", href: "/financial" },
      { title: "الخزن", href: "/financial/vaults" },
      { title: "المصروفات", href: "/financial/expenses" },
      { title: "المستحقات", href: "/financial/receivables" },
    ]
  },
  { title: "الخدمات", href: "/services", icon: Stethoscope },
  { title: "المخزون", href: "/inventory", icon: Package },
  { title: "التحليلات", href: "/analytics", icon: BarChart2 },
  { title: "القوالب الطبية", href: "/templates", icon: FileText },
  { title: "الصلاحيات", href: "/roles", icon: Shield },
  { title: "الإعدادات", href: "/settings", icon: Settings },
];

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (c: boolean) => void }) {
  const [location] = useLocation();

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
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            if (item.subItems && !collapsed) {
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
                    {item.subItems.map((sub) => {
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

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              فرع غزة
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>فرع غزة</DropdownMenuItem>
            <DropdownMenuItem>فرع خان يونس</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
              <Avatar className="h-8 w-8">
                <AvatarFallback>ز.د</AvatarFallback>
              </Avatar>
              <span className="font-medium">د. زياد أبو دقة</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>حسابي</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>الملف الشخصي</DropdownMenuItem>
            <DropdownMenuItem>تغيير كلمة المرور</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">تسجيل الخروج</DropdownMenuItem>
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
