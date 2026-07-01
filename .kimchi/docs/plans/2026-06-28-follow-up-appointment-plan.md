# Follow-up Appointment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Follow-up" tab in the doctor examination view to schedule next appointments, save them as secretary bookings, and display details at payment.

**Architecture:** Extend the existing visits/bookings data model with follow-up fields; add a new API endpoint to create follow-up bookings; add a new tab in the doctor UI; enrich secretary bookings and payment views with follow-up data.

**Tech Stack:** React + TypeScript + Vite + shadcn/ui + Tailwind CSS + TanStack Query + Express + Supabase (PostgreSQL)

---

## File Structure

| File | Responsibility |
|------|----------------|
| `artifacts/clinic/src/lib/db.ts` | Extend `DbVisit` and `DbBooking` types; add `createFollowUpBooking` helper. |
| `artifacts/api-server/src/routes/appointments.ts` | Add `POST /appointments/:id/follow-up` endpoint. |
| `artifacts/api-server/src/routes/patients.ts` | Enrich `GET /patients/:id/visits` with `nextAppointmentDate` and `nextBookingId`. |
| `artifacts/clinic/src/pages/doctor.tsx` | Add "المتابعة" tab with interval buttons, date picker, notes, and save button. |
| `artifacts/clinic/src/pages/reception.tsx` | Show "متابعة طبية" badge for follow-up bookings; enrich booking display. |
| `artifacts/clinic/src/pages/appointments.tsx` | Add "اش مشكلته" dialog, cost card, and next-appointment card in payment view. |

---

## Task 1: Extend DB Types

**Files:**
- Modify: `artifacts/clinic/src/lib/db.ts`

- [ ] **Step 1: Add follow-up fields to `DbVisit`**

Find `export interface DbVisit` and append:

```typescript
export interface DbVisit {
  // ... existing fields ...
  next_appointment_date?: string;
  next_booking_id?: number;
}
```

- [ ] **Step 2: Add follow-up fields to `DbBooking`**

Find `export interface DbBooking` and append:

```typescript
export interface DbBooking {
  // ... existing fields ...
  patient_id?: number;
  source_visit_id?: number;
  follow_up_interval?: FollowUpInterval;
  follow_up_notes?: string;
}
```

Add the type above it:

```typescript
export type FollowUpInterval =
  | "1_week"
  | "2_weeks"
  | "1_month"
  | "2_months"
  | "3_months"
  | "4_months"
  | "custom";
```

- [ ] **Step 3: Add helper to create follow-up booking**

After `createBooking`, add:

```typescript
export interface CreateFollowUpBookingInput {
  patient_id: number;
  source_visit_id: number;
  name: string;
  phone?: string;
  booking_date: string;
  booking_time?: string;
  follow_up_interval: FollowUpInterval;
  follow_up_notes?: string;
  branch?: string;
  service?: string;
}

export async function createFollowUpBooking(data: CreateFollowUpBookingInput) {
  const { data: result, error } = await supabase
    .from("bookings")
    .insert({
      name: data.name,
      phone: data.phone,
      booking_date: data.booking_date,
      booking_time: data.booking_time,
      service: data.service ?? "متابعة طبية",
      notes: data.follow_up_notes,
      status: "confirmed",
      patient_id: data.patient_id,
      source_visit_id: data.source_visit_id,
      follow_up_interval: data.follow_up_interval,
      follow_up_notes: data.follow_up_notes,
    })
    .select()
    .single();
  if (error) throw error;
  return result;
}
```

- [ ] **Step 4: Add helper to update visit follow-up fields**

```typescript
export async function updateVisitFollowUp(
  visitId: number,
  data: { next_appointment_date?: string; next_booking_id?: number }
) {
  const { error } = await supabase
    .from("visits")
    .update({
      next_appointment_date: data.next_appointment_date,
      next_booking_id: data.next_booking_id,
    })
    .eq("id", visitId);
  if (error) throw error;
}
```

