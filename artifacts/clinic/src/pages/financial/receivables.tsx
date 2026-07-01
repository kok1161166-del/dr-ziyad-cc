import { useState } from "react";
import { useListReceivables } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Filter, Search, Phone, ExternalLink, Wallet } from "lucide-react";

export default function Receivables() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState({ dateFrom: "", dateTo: "" });

  const { data: receivables, isLoading } = useListReceivables({
    dateFrom: appliedFilters.dateFrom || undefined,
    dateTo: appliedFilters.dateTo || undefined
  });

  const handleFilter = () => setAppliedFilters({ dateFrom, dateTo });
  const totalAmount = Array.isArray(receivables) ? receivables.reduce((sum, item) => sum + item.amount, 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">المستحقات والديون</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 rounded-md"><Wallet className="h-5 w-5 text-amber-600" /></div>
                <h3 className="font-semibold text-amber-900">إجمالي المستحقات</h3>
              </div>
              <div className="text-3xl font-bold font-mono tracking-tight text-amber-700 mt-4" dir="ltr">
                ₪ {totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-amber-600/80 mt-2">مبالغ غير مسددة بالكامل</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" /> تصفية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث باسم المريض..." className="pr-9" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">من تاريخ الحجز</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">إلى تاريخ الحجز</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleFilter}>تطبيق الفلتر</Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3">
          <Card className="h-full">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/30">
                  <TableRow>
                    <TableHead>المريض</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>تاريخ الحجز</TableHead>
                    <TableHead>المبلغ المستحق</TableHead>
                    <TableHead className="text-left">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : !Array.isArray(receivables) || receivables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        لا يوجد مستحقات حالياً
                      </TableCell>
                    </TableRow>
                  ) : (
                    receivables.map(item => (
                      <TableRow key={item.appointmentId}>
                        <TableCell className="font-medium">
                          <Link href={`/patients/${item.patientId}`} className="hover:underline hover:text-primary">
                            {item.patientName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.patientPhone ? (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span dir="ltr">{item.patientPhone}</span>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(item.appointmentDate).toLocaleDateString('ar-EG')}</TableCell>
                        <TableCell className="font-bold text-amber-600 font-mono" dir="ltr">₪ {item.amount}</TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Link href={`/appointments?id=${item.appointmentId}`}>
                              <Button size="sm" variant="outline" className="h-8 gap-1">
                                دفع <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}