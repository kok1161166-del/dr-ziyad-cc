import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Trash2, AlertTriangleIcon } from "lucide-react";

const FIELD_MAP: Record<string, string> = {
  "ID": "localCode",
  "Local ID": "localId",
  "Patient ar name": "nameAr",
  "Patient en name": "nameEn",
  "Age": "age",
  "Mobile no.": "mobile",
  "Phone": "phone",
  "Address": "address",
  "Email": "email",
  "Patient Nationality": "nationality",
  "Patient Bio": "bio",
  "Relative Mobile no.": "relativeMobile",
  "Relative Phone no.": "relativePhone",
  "Relative Name": "relativeName",
  "Relative Relation": "relativeRelation",
  "Martial Status": "maritalStatus",
  "Occupation": "occupation",
  "Birth Place": "birthPlace",
  "No.childs": "noChilds",
  "Governorate": "governorate",
  "City": "city",
  "Referral Provider": "referredBy",
  "Insurance Status": "insuranceStatus",
  "Husband Name": "husbandName",
  "Husband Job": "husbandJob",
  "Date of First Visit": "dateOfFirstVisit",
  "Created By": "createdBy",
  "Created At": "createdAt",
  "Patient ar name ": "nameAr",
  "Patient en name ": "nameEn",
};

function mapRow(headers: string[], row: any[]): Record<string, any> {
  const obj: Record<string, any> = {};
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.trim();
    const mappedKey = FIELD_MAP[header];
    if (mappedKey) {
      obj[mappedKey] = row[i] !== undefined ? String(row[i]).trim() : "";
    }
  }
  return obj;
}

function parseExcel(file: File): Promise<{ sheets: { name: string; data: Record<string, any>[] }[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheets = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (json.length < 2) return { name, data: [] };
          const headers = json[0].map((h: any) => String(h).trim());
          const rows = json.slice(1).map((row) => mapRow(headers, row));
          return { name, data: rows };
        });
        resolve({ sheets });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

interface RestoreImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export default function RestoreImport({ open, onOpenChange, onComplete }: RestoreImportProps) {
  const [sheets, setSheets] = useState<{ name: string; data: Record<string, any>[] }[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [result, setResult] = useState<{ imported: number; total: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await parseExcel(file);
      if (result.sheets.every((s) => s.data.length === 0)) {
        toast({ title: "خطأ", description: "لم يتم العثور على بيانات في الملف", variant: "destructive" });
        return;
      }
      setSheets(result.sheets);
      setStatus("idle");
      const all = result.sheets.flatMap(s => s.data);
      const uniqueIds = new Set(all.map(r => r.localCode || r.localId).filter(Boolean));
      toast({ title: "تم القراءة", description: `تم قراءة ${result.sheets.length} جداول | ${uniqueIds.size} مريض فريد (بعد الدمج حسب ID)` });
    } catch (err) {
      toast({ title: "خطأ", description: "فشل في قراءة الملف", variant: "destructive" });
    }
  };

  function mergeSheets(): Record<string, any>[] {
    const merged = new Map<string, Record<string, any>>();
    for (const sheet of sheets) {
      for (const row of sheet.data) {
        const key = row.localCode || row.localId || `__no_id_${Math.random()}`;
        if (merged.has(key)) {
          const existing = merged.get(key)!;
          for (const [k, v] of Object.entries(row)) {
            if (v && v !== "لا يوجد" && v !== "" && !existing[k]) {
              existing[k] = v;
            }
          }
        } else {
          merged.set(key, { ...row });
        }
      }
    }
    return Array.from(merged.values());
  }