- [ ] **Step 5: Run typecheck**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/clinic/src/lib/db.ts
git commit -m "feat(db): add follow-up fields and helpers"
```

---

## Task 2: Add API Endpoint for Follow-up Booking

**Files:**
- Modify: `artifacts/api-server/src/routes/appointments.ts`

- [ ] **Step 1: Add `POST /appointments/:id/follow-up` route**

Append before `export default router;`:

```typescript
function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function calculateFollowUpDate(interval: string, customDate?: string): string {
  if (customDate) return customDate;
  const today = new Date();
  switch (interval) {
    case "1_week": return addDays(today, 7).toISOString().split("T")[0];
    case "2_weeks": return addDays(today, 14).toISOString().split("T")[0];
    case "1_month": return addMonths(today, 1).toISOString().split("T")[0];
    case "2_months": return addMonths(today, 2).toISOString().split("T")[0];
    case "3_months": return addMonths(today, 3).toISOString().split("T")[0];
    case "4_months": return addMonths(today, 4).toISOString().split("T")[0];
    default: return today.toISOString().split("T")[0];
  }
}

router.post("/appointments/:id/follow-up", async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const { interval, customDate, notes, bookingTime, branch } = req.body;
    if (!interval) {
      return res.status(400).json({ error: "Interval is required" });
    }

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("patient_id, branch")
      .eq("id", appointmentId)
      .single();
    if (apptError || !appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const { data: visit, error: visitError } = await supabase
      .from("visits")
      .select("id")
      .eq("appointment_id", appointmentId)
      .order("id", { ascending: false })
      .limit(1)
      .single();
    if (visitError || !visit) {
      return res.status(404).json({ error: "Visit not found" });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("name_ar, phone_primary")
      .eq("id", appointment.patient_id)
      .single();
    if (patientError || !patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const followUpDate = calculateFollowUpDate(interval, customDate);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        patient_id: appointment.patient_id,
        source_visit_id: visit.id,
        name: (patient as any).name_ar ?? "غير معروف",
        phone: (patient as any).phone_primary ?? null,
        booking_date: followUpDate,
        booking_time: bookingTime ?? null,
        service: "متابعة طبية",
        notes: notes ?? null,
        follow_up_interval: interval,
        follow_up_notes: notes ?? null,
        status: "confirmed",
        created_by: null,
      })
      .select()
      .single();
    if (bookingError) throw bookingError;

    const { error: updateError } = await supabase
      .from("visits")
      .update({
        next_appointment_date: followUpDate,
        next_booking_id: booking.id,
      })
      .eq("id", visit.id);
    if (updateError) throw updateError;

    res.status(201).json({ booking });
  } catch (err) {
    req.log.error({ err }, "create follow-up booking error");
    res.status(500).json({ error: "Internal server error" });
  }
});
```

- [ ] **Step 2: Run typecheck/build**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/api-server
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/api-server/src/routes/appointments.ts
git commit -m "feat(api): add follow-up booking endpoint"
```

---

## Task 3: Enrich Patient Visits Endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/patients.ts`

- [ ] **Step 1: Include follow-up fields in `GET /patients/:id/visits`**

Find the `enriched` map inside `router.get("/patients/:id/visits", ...)` and append these fields to the returned object:

```typescript
        nextAppointmentDate: v.next_appointment_date,
        nextBookingId: v.next_booking_id,
```

The full return object should include these two new fields.

