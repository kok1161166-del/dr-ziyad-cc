import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Image, Camera, Loader2, X, Upload, Sparkles, CheckCircle2, Trash2, ImagePlus,
} from "lucide-react";
import {
  getVisitPhotosForPatient, createVisitPhoto, deleteVisitPhoto,
  searchPatients,
} from "@/lib/db";

interface DbVisitPhoto {
  id?: number;
  visit_id?: number | null;
  patient_id: number;
  photo_type: "before" | "after";
  cloudinary_url: string;
  cloudinary_public_id: string;
  notes?: string | null;
  created_at?: string;
}

export default function PatientPhotoPage() {
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const patientIdParam = params.get("patient");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [patientId, setPatientId] = useState<number | null>(
    patientIdParam ? Number(patientIdParam) : null
  );
  const [patientCode, setPatientCode] = useState("");
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [photos, setPhotos] = useState<DbVisitPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null);

  const loadPhotos = useCallback(async (pid: number) => {
    setLoading(true);
    try {
      const data = await getVisitPhotosForPatient(pid);
      setPhotos(data);
    } catch {
      toast({ title: "خطأ", description: "فشل تحميل الصور", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (patientId) {
      loadPhotos(patientId);
    } else {
      setLoading(false);
    }
  }, [patientId, loadPhotos]);

  const handleSearchPatient = useCallback(async () => {
    if (!patientCode.trim()) return;
    setPatientSearchLoading(true);
    try {
      const results = await searchPatients(patientCode.trim());
      if (results.length > 0) {
        const patient = results[0];
        setPatientId(patient.id);
      } else {
        toast({ title: "خطأ", description: "لم يتم العثور على مريض بهذه البيانات", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل البحث", variant: "destructive" });
    } finally {
      setPatientSearchLoading(false);
    }
  }, [patientCode, toast]);

  const handleUpload = useCallback(async (imageData?: string) => {
    const dataToUpload = imageData || preview;
    if (!patientId || !dataToUpload) return;
    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: dataToUpload,
          folder: `clinic/patient_${patientId}`,
        }),
      });
      if (!res.ok) throw new Error("فشل رفع الصورة");
      const { url, public_id } = await res.json();
      const saved = await createVisitPhoto({
        patient_id: patientId,
        photo_type: "after",
        cloudinary_url: url,
        cloudinary_public_id: public_id,
        notes: notes || null,
      });
      const newPhoto: DbVisitPhoto = {
        id: saved?.id || Date.now(),
        patient_id: patientId,
        photo_type: "after",
        cloudinary_url: url,
        cloudinary_public_id: public_id,
        notes: notes || null,
        created_at: new Date().toISOString(),
      };
      setPhotos(prev => [newPhoto, ...prev]);
      setPreview(null);
      setNotes("");
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
      toast({ title: "✅ تم بنجاح", description: "تم رفع الصورة للمعرض" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err?.message || "فشل الرفع", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [patientId, preview, notes, toast]);

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file || !patientId) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.onerror = () => {
      toast({ title: "خطأ", description: "فشل قراءة الملف", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  }, [patientId, toast]);

  // Start camera stream directly in browser
  const startCamera = useCallback(async () => {
    setShowCamera(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStreamRef(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch {
      toast({ title: "خطأ", description: "لا يمكن الوصول للكاميرا. تأكد من إعطاء الصلاحيات.", variant: "destructive" });
      setShowCamera(false);
    }
  }, [facingMode, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef) {
      streamRef.getTracks().forEach(t => t.stop());
      setStreamRef(null);
    }
    setShowCamera(false);
    setCameraReady(false);
  }, [streamRef]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const switchCamera = useCallback(async () => {
    if (streamRef) {
      streamRef.getTracks().forEach(t => t.stop());
    }
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStreamRef(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast({ title: "خطأ", description: "فشل تبديل الكاميرا", variant: "destructive" });
    }
  }, [streamRef, facingMode, toast]);

  // Use native camera input (for mobile)
  const handleNativeCamera = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, []);

  const handleDelete = useCallback(async (photo: DbVisitPhoto) => {
    if (!confirm("هل أنت متأكد من حذف الصورة؟")) return;
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    try {
      await fetch(`/api/upload/${photo.cloudinary_public_id}`, { method: "DELETE" });
      await deleteVisitPhoto(photo.id!);
      toast({ title: "تم", description: "تم حذف الصورة" });
    } catch {
      toast({ title: "خطأ", description: "فشل حذف الصورة", variant: "destructive" });
      if (patientId) await loadPhotos(patientId);
    }
  }, [patientId, loadPhotos, toast]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef) {
        streamRef.getTracks().forEach(t => t.stop());
      }
    };
  }, [streamRef]);

  // ---- Login Screen ----
  if (!patientId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0c4a6e 70%, #164e63 100%)"
      }}>
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="relative inline-flex">
              <div className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto shadow-2xl" style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)"
              }}>
                <Camera className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg border-2 border-white/20">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mt-5 tracking-tight">معرض الصور</h1>
            <p className="text-blue-200/70 text-sm mt-1.5">عيادة الدكتور زياد أبو دقة التجميلية</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl p-6 space-y-5" style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
          }}>
            <p className="text-center text-blue-100/60 text-sm">
              أدخل رقم الهاتف أو كود المريض للوصول لمعرض صورك
            </p>
            <input
              value={patientCode}
              onChange={e => setPatientCode(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearchPatient()}
              placeholder="رقم الهاتف أو كود المريض"
              className="w-full h-12 rounded-xl px-4 text-center text-lg font-medium outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "white",
              }}
              dir="ltr"
            />
            <button
              onClick={handleSearchPatient}
              disabled={!patientCode.trim() || patientSearchLoading}
              className="w-full h-12 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                boxShadow: "0 10px 30px -5px rgba(59,130,246,0.4)",
              }}
            >
              {patientSearchLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span>دخول</span>
              )}
            </button>
          </div>

          <p className="text-center text-blue-200/30 text-xs mt-6">
            © عيادة الدكتور زياد أبو دقة التجميلية
          </p>
        </div>
      </div>
    );
  }

  // ---- Camera Fullscreen View ----
  if (showCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="flex-1 object-cover w-full"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-8" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)"
        }}>
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {/* Close */}
            <button
              onClick={stopCamera}
              className="h-12 w-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
            >
              <X className="h-6 w-6 text-white" />
            </button>

            {/* Capture */}
            <button
              onClick={capturePhoto}
              disabled={!cameraReady}
              className="h-20 w-20 rounded-full flex items-center justify-center border-4 border-white transition-all active:scale-90 disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}
            >
              <div className="h-14 w-14 rounded-full bg-white" />
            </button>

            {/* Switch */}
            <button
              onClick={switchCamera}
              className="h-12 w-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)" }}
            >
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
                <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                <circle cx="12" cy="12" r="3" />
                <path d="m18 22-3-3 3-3" />
                <path d="m6 2 3 3-3 3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading camera overlay */}
        {!cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-white/70 text-sm">جاري تشغيل الكاميرا...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Main Gallery View ----
  return (
    <div className="min-h-screen" style={{
      background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)"
    }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-3" style={{
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => { setPatientId(null); setPatientCode(""); setPhotos([]); }}
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <svg className="h-4 w-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">معرض الصور</h1>
            <p className="text-[11px] text-blue-300/50">عيادة د. زياد أبو دقة</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium" style={{
              background: "rgba(59,130,246,0.15)",
              color: "rgb(147,197,253)",
            }}>
              <Image className="h-3.5 w-3.5" />
              {photos.length}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-6 space-y-4 mt-4">
        {/* Upload Success Banner */}
        {uploadSuccess && (
          <div className="rounded-xl p-3 flex items-center gap-3 animate-in slide-in-from-top-2" style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.25)",
          }}>
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium text-emerald-300">تم رفع الصورة بنجاح!</span>
          </div>
        )}

        {/* Upload Area */}
        <div className="rounded-2xl overflow-hidden" style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {/* Preview State */}
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full aspect-[4/3] object-cover" />
              {/* Overlay controls */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%)" }} />
              <button
                onClick={() => setPreview(null)}
                className="absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)" }}
              >
                <X className="h-5 w-5 text-white" />
              </button>

              {/* Notes + Upload at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أضف ملاحظة (اختياري)..."
                  className="w-full h-10 rounded-xl px-4 text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "white",
                  }}
                />
                <button
                  onClick={() => handleUpload()}
                  disabled={uploading}
                  className="w-full h-12 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    boxShadow: "0 10px 30px -5px rgba(59,130,246,0.4)",
                  }}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>جاري الرفع...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      <span>رفع الصورة للمعرض</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Capture Buttons */
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <ImagePlus className="h-4.5 w-4.5 text-blue-400" />
                <span className="text-sm font-medium text-white/80">إضافة صورة جديدة</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Live Camera */}
                <button
                  onClick={startCamera}
                  disabled={uploading}
                  className="rounded-2xl p-5 flex flex-col items-center gap-3 transition-all active:scale-[0.96] group"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.1) 100%)",
                    border: "1px solid rgba(59,130,246,0.2)",
                  }}
                >
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-active:scale-90" style={{
                    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                    boxShadow: "0 8px 25px -5px rgba(59,130,246,0.4)",
                  }}>
                    <Camera className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-white/90 block">تصوير مباشر</span>
                    <span className="text-[10px] text-blue-300/50 mt-0.5 block">افتح الكاميرا</span>
                  </div>
                </button>

                {/* Gallery */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-2xl p-5 flex flex-col items-center gap-3 transition-all active:scale-[0.96] group"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(34,197,94,0.1) 100%)",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}
                >
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-active:scale-90" style={{
                    background: "linear-gradient(135deg, #10b981, #22c55e)",
                    boxShadow: "0 8px 25px -5px rgba(16,185,129,0.4)",
                  }}>
                    <Image className="h-7 w-7 text-white" />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-semibold text-white/90 block">من المعرض</span>
                    <span className="text-[10px] text-emerald-300/50 mt-0.5 block">اختر صورة</span>
                  </div>
                </button>
              </div>

              {/* Quick native camera (for mobile devices) */}
              <button
                onClick={handleNativeCamera}
                disabled={uploading}
                className="w-full rounded-xl p-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Camera className="h-4 w-4 text-amber-400" />
                <span className="text-sm text-white/60">تصوير سريع (كاميرا الجهاز)</span>
              </button>
            </div>
          )}

          {/* Uploading overlay */}
          {uploading && !preview && (
            <div className="p-8 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-3 border-blue-500/30 border-t-blue-500 animate-spin" />
                <Upload className="h-6 w-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-sm font-medium text-blue-300">جاري رفع الصورة...</span>
            </div>
          )}
        </div>

        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => { handleFileSelect(e.target.files?.[0] || null); if (e.target) e.target.value = ""; }}
          disabled={uploading}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => { handleFileSelect(e.target.files?.[0] || null); if (e.target) e.target.value = ""; }}
          disabled={uploading}
        />

        {/* Gallery */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              المعرض
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-3" />
              <p className="text-sm text-white/40">جاري تحميل الصور...</p>
            </div>
          ) : photos.length === 0 ? (
            <div className="py-16 text-center rounded-2xl" style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.08)"
            }}>
              <Image className="h-14 w-14 mx-auto mb-4 text-white/10" />
              <p className="text-base font-medium text-white/30 mb-1">لا توجد صور بعد</p>
              <p className="text-sm text-white/15">التقط صورتك الأولى من الأعلى ⬆️</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="relative group rounded-xl overflow-hidden cursor-pointer transition-all active:scale-[0.96]"
                  style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="aspect-square" onClick={() => setViewPhoto(photo.cloudinary_url)}>
                    <img
                      src={photo.cloudinary_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Date overlay */}
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1" style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)"
                    }}>
                      <span className="text-[9px] text-white/70 font-medium">
                        {photo.created_at ? new Date(photo.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                  </div>
                  {/* Delete on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                    className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: "rgba(239,68,68,0.85)", backdropFilter: "blur(5px)" }}
                    title="حذف"
                  >
                    <Trash2 className="h-3 w-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] pt-4 pb-2" style={{ color: "rgba(255,255,255,0.12)" }}>
          © عيادة الدكتور زياد أبو دقة التجميلية
        </p>
      </div>

      {/* Fullscreen Photo Viewer */}
      {viewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setViewPhoto(null)}
        >
          <button
            onClick={() => setViewPhoto(null)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center z-10"
            style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)" }}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={viewPhoto}
            alt="صورة"
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
