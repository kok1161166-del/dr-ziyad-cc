# Real-Time Updates for Secretary & Doctor Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the secretary/reception page and the doctor page refresh all displayed data every second automatically, without requiring a manual page reload.

**Architecture:** The app already uses a polling helper `subscribeToAppointments` in `lib/db.ts` that calls a callback every 10 seconds. We will reduce the interval to 1 second and extend each page's subscription callback to refresh every data section that can change from another screen (appointments queue, bookings, current visit/session). We keep the existing local Supabase fetch functions to avoid risky rewrites to generated React Query hooks.

**Tech Stack:** React + TypeScript, Supabase client (`@/lib/db`), custom polling helper in `artifacts/clinic/src/lib/db.ts`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `artifacts/clinic/src/lib/db.ts` | Shared polling helper (`callWithRefresh`, `subscribeToAppointments`, `subscribeToVisits`). Interval reduced to 1 second. |
| `artifacts/clinic/src/pages/reception.tsx` | Secretary page. Subscription callback refreshes appointments queue + bookings (today & filtered). |
| `artifacts/clinic/src/pages/doctor.tsx` | Doctor page. Subscription callback refreshes queue + current visit/session data. Cleanup bug fixed. |

---

## Task 1: Speed up shared polling helper to 1 second

**Files:**
- Modify: `artifacts/clinic/src/lib/db.ts`

- [ ] **Step 1: Replace the magic 10-second interval with a 1-second constant**

In `artifacts/clinic/src/lib/db.ts`, locate the `callWithRefresh` function (near the bottom, after the Bookings helpers). Change:

```ts
function callWithRefresh(cb: (payload?: any) => void) {
  const id = ++pollIdCounter;
  // Poll every 10 seconds — reduces flicker vs 3s
  const interval = setInterval(() => cb({ eventType: "UPDATE" }), 10000);
  polls.set(id, interval);
  return {
    unsubscribe() {
      clearInterval(interval);
      polls.delete(id);
    },
  };
}
```

to:

```ts
const REALTIME_POLL_INTERVAL_MS = 1000;

function callWithRefresh(cb: (payload?: any) => void) {
  const id = ++pollIdCounter;
  const interval = setInterval(() => cb({ eventType: "UPDATE" }), REALTIME_POLL_INTERVAL_MS);
  polls.set(id, interval);
  return {
    unsubscribe() {
      clearInterval(interval);
      polls.delete(id);
    },
  };
}
```

- [ ] **Step 2: Verify the file type-checks in isolation**

Run:
```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
npx tsc --noEmit -p tsconfig.json 2>&1 | head -50
```

Expected: no errors related to `db.ts`.

- [ ] **Step 3: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/clinic/src/lib/db.ts
git commit -m "feat: poll realtime subscriptions every 1 second"
```

---

## Task 2: Make reception page refresh everything every second

**Files:**
- Modify: `artifacts/clinic/src/pages/reception.tsx`

- [ ] **Step 1: Update the appointments subscription effect to also refresh bookings**

Locate the effect:

```tsx
useEffect(() => {
  fetchAppointments();
  if (autoClearQueue) {
    cancelOldPendingAppointments().catch(() => {});
  }
  const channel = subscribeToAppointments(() => {
    fetchAppointments(true);
  });
  return () => {
    channel.unsubscribe();
  };
}, [fetchAppointments, autoClearQueue]);
```

Replace it with:

```tsx
useEffect(() => {
  fetchAppointments();
  fetchBookings();
  fetchTodayBookings();
  if (autoClearQueue) {
    cancelOldPendingAppointments().catch(() => {});
  }
  const channel = subscribeToAppointments(() => {
    fetchAppointments(true);
    fetchBookings();
    fetchTodayBookings();
  });
  return () => {
    channel.unsubscribe();
  };
}, [fetchAppointments, fetchBookings, fetchTodayBookings, autoClearQueue]);
```

- [ ] **Step 2: Remove the now-redundant separate bookings fetch effects**

Locate and delete (or confirm they remain harmless):

```tsx
useEffect(() => {
  fetchBookings();
}, [fetchBookings]);

