# تصميم: قسم المتابعة والموعد القادم في الكشفية

**التاريخ:** 2026-06-28  
**المقاربة المختارة:** التوسعة البسيطة (Approach 1)  
**الحالة:** معتمدة من المستخدم

---

## 1. الهدف

إضافة قسم في شاشة الطبيب أثناء الكشفية يسمح بتحديد موعد المتابعة القادم للمريض (أسبوع، أسبوعين، شهر، شهرين، 3 أشهر، 4 أشهر، أو تاريخ يدوي)، وحفظه كحجز عادي يظهر عند السكرتيرة، وكذلك إظهار تفاصيل المشكلة والتكلفة عند الدفع.

---

## 2. تغييرات قاعدة البيانات

**ملف Migration:** `migrations/2026-06-28_add_follow_up_columns.sql`

> **تنبيه:** شغّل هذا الملف يدويًا في Supabase SQL Editor قبل تشغيل التطبيق.

### 2.1 جدول `visits`

```sql
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS next_appointment_date DATE,
  ADD COLUMN IF NOT EXISTS next_booking_id INTEGER REFERENCES bookings(id);
```

### 2.2 جدول `bookings`

```sql
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id),
  ADD COLUMN IF NOT EXISTS source_visit_id INTEGER REFERENCES visits(id),
  ADD COLUMN IF NOT EXISTS follow_up_interval TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;
```

### 2.3 ملاحظات

- `patient_id` يربط الحجز بالمريض بدل الاسم المجرد فقط.
- `source_visit_id` يحدد أي زيارة أنشأت هذا الحجز.
- `follow_up_interval` يخزن الفترة المختارة لتعرض لاحقًا في واجهة الدفع.
- تم إضافة indexes للبحث السريع.

---

## 3. تغييرات API

### 3.1 نقاط جديدة

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/appointments/:id/follow-up` | ينشئ حجز متابعة من موعد/زيارة حالية |
| GET | `/api/patients/:id/visits` | يرجع الزيارات مع `next_booking_id` و `next_appointment_date` |

### 3.2 نقاط مُعدَّلة

| Method | Endpoint | التعديل |
|--------|----------|---------|
| GET | `/api/appointments/:id` | يتضمن بيانات الزيارة المرتبطة + الحقن + الإضافات + المتابعة |
| GET | `/api/bookings` | يتضمن الحجوزات القادمة من المتابعات مع badge "متابعة طبية" |

### 3.3 Payload إنشاء المتابعة

```json
{
  "follow_up_interval": "1_month",
  "follow_up_date": "2026-07-28",
  "follow_up_notes": "مراجعة بعد الليزر",
  "booking_time": "10:00:00",
  "branch": "فرع غزة"
}
```

### 3.4 منطق إنشاء الحجز

1. احسب `follow_up_date` من `follow_up_interval` إذا لم يُرسل تاريخ يدوي.
2. أنشئ صفًا في `bookings`:
   - `patient_id` من الموعد الحالي.
   - `name` و `phone` من بيانات المريض.
   - `booking_date` = `follow_up_date`.
   - `booking_time` من الطلب أو افتراضي.
   - `service` = "متابعة طبية".
   - `notes` = `follow_up_notes`.
   - `source_visit_id` = معرّف الزيارة الحالية.
   - `follow_up_interval` = القيمة المختارة.
3. حدّث `visits`:
   - `next_appointment_date` = `follow_up_date`.
   - `next_booking_id` = معرّف الحجز الجديد.

---

## 4. واجهة الطبيب - تبويب "المتابعة"

### 4.1 الموقع

تبويب جديد في `doctor.tsx` بجانب تبويب "الحقن" باسم **"المتابعة"**.

### 4.2 المكونات

1. **جدول المتابعات السابقة**
   - يعرض المواعيد القادمة المسجلة لهذا المريض من زيارات سابقة.
   - أعمدة: التاريخ، الفترة، ملاحظات الطبيب، حالة الحجز.

2. **اختيار الموعد القادم**
   - أزرار سريعة: **أسبوع | أسبوعين | شهر | شهرين | 3 أشهر | 4 أشهر**.
   - أو **اختيار تاريخ يدوي** عبر Date Picker.

3. **ملاحظات المتابعة**
   - `Textarea` لكتابة ملاحظات الطبيب.

4. **زر "حفظ المتابعة"**
   - ينشئ الحجز ويربطه بالزيارة.

### 4.3 التصميم

- بطاقة بيضاء مع `shadow-sm` و `rounded-xl`.
- أزرار الفترات بألوان متدرجة (Tailwind).
- Date Picker من `shadcn/ui`.
- استخدام `Tabs` من `shadcn/ui`.

---

## 5. واجهة السكرتيرة - قسم الحجوزات

### 5.1 التعديلات في `reception.tsx`

- الحجوزات القادمة من المتابعات تظهر كـ **حجز عادي**.
- إضافة `Badge` بنفسجي/أخضر مكتوب عليه **"متابعة طبية"**.
- عند الضغط على "وصل" يتحول لموعد عادي.

### 5.2 البيانات المعروضة

- اسم المريض.
- تاريخ الموعد.
- سبب المتابعة (من ملاحظات الطبيب).
- الفترة المختارة (مثلاً "بعد شهر").

---

## 6. واجهة الدفع - عند العميل

### 6.1 التعديلات في `appointments.tsx` / صفحة الدفع

عند عرض موعد في حالة الدفع، تظهر البطاقات التالية:

1. **زر "اش مشكلته"**
   - يفتح `Dialog` يعرض:
     - التشخيص (`diagnosis`).
     - خطة العلاج (`treatment_plan`).
     - الوصفة الطبية (`prescription`).
     - ملاحظات الطبيب (`doctor_notes`).

2. **بطاقة التكلفة**
   - إجمالي الرسوم (`total_fee`).
   - المدفوع (`paid_amount`).
   - المتبقي (`total_fee - paid_amount`).

3. **بطاقة الموعد القادم**
   - تاريخ المتابعة.
   - الفترة (أسبوع/شهر...).
   - ملاحظات الطبيب.

### 6.2 ظهور الأزرار بعد إنهاء الكشفية

- لما الطبيب يضغط "إنهاء الكشفية"، يتم تحديث حالة الزيارة.
- عند الدفع، تظهر أزرار "تفاصيل المشكلة" و"الموعد القادم" تلقائيًا لأن البيانات أصبحت متوفرة.

---

## 7. تدفق البيانات (User Flow)

1. الطبيب يختار مريضًا من قائمة الانتظار.
2. يدخل إلى شاشة الكشفية ويفتح تبويب "المتابعة".
3. يختار فترة الموعد القادم (مثلاً "بعد شهر") أو يدخل تاريخًا يدويًا.
4. يكتب ملاحظات المتابعة.
5. يضغط "حفظ المتابعة" → ينشئ حجز في `bookings`.
6. يكمل الكشفية ويضغط "إنهاء".
7. عند الدفع، يظهر:
   - تفاصيل المشكلة.
   - التكلفة.
   - الموعد القادم.
8. السكرتيرة ترى الحجز في قسم الحجوزات.
9. لما المريض يأتي في موعد المتابعة، السكرتيرة تحول الحجز لموعد.

---

## 8. الملفات المشمولة

### Frontend

- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic/src/pages/doctor.tsx`
- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic/src/pages/reception.tsx`
- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic/src/pages/appointments.tsx`
- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/clinic/src/pages/patients/detail.tsx`

### Backend

- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/api-server/src/routes/appointments.ts`
- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/api-server/src/routes/patients.ts`
- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/artifacts/api-server/src/routes/financial.ts`

