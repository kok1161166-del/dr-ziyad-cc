# Review: Real-time updates for secretary/reception and doctor pages

**Verdict:** NEEDS_FIXES

The implementation matches the plan structurally and type-checks cleanly, but two introduced behaviours cause real user-facing regressions: bookings list flickers on every poll tick on the reception page, and the doctor page polling callback can overwrite in-progress edits before they are auto-saved.

---

## Issues

### 1. Reception bookings list flickers every second because `fetchBookings` shows loading state on every poll

- **File:** `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic/src/pages/reception.tsx`
- **Lines:** `330` (definition), `382` (polling callback usage)
- **Description:** `fetchBookings` calls `setBookingsLoading(true)` at the start and `setBookingsLoading(false)` at the end. The polling callback calls it without a `silent` flag every 1000 ms, so while the secretary is on the bookings tab the list is replaced by skeleton placeholders on every tick. `fetchAppointments(true)` already avoids this, but bookings does not.
- **Suggested fix:** Add an optional `silent` parameter to `fetchBookings`, mirroring `fetchAppointments`, and pass `true` from the polling callback:

```tsx
const fetchBookings = useCallback(async (silent = false) => {
  if (!silent) setBookingsLoading(true);
  try {
    // ... existing logic ...
    setBookings(data);
  } catch {
    setBookings([]);
  } finally {
    if (!silent) setBookingsLoading(false);
  }
}, [bookingFilter]);
```

Then in the subscription effect (`line 380`):

```tsx
const channel = subscribeToAppointments(() => {
  fetchAppointments(true);
  fetchBookings(true);
  fetchTodayBookings();
});
```

### 2. Doctor polling callback overwrites in-progress form edits before auto-save persists them

- **File:** `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic/src/pages/doctor.tsx`
- **Lines:** `351-356` inside `refreshCurrentVisit` (`line 347`)
- **Description:** `refreshCurrentVisit` unconditionally sets `diagnosis`, `treatmentPlan`, `notes`, and `prescription` from the database on every poll tick. Auto-save is debounced to 1500 ms. If the doctor keeps typing without a 1.5 s pause, polls every 1 s will clobber the local text with stale database values before the auto-save can fire, causing visible cursor jumps and potential data loss.
- **Suggested fix:** Do not overwrite the active form fields from the poll callback. Refresh only the visit metadata and the related records (injections, laser sessions, addons). The existing mount effect (`lines 401-406`) already loads the initial form values when a session is first opened. Remove or guard the four `setDiagnosis`/`setTreatmentPlan`/`setNotes`/`setPrescription` calls inside `refreshCurrentVisit`. If cross-device freshness is required, track a dirty flag and skip the overwrite while the form is dirty.

### 3. `refreshCurrentVisit` fetches related logs using a stale closure visit ID

- **File:** `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic/src/pages/doctor.tsx`
- **Lines:** `358-362`
- **Description:** After fetching `existing` and calling `setCurrentVisit(existing)`, the function continues to use the closure-captured `currentVisit.id` to load injection/laser/addon logs. If the appointment were ever associated with a different visit ID, the logs would be loaded from the old visit while the state is updated to the new one.
- **Suggested fix:** Use the freshly fetched visit's ID for the related fetches:

```tsx
if (existing) {
  setCurrentVisit(existing as VisitWithData);
  // ... optional: guarded form-field updates ...
}
const visitId = (existing as VisitWithData | null)?.id ?? currentVisit?.id;
if (!visitId) return;
const [inj, las, add] = await Promise.all([
  getInjectionLogs(visitId),
  getLaserLogs(visitId),
  getSessionAddons(visitId),
]);
```

### 4. Missing tests for the new realtime polling behaviour

- **File:** project-wide
- **Description:** There are no test files in the repository. The new 1-second polling, the reception multi-fetch callback, the doctor `refreshCurrentVisit` callback, and the `channel.unsubscribe()` cleanups are all uncovered. Manual browser smoke tests are described in the plan but not automated.
- **Suggested fix:** Add at least minimal unit tests for `callWithRefresh`/`subscribeToAppointments` ( verifying interval timing and `unsubscribe()` ) and for the two page effects ( verifying the correct fetch functions are called on each poll tick and that cleanup calls `unsubscribe()` ).

---

## Verification evidence

### TypeScript typecheck

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic
npx tsc --noEmit -p tsconfig.json
```

Output: (no output, exit 0) — no type errors in `db.ts`, `reception.tsx`, or `doctor.tsx`.

Additional root-level build check:

```bash
cd /mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl
npx tsc --build
```

Output: (no output, exit 0).

Note: `pnpm run typecheck` could not be executed because `pnpm` is not installed in this environment. The required direct `npx tsc` checks passed.

### Git log and diff summary

```bash
git diff --stat HEAD~4..HEAD
```

```
 artifacts/clinic/src/lib/db.ts           |  467 +++++
 artifacts/clinic/src/pages/doctor.tsx    | 2760 ++++++++++++++++++++++++++++++
 artifacts/clinic/src/pages/reception.tsx | 2585 ++++++++++++++++++++++++++++
 3 files changed, 5812 insertions(+)
```

```bash
git log --oneline -5
```

```
ab38c2e fix: move fetchTodayBookings before first use to resolve TDZ error
1204e28 feat: refresh queue and session every second on doctor page
b83764c feat: refresh appointments and bookings every second on reception page
2cdf739 feat: poll realtime subscriptions every 1 second
e7f9470 Replace database queries with Supabase client library for data operations
```

### Plan coverage check

| Plan requirement | Status | Notes |
|---|---|---|
| `callWithRefresh` polls every 1000 ms | OK | `REALTIME_POLL_INTERVAL_MS = 1000` in `db.ts` |
| Reception refreshes queue + bookings (filtered + today) on poll | OK | All three called in callback (`reception.tsx:381-383`) |
| Doctor refreshes queue + current visit/session on poll | OK | `fetchQueue(true)` and conditional `refreshCurrentVisit()` (`doctor.tsx:482-486`) |
| Effect cleanup uses `channel.unsubscribe()` | OK | Both pages (`reception.tsx:385-387`, `doctor.tsx:488-490`) |
| Reception type-checks | OK | `tsc` passed |
| Doctor type-checks | OK | `tsc` passed |
| No infinite loops / missing deps | OK | Dependency arrays include the memoised callbacks |

The remaining concerns are the functional regressions listed above.