- [ ] **Step 2: Run typecheck/build**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/api-server
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/api-server/src/routes/patients.ts
git commit -m "feat(api): include follow-up fields in patient visits"
```

---

## Task 4: Add Follow-up Tab in Doctor Page

**Files:**
- Modify: `artifacts/clinic/src/pages/doctor.tsx`

- [ ] **Step 1: Import required icons and components**

Add to imports:

```typescript
import { CalendarDays, CalendarIcon, ClipboardList } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, addMonths } from "date-fns";
import { ar } from "date-fns/locale";
```

- [ ] **Step 2: Add state for follow-up tab**

Near `const [examTab, setExamTab] = useState("exam");`, add:

```typescript
const [followUpInterval, setFollowUpInterval] = useState<FollowUpInterval | null>(null);
const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
const [followUpNotes, setFollowUpNotes] = useState("");
const [savingFollowUp, setSavingFollowUp] = useState(false);
```

- [ ] **Step 3: Add interval options**

Add near the top of the component:

```typescript
const FOLLOW_UP_OPTIONS: { value: FollowUpInterval; label: string }[] = [
  { value: "1_week", label: "أسبوع" },
  { value: "2_weeks", label: "أسبوعين" },
  { value: "1_month", label: "شهر" },
  { value: "2_months", label: "شهرين" },
  { value: "3_months", label: "3 أشهر" },
  { value: "4_months", label: "4 أشهر" },
];
```

- [ ] **Step 4: Add helper to compute follow-up date**

```typescript
function computeFollowUpDate(interval: FollowUpInterval, custom?: Date): Date {
  const base = custom ?? new Date();
  switch (interval) {
    case "1_week": return addDays(base, 7);
    case "2_weeks": return addDays(base, 14);
    case "1_month": return addMonths(base, 1);
    case "2_months": return addMonths(base, 2);
    case "3_months": return addMonths(base, 3);
    case "4_months": return addMonths(base, 4);
    case "custom": return base;
    default: return base;
  }
}
```

- [ ] **Step 5: Add save handler**

```typescript
async function handleSaveFollowUp() {
  if (!currentAppointment) return;
  if (!followUpInterval && !followUpDate) {
    toast({ title: "تنبيه", description: "اختر فترة المتابعة أو تاريخًا", variant: "destructive" });
    return;
  }
  setSavingFollowUp(true);
  try {
    const interval = followUpInterval ?? "custom";
    const dateStr = followUpDate
      ? format(followUpDate, "yyyy-MM-dd")
      : format(computeFollowUpDate(interval), "yyyy-MM-dd");

    const res = await fetch(`/api/appointments/${currentAppointment.id}/follow-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interval,
        customDate: followUpDate ? format(followUpDate, "yyyy-MM-dd") : undefined,
        notes: followUpNotes,
      }),
    });
    if (!res.ok) throw new Error("فشل حفظ المتابعة");
    toast({ title: "تم الحفظ", description: "تم إنشاء موعد المتابعة" });
    setFollowUpInterval(null);
    setFollowUpDate(undefined);
    setFollowUpNotes("");
  } catch (err) {
    toast({ title: "خطأ", description: (err as Error).message, variant: "destructive" });
  } finally {
    setSavingFollowUp(false);
  }
}
```

- [ ] **Step 6: Add "المتابعة" tab trigger**

In the `<TabsList>` (around line 1447), add after the "products" trigger:

```tsx
<TabsTrigger value="followup" className="gap-2">
  <CalendarDays className="h-4 w-4" />
  <span className="hidden sm:inline">المتابعة</span>
</TabsTrigger>
```

Also update `className="w-full grid grid-cols-2 sm:grid-cols-4 max-w-3xl"` to `grid-cols-3 sm:grid-cols-6` or `grid-cols-2 sm:grid-cols-5` to fit the new tab.

- [ ] **Step 7: Add "المتابعة" tab content**

After the "products" `<TabsContent>`, add:

```tsx
<TabsContent value="followup" className="space-y-4 mt-4">
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        تحديد موعد المتابعة
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Interval buttons */}
      <div className="flex flex-wrap gap-2">
        {FOLLOW_UP_OPTIONS.map((opt) => {
          const selected = followUpInterval === opt.value;
          return (
            <Button
              key={opt.value}
              type="button"
              variant={selected ? "default" : "outline"}
              className={cn(
                "rounded-full px-4 transition-all",
                selected && "bg-primary text-primary-foreground shadow-sm"
              )}
              onClick={() => {
                setFollowUpInterval(opt.value);
                setFollowUpDate(undefined);
              }}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>

      {/* Custom date picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <span className="text-sm text-muted-foreground">أو اختر تاريخًا محددًا:</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-right w-[240px]">
              <CalendarIcon className="ml-2 h-4 w-4" />
              {followUpDate ? format(followUpDate, "yyyy-MM-dd") : "اختر التاريخ"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={followUpDate}
              onSelect={(d) => {
                setFollowUpDate(d);
                setFollowUpInterval("custom");
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Preview selected date */}
      {(followUpInterval || followUpDate) && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
          <span className="font-medium">الموعد المقترح:</span>{" "}
          {followUpDate
            ? format(followUpDate, "yyyy-MM-dd")
            : followUpInterval
            ? format(computeFollowUpDate(followUpInterval), "yyyy-MM-dd")
            : "-"}
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>ملاحظات المتابعة</Label>
        <Textarea
          placeholder="اكتب ملاحظات الطبيب للمتابعة..."
          value={followUpNotes}
          onChange={(e) => setFollowUpNotes(e.target.value)}
          className="min-h-[80px]"
        />
      </div>

      {/* Save button */}
      <Button onClick={handleSaveFollowUp} disabled={savingFollowUp}>
        {savingFollowUp ? "جاري الحفظ..." : "حفظ المتابعة"}
      </Button>
    </CardContent>
  </Card>

  {/* Previous follow-ups table */}
  {currentPatientData?.visits?.length > 0 && (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-emerald-600" />
          سجل المتابعات السابقة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>التاريخ</TableHead>
              <TableHead>الفترة</TableHead>
              <TableHead>ملاحظات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPatientData.visits
              .filter((v) => v.nextAppointmentDate)
              .map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{v.nextAppointmentDate}</TableCell>
                  <TableCell>{v.nextAppointmentDate ? "محدد" : "-"}</TableCell>
                  <TableCell>{v.notes ?? "-"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )}
</TabsContent>
```

- [ ] **Step 8: Run typecheck**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
pnpm run typecheck
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/clinic/src/pages/doctor.tsx
git commit -m "feat(doctor): add follow-up tab with interval buttons and date picker"
```

---

## Task 5: Show Follow-up Badge in Secretary Bookings

**Files:**
- Modify: `artifacts/clinic/src/pages/reception.tsx`

- [ ] **Step 1: Add badge import**

Ensure `Badge` is imported from `@/components/ui/badge`.

- [ ] **Step 2: Update `DbBooking` usage**

Ensure `DbBooking` is imported from `@/lib/db` and includes the new follow-up fields (already done in Task 1).

- [ ] **Step 3: Render follow-up badge in bookings list**

Find `renderBookingsSection()` and the `bookings.map((booking) => ...)` block. Add inside the booking card:

```tsx
{booking.source_visit_id && (
  <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
    متابعة طبية
  </Badge>
)}
```

Also display the patient name from linked patient if `patient_id` exists and `name` is generic. Optional: fetch patient names via `getPatient` or include them in `getBookings`.

- [ ] **Step 4: Run typecheck**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
pnpm run typecheck
```

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/clinic/src/pages/reception.tsx
git commit -m "feat(reception): show follow-up badge in bookings"
```

---

## Task 6: Add Payment View Details

**Files:**
- Modify: `artifacts/clinic/src/pages/appointments.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Stethoscope, CalendarDays, Coins } from "lucide-react";
```

- [ ] **Step 2: Locate payment dialog/card**

Find the component/section that renders payment details for an appointment.

- [ ] **Step 3: Add "اش مشكلته" button and dialog**

Assume the current appointment object has `visit` data available (you may need to fetch it). Add:

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline" className="gap-2">
      <Stethoscope className="h-4 w-4" />
      اش مشكلته
    </Button>
  </DialogTrigger>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle>تفاصيل الكشفية</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <h4 className="font-medium text-sm text-muted-foreground">التشخيص</h4>
        <p className="text-sm">{visit?.diagnosis || "لا يوجد تشخيص"}</p>
      </div>
      <div>
        <h4 className="font-medium text-sm text-muted-foreground">خطة العلاج</h4>
        <p className="text-sm">{visit?.treatmentPlan || "لا يوجد"}</p>
      </div>
      <div>
        <h4 className="font-medium text-sm text-muted-foreground">الوصفة الطبية</h4>
        <p className="text-sm">{visit?.prescription || "لا يوجد"}</p>
      </div>
      <div>
        <h4 className="font-medium text-sm text-muted-foreground">ملاحظات الطبيب</h4>
        <p className="text-sm">{visit?.notes || "لا يوجد"}</p>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Add cost card**

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base flex items-center gap-2">
      <Coins className="h-5 w-5 text-emerald-600" />
      التكلفة
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">الإجمالي</span>
      <span>₪{appointment.totalFee}</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">المدفوع</span>
      <span>₪{appointment.paidAmount}</span>
    </div>
    <div className="flex justify-between text-sm font-medium">
      <span>المتبقي</span>
      <span className={appointment.remainingAmount > 0 ? "text-red-600" : "text-emerald-600"}>
        ₪{appointment.remainingAmount}
      </span>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 5: Add next-appointment card**

```tsx
{visit?.nextAppointmentDate && (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-purple-600" />
        الموعد القادم
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">التاريخ</span>
        <span>{visit.nextAppointmentDate}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">الفترة</span>
        <span>
          {{
            "1_week": "أسبوع",
            "2_weeks": "أسبوعين",
            "1_month": "شهر",
            "2_months": "شهرين",
            "3_months": "3 أشهر",
            "4_months": "4 أشهر",
            "custom": "تاريخ محدد",
          }[visit.followUpInterval ?? "custom"]}
        </span>
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">ملاحظات: </span>
        {visit.followUpNotes || "لا يوجد"}
      </div>
    </CardContent>
  </Card>
)}
```

- [ ] **Step 6: Fetch visit data if not already available**

If `appointments.tsx` doesn't already have the visit, add a `useEffect` or React Query call to `GET /api/patients/:patientId/visits` and pick the latest visit for the current appointment.

- [ ] **Step 7: Run typecheck**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
pnpm run typecheck
```

- [ ] **Step 8: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/clinic/src/pages/appointments.tsx
git commit -m "feat(appointments): show problem details, cost, and follow-up in payment view"
```

---

## Task 7: Integration Test

- [ ] **Step 1: Rebuild API server**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/api-server
pnpm run build
```

Expected: Build succeeds.

- [ ] **Step 2: Restart servers**

Use the existing scripts or PowerShell commands from earlier session.

- [ ] **Step 3: Manual test flow**

1. Open doctor page → select patient → open "المتابعة" tab.
2. Click "شهر" → enter notes → click "حفظ المتابعة".
3. Verify toast "تم إنشاء موعد المتابعة".
4. Check Supabase `bookings` table: new row with `source_visit_id` and `follow_up_interval`.
5. Check Supabase `visits` table: `next_appointment_date` and `next_booking_id` updated.
6. Open reception page → bookings tab → verify "متابعة طبية" badge appears.
7. Open appointments page → payment view for the same patient → verify "اش مشكلته" button, cost card, and next-appointment card appear.

- [ ] **Step 4: Commit any final fixes**

---

## Self-Review Checklist

- [ ] All spec requirements map to at least one task.
- [ ] No placeholders (TBD, TODO, implement later) remain.
- [ ] Type names (`FollowUpInterval`, `DbVisit`, `DbBooking`) are consistent across all tasks.
- [ ] File paths are exact and exist in the repo.
- [ ] Each task ends with a typecheck or build command and a commit step.
