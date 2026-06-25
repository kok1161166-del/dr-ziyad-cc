import { useState } from "react";
import { useGetFinancialSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Users, Activity, FileText, Calendar, Filter } from "lucide-react";

export default function FinancialSummary() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: "", dateTo: "" });

  const { data: summary, isLoading } = useGetFinancialSummary({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined
  });

  const handleFilter = () => {
    setAppliedFilters({ dateFrom, dateTo });
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setAppliedFilters({ dateFrom: "", dateTo: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">الملخص المالي</h1>
      </div>

      <Card className="bg-background">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[250px]">
            <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[250px]">
            <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFilter} className="gap-2">
              <Filter className="h-4 w-4" /> تصفية
            </Button>
            {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
              <Button variant="outline" onClick={clearFilters}>إلغاء</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-emerald-500 shadow-sm hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">صافي الربح</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-md">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-3xl font-bold text-emerald-600">₪ {summary?.netProfit || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-sm hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</CardTitle>
            <div className="p-2 bg-blue-100 rounded-md">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold">₪ {summary?.totalPayments || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-rose-500 shadow-sm hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المصروفات</CardTitle>
            <div className="p-2 bg-rose-100 rounded-md">
              <TrendingDown className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-rose-600">₪ {summary?.totalExpenses || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500 shadow-sm hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المستحقات</CardTitle>
            <div className="p-2 bg-amber-100 rounded-md">
              <Wallet className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-amber-600">₪ {summary?.totalReceivables || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-bold mt-8 mb-4">تفاصيل إضافية</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-secondary/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm"><Wallet className="h-5 w-5 text-slate-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">المدفوع نقداً</div>
              {isLoading ? <Skeleton className="h-6 w-16" /> : <div className="font-bold text-lg">₪ {summary?.cashPayments || 0}</div>}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-secondary/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm"><Activity className="h-5 w-5 text-slate-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">طرق دفع أخرى</div>
              {isLoading ? <Skeleton className="h-6 w-16" /> : <div className="font-bold text-lg">₪ {summary?.otherPayments || 0}</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm"><TrendingDown className="h-5 w-5 text-slate-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">إجمالي الخصومات</div>
              {isLoading ? <Skeleton className="h-6 w-16" /> : <div className="font-bold text-lg">₪ {summary?.totalDiscounts || 0}</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm"><Users className="h-5 w-5 text-slate-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">المرضى المخدومين</div>
              {isLoading ? <Skeleton className="h-6 w-16" /> : <div className="font-bold text-lg">{summary?.totalPatients || 0}</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm"><FileText className="h-5 w-5 text-slate-600" /></div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">الخدمات المقدمة</div>
              {isLoading ? <Skeleton className="h-6 w-16" /> : <div className="font-bold text-lg">{summary?.totalServices || 0}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}