### Database

- `/mnt/c/Users/MOH/Documents/GG/dr-ziyad-cl/zip-repl/clinic_schema.sql`

---

## 9. معايير القبول

- [ ] الطبيب يمكنه فتح تبويب "المتابعة" بجانب "الحقن".
- [ ] يمكن اختيار فترة المتابعة من أزرار جاهزة (أسبوع، أسبوعين، شهر، شهرين، 3 أشهر، 4 أشهر) أو اختيار تاريخ يدوي.
- [ ] عند حفظ المتابعة، يُنشأ حجز عادي في `bookings` مرتبط بـ `patient_id` و `source_visit_id`.
- [ ] يتم تحديث `visits.next_appointment_date` و `visits.next_booking_id`.
- [ ] الحجز يظهر عند السكرتيرة في قسم الحجوزات مع شارة "متابعة طبية".
- [ ] عند الدفع، يظهر زر "اش مشكلته" يعرض التشخيص وخطة العلاج والوصفة وملاحظات الطبيب.
- [ ] عند الدفع، تظهر بطاقة التكلفة (إجمالي، مدفوع، متبقي).
- [ ] عند الدفع، تظهر بطاقة الموعد القادم مع التاريخ والفترة وملاحظات الطبيب.
- [ ] الأزرار والتفاصيل تظهر فور إنهاء الطبيب للكشفية.
- [ ] التصميم متناسق مع shadcn/ui و Tailwind CSS المستخدمين حاليًا.

---

## 10. ملاحظات التنفيذ

- استخدام `Dialog` من `shadcn/ui` لعرض تفاصيل المشكلة.
- استخدام `Badge` من `shadcn/ui` لشارة "متابعة طبية".
- استخدام `Tabs` من `shadcn/ui` لتبويب المتابعة.
- استخدام `Calendar` / `Popover` من `shadcn/ui` لاختيار التاريخ اليدوي.
- استخدام `Textarea` من `shadcn/ui` لملاحظات المتابعة.
- جميع التواريخ تُعرض بتنسيق `dd/MM/yyyy` أو حسب لغة التطبيق الحالية.
