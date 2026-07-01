import { useState, useEffect, useRef } from "react";
import { useListPatients, useDeletePatient } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Filter, Edit, Trash2, Eye, Upload, X } from "lucide-react";
import { Link } from "wouter";
import RestoreImport from "./restore-import";

export default function Patients() {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<{ gender?: string; maritalStatus?: string; nationality?: string; address?: string }>({});
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const limit = 20;

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchValue);
      setPage(1);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [searchValue]);

  const { data, isLoading } = useListPatients({
    search: debouncedSearch || undefined,
    page,
    limit,
    ...(filters.gender ? { gender: filters.gender } : {}),
    ...(filters.maritalStatus ? { maritalStatus: filters.maritalStatus } : {}),
    ...(filters.nationality ? { nationality: filters.nationality } : {}),
    ...(filters.address ? { address: filters.address } : {}),
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 1;

  const deletePatient = useDeletePatient({
    mutation: {
      onSuccess: () => {
        toast({ title: "تم الحذف", description: "تم نقل المريض إلى الأرشيف" });
        queryClient.invalidateQueries();
      },
      onError: () => {
        toast({ title: "خطأ", description: "حدث خطأ أثناء الحذف", variant: "destructive" });
      }
    }
  });

  const clearFilters = () => {
    setFilters({});
    setPage(1);
    setFilterOpen(false);
  };

  const pageStart = data?.total ? (page - 1) * limit + 1 : 0;
  const pageEnd = data?.total ? Math.min(page * limit, data.total) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">المرضى</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setRestoreOpen(true)}>
            <Upload className="h-4 w-4" />
            استرداد مرضى
          </Button>
          <Link href="/patients/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              مريض جديد
            </Button>
          </Link>
        </div>
      </div>
      <RestoreImport
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        onComplete={() => queryClient.invalidateQueries()}
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="بحث بالاسم أو الكود أو رقم الجوال..." 
                className="pr-9" 
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </div>
            <Button variant={Object.keys(filters).length > 0 ? "default" : "outline"} className="gap-2" onClick={() => setFilterOpen(true)}>
              <Filter className="h-4 w-4" />
              تصفية
              {Object.keys(filters).length > 0 && (
                <span className="mr-1 h-5 w-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center">{Object.keys(filters).length}</span>
              )}
            </Button>
            {Object.keys(filters).length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearFilters} title="مسح التصفية">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-20">الكود</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead className="w-16">العمر</TableHead>
                <TableHead className="w-28">الموبايل</TableHead>
                <TableHead className="w-24">إجمالي الزيارات</TableHead>
                <TableHead className="w-24">آخر زيارة</TableHead>
                <TableHead className="w-24">أدوات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : data?.patients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                    لا يوجد مرضى
                  </TableCell>
                </TableRow>
              ) : (
                data?.patients?.map((patient, index) => (
                  <TableRow key={patient.id}>
                    <TableCell>{pageStart + index}</TableCell>
                    <TableCell className="font-mono text-xs">{patient.localCode}</TableCell>
                    <TableCell className="font-medium">{patient.nameAr}</TableCell>
                    <TableCell>{patient.ageYears ? `${patient.ageYears} سنة` : "-"}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{patient.phones?.[0]?.number || "-"}</TableCell>
                    <TableCell>{patient.totalVisits}</TableCell>
                    <TableCell>{patient.lastVisitDate ? new Date(patient.lastVisitDate).toLocaleDateString("ar-EG") : "-"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف المريض</AlertDialogTitle>
                              <AlertDialogDescription>
                                هل أنت متأكد من حذف المريض ({patient.nameAr})؟ سيتم نقله إلى الأرشيف.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex gap-2">
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deletePatient.mutate({ id: patient.id })}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                نعم، احذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                عرض {pageStart}-{pageEnd} من {data?.total ?? 0}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink onClick={() => setPage(pageNum)} isActive={page === pageNum}>
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تصفية متقدمة</DialogTitle>
            <DialogDescription>اختر الحقول لتصفية قائمة المرضى</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>الجنس</Label>
              <Select value={filters.gender || ""} onValueChange={(v) => setFilters(f => ({ ...f, gender: v === "all" ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="ذكر">ذكر</SelectItem>
                  <SelectItem value="أنثى">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الحالة الاجتماعية</Label>
              <Select value={filters.maritalStatus || ""} onValueChange={(v) => setFilters(f => ({ ...f, maritalStatus: v === "all" ? undefined : v }))}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="أعزب">أعزب</SelectItem>
                  <SelectItem value="متزوج">متزوج</SelectItem>
                  <SelectItem value="مطلقة">مطلقة</SelectItem>
                  <SelectItem value="أرمل">أرمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الجنسية</Label>
              <Input placeholder="مثال: فلسطين" value={filters.nationality || ""} onChange={(e) => setFilters(f => ({ ...f, nationality: e.target.value || undefined }))} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input placeholder="مثال: غزة" value={filters.address || ""} onChange={(e) => setFilters(f => ({ ...f, address: e.target.value || undefined }))} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={clearFilters}>مسح الكل</Button>
            <Button onClick={() => { setPage(1); setFilterOpen(false); }}>تطبيق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