  const startImport = async () => {
    const mergedPatients = mergeSheets();
    if (mergedPatients.length === 0) return;
    setImporting(true);
    setStatus("importing");
    setProgress(0);

    try {
      const total = mergedPatients.length;
      const batchSize = 500;
      let imported = 0;
      let errorCount = 0;

      for (let i = 0; i < total; i += batchSize) {
        const batch = mergedPatients.slice(i, i + batchSize);
        const res = await fetch("/api/patients/bulk-import", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ patients: batch, batchSize }),
        });
        const bodyText = await res.text();
        let data: any;
        try {
          data = JSON.parse(bodyText);
        } catch {
          throw new Error(`الخادم أعاد استجابة غير متوقعة (${res.status}): ${bodyText.slice(0, 200)}`);
        }
        if (!res.ok) throw new Error(data.error || "فشل الاستيراد");
        imported += data.imported || 0;
        errorCount += data.errors || 0;
        setProgress(Math.min((i + batchSize) / total * 100, 100));
      }

      setResult({ imported, total, errors: errorCount });
      setStatus("done");
      setProgress(100);
      toast({ title: "اكتمل الاستيراد", description: `تم استيراد ${imported} من ${total} مريض` });
      onComplete();
    } catch (err: any) {
      setStatus("error");
      toast({ title: "خطأ", description: err.message || "فشل الاستيراد", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setSheets([]);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const totalPatients = mergeSheets().length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>استرداد قائمة المرضى</DialogTitle>
          <DialogDescription>رفع ملف Excel لاستيراد المرضى. يدعم عدة صفحات و 500 سجل لكل دفعة.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
              id="excel-upload"
            />
            <Button variant="outline" className="gap-2" disabled={importing} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              اختر ملف Excel
            </Button>
            {sheets.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {sheets.length} جداول | {totalPatients} مريض
              </span>
            )}
          </div>

          {sheets.length > 0 && (
            <div className="space-y-6">
              {sheets.map((sheet, si) => (
                <div key={si}>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    الصفحة {si + 1}: {sheet.name}
                    <span className="text-sm text-muted-foreground">({sheet.data.length} مريض)</span>
                  </h3>
                  <div className="border rounded-md overflow-auto max-h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          {sheet.data[0] && Object.keys(sheet.data[0]).map((key) => (
                            <TableHead key={key} className="text-xs">{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sheet.data.slice(0, 10).map((row, ri) => (
                          <TableRow key={ri}>
                            <TableCell className="text-xs text-muted-foreground">{ri + 1}</TableCell>
                            {Object.values(row).map((val: any, ci) => (
                              <TableCell key={ci} className="text-xs max-w-[150px] truncate">{val || "-"}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                        {sheet.data.length > 10 && (
                          <TableRow>
                            <TableCell colSpan={Object.keys(sheet.data[0]).length + 1} className="text-center text-xs text-muted-foreground">
                              ... و {sheet.data.length - 10} سجل آخر
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}

              <div className="space-y-2">
                {importing && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>جاري الاستيراد...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
                <div className="flex gap-2">
                  {status === "idle" && (
                    <Button onClick={startImport} className="gap-2" disabled={importing || totalPatients === 0}>
                      {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      بدء الاستيراد
                    </Button>
                  )}
                  {(status === "done" || status === "error") && (
                    <div className="flex items-center gap-4 w-full">
                      {status === "done" ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>تم استيراد {result?.imported} من {result?.total}</span>
                          {result && result.errors > 0 && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-4 w-4" />
                              {result.errors} أخطاء
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle className="h-5 w-5" />
                          <span>فشل الاستيراد</span>
                        </div>
                      )}
                      <Button variant="outline" onClick={reset}>
                        استيراد ملف آخر
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-red-600 flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4" />
            منطقة خطرة
          </h3>
          <DeleteAllPatients onComplete={onComplete} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAllPatients({ onComplete }: { onComplete: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirm !== "حذف") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/patients/all", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      toast({ title: "تم الحذف", description: `تم حذف ${data.count || 0} مريض` });
      setShowConfirm(false);
      setConfirm("");
      onComplete();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <Button variant="destructive" size="sm" className="gap-2" onClick={() => setShowConfirm(true)}>
        <Trash2 className="h-4 w-4" />
        حذف جميع المرضى
      </Button>
    );
  }

  return (
    <div className="space-y-2 p-3 border border-red-200 rounded-lg bg-red-50">
      <p className="text-xs text-red-700">هذا الإجراء لا يمكن التراجع عنه. اكتب "حذف" للتأكيد:</p>
      <div className="flex gap-2">
        <Input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="اكتب حذف"
          className="max-w-[150px]"
          disabled={deleting}
        />
        <Button variant="destructive" size="sm" disabled={confirm !== "حذف" || deleting} onClick={handleDelete}>
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          تأكيد الحذف
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setShowConfirm(false); setConfirm(""); }} disabled={deleting}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}
