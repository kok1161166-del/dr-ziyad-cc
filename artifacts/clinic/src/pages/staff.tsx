import { useState } from "react";
import { useListStaff, useUpdateStaffDetails, useCreateStaffDetails, getListStaffQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, Clock, DollarSign, Briefcase, Phone, Calendar, Edit2, Users } from "lucide-react";

const WORK_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

type StaffMember = {
  id: number;
  userId: number;
  name: string;
  username: string;
  email?: string | null;
  roleId: number;
  roleName: string;
  branch?: string | null;
  isFrozen: boolean;
  position?: string | null;
  specialty?: string | null;
  phone?: string | null;
  salary?: number | null;
  joiningDate?: string | null;
  workDays: string[];
  shiftStart?: string | null;
  shiftEnd?: string | null;
  notes?: string | null;
  createdAt: string;
};

function StaffCard({ member, onEdit }: { member: StaffMember; onEdit: (m: StaffMember) => void }) {
  return (
    <Card className={`border ${member.isFrozen ? "opacity-60" : ""}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle className="h-7 w-7 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-base">{member.name}</div>
              <div className="text-sm text-muted-foreground">{member.position || member.roleName}</div>
              {member.specialty && <div className="text-xs text-muted-foreground mt-0.5">{member.specialty}</div>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant={member.isFrozen ? "destructive" : "secondary"} className="text-xs">
              {member.isFrozen ? "موقوف" : "نشط"}
            </Badge>
            <Badge variant="outline" className="text-xs">{member.roleName}</Badge>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {member.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{member.phone}</span>
            </div>
          )}
          {member.branch && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              <span>{member.branch}</span>
            </div>
          )}
          {member.salary != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{member.salary.toLocaleString("ar-EG")} ₪</span>
            </div>
          )}
          {member.joiningDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{member.joiningDate}</span>
            </div>
          )}
          {(member.shiftStart || member.shiftEnd) && (
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <Clock className="h-3.5 w-3.5" />
              <span>{member.shiftStart} - {member.shiftEnd}</span>
            </div>
          )}
        </div>

        {member.workDays.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {member.workDays.map(d => (
              <span key={d} className="px-2 py-0.5 rounded bg-primary/8 text-primary text-xs font-medium">{d}</span>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => onEdit(member)}>
            <Edit2 className="h-3.5 w-3.5 ml-1" />
            تعديل البيانات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditStaffDialog({ member, open, onClose }: { member: StaffMember | null; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<StaffMember>>({});
  const updateMutation = useUpdateStaffDetails({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() }); onClose(); } } });
  const createMutation = useCreateStaffDetails({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListStaffQueryKey() }); onClose(); } } });

  const handleOpen = () => {
    if (member) setForm({ ...member });
  };

  const toggleDay = (day: string) => {
    const days = form.workDays ?? [];
    setForm(f => ({ ...f, workDays: days.includes(day) ? days.filter(d => d !== day) : [...days, day] }));
  };

  const handleSave = () => {
    if (!member) return;
    const payload = {
      userId: member.userId,
      position: form.position ?? null,
      specialty: form.specialty ?? null,
      phone: form.phone ?? null,
      salary: form.salary ?? null,
      joiningDate: form.joiningDate ?? null,
      workDays: form.workDays ?? [],
      shiftStart: form.shiftStart ?? null,
      shiftEnd: form.shiftEnd ?? null,
      notes: form.notes ?? null,
    };
    updateMutation.mutate({ id: member.userId, data: payload });
  };

  const isPending = updateMutation.isPending || createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); else handleOpen(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تعديل بيانات الموظف — {member?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>المسمى الوظيفي</Label>
              <Input value={form.position ?? ""} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="طبيب، ممرضة، موظف استقبال..." />
            </div>
            <div>
              <Label>التخصص</Label>
              <Input value={form.specialty ?? ""} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="جلدية، عظمية..." />
            </div>
            <div>
              <Label>رقم الهاتف</Label>
              <Input value={form.phone ?? ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xxxxxxxx" />
            </div>
            <div>
              <Label>الراتب الشهري (₪)</Label>
              <Input type="number" value={form.salary ?? ""} onChange={e => setForm(f => ({ ...f, salary: e.target.value ? parseFloat(e.target.value) : null }))} placeholder="0" />
            </div>
            <div>
              <Label>تاريخ الالتحاق</Label>
              <Input type="date" value={form.joiningDate ?? ""} onChange={e => setForm(f => ({ ...f, joiningDate: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>بداية الدوام</Label>
                <Input type="time" value={form.shiftStart ?? ""} onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))} />
              </div>
              <div>
                <Label>نهاية الدوام</Label>
                <Input type="time" value={form.shiftEnd ?? ""} onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))} />
              </div>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">أيام العمل</Label>
            <div className="flex flex-wrap gap-1.5">
              {WORK_DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${(form.workDays ?? []).includes(day) ? "bg-primary text-white border-primary" : "border-border hover:border-primary"}`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Input value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي ملاحظات إضافية..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={handleSave} disabled={isPending}>{isPending ? "جاري الحفظ..." : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Staff() {
  const { data: staff, isLoading } = useListStaff();
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [search, setSearch] = useState("");

  const filtered = (staff ?? []).filter(m =>
    m.name.includes(search) || (m.position ?? "").includes(search) || (m.specialty ?? "").includes(search)
  ) as StaffMember[];

  const active = filtered.filter(m => !m.isFrozen);
  const frozen = filtered.filter(m => m.isFrozen);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">شؤون الموظفين والأطباء</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة بيانات الطاقم الطبي والإداري</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{staff?.length ?? 0} موظف</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="بحث بالاسم أو المسمى أو التخصص..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3 text-muted-foreground">الموظفون النشطون ({active.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(m => <StaffCard key={m.userId} member={m} onEdit={setEditMember} />)}
              </div>
            </div>
          )}
          {frozen.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3 text-muted-foreground">الموظفون الموقوفون ({frozen.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {frozen.map(m => <StaffCard key={m.userId} member={m} onEdit={setEditMember} />)}
              </div>
            </div>
          )}
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-12">لا يوجد موظفون</div>
          )}
        </div>
      )}

      <EditStaffDialog member={editMember} open={!!editMember} onClose={() => setEditMember(null)} />
    </div>
  );
}
