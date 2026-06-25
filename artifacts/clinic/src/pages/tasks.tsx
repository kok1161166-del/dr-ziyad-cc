import { useState } from "react";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask, getListTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CheckCircle2, Circle, ClipboardList, AlertCircle, ArrowUpCircle } from "lucide-react";

type Priority = "low" | "normal" | "high";
type Task = {
  id: number;
  title: string;
  content?: string | null;
  assignedTo?: string | null;
  priority: Priority;
  isCompleted: boolean;
  dueDate?: string | null;
  branch?: string | null;
  createdAt: string;
  updatedAt: string;
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; Icon: React.ElementType }> = {
  high:   { label: "عالية",  color: "text-red-600 bg-red-50 border-red-200",    Icon: AlertCircle },
  normal: { label: "عادية",  color: "text-amber-600 bg-amber-50 border-amber-200", Icon: ArrowUpCircle },
  low:    { label: "منخفضة", color: "text-sky-600 bg-sky-50 border-sky-200",    Icon: ClipboardList },
};

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const p = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
  return (
    <Card className={`border transition-all ${task.isCompleted ? "opacity-60" : ""}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start gap-3">
          <button onClick={onToggle} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
            {task.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={`font-medium text-sm ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${p.color}`}>
                  <p.Icon className="h-3 w-3" />
                  {p.label}
                </span>
                <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {task.content && (
              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{task.content}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {task.assignedTo && <span>مسؤول: <span className="font-medium">{task.assignedTo}</span></span>}
              {task.dueDate && <span>الموعد: <span className="font-medium">{task.dueDate}</span></span>}
              {task.branch && <span>الفرع: <span className="font-medium">{task.branch}</span></span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddTaskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", content: "", assignedTo: "", priority: "normal" as Priority, dueDate: "", branch: "" });
  const createMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setForm({ title: "", content: "", assignedTo: "", priority: "normal", dueDate: "", branch: "" });
        onClose();
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>مهمة / ملاحظة جديدة</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>العنوان *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان المهمة أو الملاحظة" />
          </div>
          <div>
            <Label>التفاصيل</Label>
            <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="وصف تفصيلي..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>الأولوية</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">منخفضة</SelectItem>
                  <SelectItem value="normal">عادية</SelectItem>
                  <SelectItem value="high">عالية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الاستحقاق</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label>مسؤول التنفيذ</Label>
              <Input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} placeholder="اسم الموظف" />
            </div>
            <div>
              <Label>الفرع</Label>
              <Select value={form.branch || "__all__"} onValueChange={v => setForm(f => ({ ...f, branch: v === "__all__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="الكل" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">الكل</SelectItem>
                  <SelectItem value="فرع غزة">فرع غزة</SelectItem>
                  <SelectItem value="فرع خان يونس">فرع خان يونس</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button
            onClick={() => createMutation.mutate({ data: { title: form.title, content: form.content || null, assignedTo: form.assignedTo || null, priority: form.priority, dueDate: form.dueDate || null, branch: form.branch || null } })}
            disabled={!form.title.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "جاري الحفظ..." : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [addOpen, setAddOpen] = useState(false);

  const isCompletedParam = filter === "pending" ? false : filter === "done" ? true : undefined;
  const { data: tasks, isLoading } = useListTasks({ isCompleted: isCompletedParam });

  const updateMutation = useUpdateTask({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) } });
  const deleteMutation = useDeleteTask({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }) } });

  const pending = tasks?.filter(t => !t.isCompleted) ?? [];
  const done = tasks?.filter(t => t.isCompleted) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">الملاحظات والمهام</h1>
          <p className="text-muted-foreground text-sm mt-1">مهام يومية وملاحظات إدارية لطاقم العيادة</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          مهمة جديدة
        </Button>
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "done"] as const).map(f => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "all" ? "الكل" : f === "pending" ? `قيد التنفيذ (${pending.length})` : `مكتملة (${done.length})`}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {(filter === "all" ? [...pending, ...done] : filter === "pending" ? pending : done).map(task => (
            <TaskCard
              key={task.id}
              task={task as Task}
              onToggle={() => updateMutation.mutate({ id: task.id, data: { title: task.title, isCompleted: !task.isCompleted } })}
              onDelete={() => deleteMutation.mutate({ id: task.id })}
            />
          ))}
          {tasks?.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد مهام بعد</p>
            </div>
          )}
        </div>
      )}

      <AddTaskDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