useEffect(() => {
  fetchTodayBookings();
}, [fetchTodayBookings]);
```

These are not wrong, but they duplicate the initial fetch from Step 1. To keep the diff minimal you may leave them; they cause no bug. If you remove them, ensure the dependency array in Step 1 still includes `fetchBookings` and `fetchTodayBookings`.

- [ ] **Step 3: Verify reception page type-checks**

Run:
```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
npx tsc --noEmit -p tsconfig.json 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/clinic/src/pages/reception.tsx
git commit -m "feat: refresh appointments and bookings every second on reception page"
```

---

## Task 3: Make doctor page refresh queue and session every second

**Files:**
- Modify: `artifacts/clinic/src/pages/doctor.tsx`

- [ ] **Step 1: Fix the subscription cleanup bug**

Locate:

```tsx
useEffect(() => {
  const channel = subscribeToAppointments((payload: any) => {
    if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
      fetchQueue(true);
    }
  });
  return () => {
    supabase.removeChannel(channel);
  };
}, [fetchQueue]);
```

Replace with:

```tsx
useEffect(() => {
  const channel = subscribeToAppointments(() => {
    fetchQueue(true);
    if (currentVisit?.id) {
      refreshCurrentVisit();
    }
  });
  return () => {
    channel.unsubscribe();
  };
}, [fetchQueue, currentVisit?.id, refreshCurrentVisit]);
```

- [ ] **Step 2: Add the `refreshCurrentVisit` callback**

Before the `useEffect` in Step 1, add a callback that reloads the current visit and its related session data:

```tsx
const refreshCurrentVisit = useCallback(async () => {
  if (!currentAppointment?.id || !currentVisit?.id) return;
  try {
    const existing = await getVisitByAppointment(currentAppointment.id);
    if (existing) {
      setCurrentVisit(existing as VisitWithData);
      setDiagnosis(existing.diagnosis || "");
      setTreatmentPlan(existing.treatment_plan || "");
      setNotes(existing.notes || "");
      setPrescription(existing.prescription || "");
    }
    const [inj, las, add] = await Promise.all([
      getInjectionLogs(currentVisit.id),
      getLaserLogs(currentVisit.id),
      getSessionAddons(currentVisit.id),
    ]);
    setInjections(
      inj.map((i: any) => ({
        zoneId: i.zone,
        productType: i.product_name,
        brand: i.brand || "",
        units: i.units || 0,
      }))
    );
    setLaserSessions(
      las.map((l: any) => ({
        id: l.id,
        device: l.device,
        spotSize: l.spot_size || 0,
        fluence: l.fluence || 0,
        pulseWidth: l.pulse_width || 0,
        passes: l.passes || 0,
        areaTreated: l.area || "",
        notes: l.notes || "",
      }))
    );
    setSessionAddons(
      add.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.item_type as "service" | "product",
        price: a.unit_price,
        quantity: a.quantity,
      }))
    );
  } catch { /* silent refresh failure */ }
}, [currentAppointment?.id, currentVisit?.id]);
```

- [ ] **Step 3: Remove the existing current-visit effect that only runs on mount/appointment change (optional)**

The old effect:

```tsx
useEffect(() => {
  if (currentAppointment && !currentVisit) {
    (async () => {
      const existing = await getVisitByAppointment(currentAppointment.id);
      if (existing) {
        setCurrentVisit(existing as VisitWithData);
        setDiagnosis(existing.diagnosis || "");
        setTreatmentPlan(existing.treatment_plan || "");
        setNotes(existing.notes || "");
        setPrescription(existing.prescription || "");
      }
    })();
  }
}, [currentAppointment, currentVisit]);
```

can be kept; it only fires once when entering a session. It does not conflict with the new polling callback. Do not remove it unless you are certain the new callback covers the initial load.

- [ ] **Step 4: Verify doctor page type-checks**

Run:
```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
npx tsc --noEmit -p tsconfig.json 2>&1 | head -50
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git add artifacts/clinic/src/pages/doctor.tsx
git commit -m "feat: refresh queue and session every second on doctor page"
```

---

## Task 4: Final verification

**Files:**
- All modified files above.

- [ ] **Step 1: Run the workspace typecheck**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
pnpm run typecheck 2>&1 | tail -50
```

Expected: exit code 0, no type errors.

- [ ] **Step 2: Run any existing tests**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
pnpm -r --if-present test 2>&1 | tail -80
```

If the project has no tests, this will exit 0 with "No test script found" or similar. That is acceptable.

- [ ] **Step 3: Manual smoke test (describe only, run in browser)**

1. Start the dev server (`pnpm dev` or the project's start command).
2. Open the reception page in one browser tab and the doctor page in another.
3. From reception, add a patient to the queue.
4. Within 1-2 seconds, the patient should appear on the doctor page without refreshing.
5. From the doctor page, approve a patient.
6. Within 1-2 seconds, the patient's status should update on the reception page without refreshing.

- [ ] **Step 4: Commit any final fixes**

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
git commit -m "chore: verify realtime updates typecheck" --allow-empty
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** Does every screen update every second? Reception appointments, reception bookings, doctor queue, doctor current session — all covered.
- [ ] **No placeholders:** No "TBD", "TODO", or vague instructions remain.
- [ ] **Type consistency:** `fetchBookings`, `fetchTodayBookings`, `fetchQueue`, `refreshCurrentVisit` are referenced with correct dependency arrays.
- [ ] **Cleanup safety:** Both pages use `channel.unsubscribe()` on cleanup; doctor page no longer calls `supabase.removeChannel` on a non-Realtime object.
- [ ] **Race safety:** `refreshCurrentVisit` reads `currentVisit.id` from closure and does not mutate React state outside the callbacks. Multiple rapid calls are harmless because they set state independently.
