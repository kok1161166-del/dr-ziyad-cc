import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Image as ImageIcon, Sparkles } from "lucide-react";
import { supabase } from "@/lib/db";

export default function SharedPhotoPage() {
  const params = new URLSearchParams(window.location.search);
  const photoId = params.get("id");

  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPhoto() {
      if (!photoId) {
        setError("لم يتم العثور على الصورة. الرابط غير صحيح.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from("visit_photos")
          .select("cloudinary_url")
          .eq("id", photoId)
          .single();

        if (dbError || !data) {
          setError("لم يتم العثور على الصورة. قد تكون حذفت أو الرابط غير صحيح.");
        } else {
          setPhotoUrl(data.cloudinary_url);
        }
      } catch (err) {
        setError("حدث خطأ أثناء تحميل الصورة.");
      } finally {
        setLoading(false);
      }
    }

    loadPhoto();
  }, [photoId]);

  const handleDownload = async () => {
    if (!photoUrl) return;
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `photo_${photoId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading image:", err);
      // Fallback for CORS issues
      window.open(photoUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-rose-50 dark:from-gray-950 dark:to-gray-900">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !photoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-rose-50 dark:from-gray-950 dark:to-gray-900">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-red-500">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">عذراً</h2>
            <p className="text-gray-500 dark:text-gray-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0c4a6e 70%, #164e63 100%)"
    }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto shadow-2xl" style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)"
            }}>
              <ImageIcon className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-400 flex items-center justify-center shadow-lg border-2 border-white/20">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">صورة مشاركة</h1>
          <p className="text-blue-200/70 text-sm mt-1">عيادة الدكتور زياد أبو دقة التجميلية</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-4 overflow-hidden" style={{
          background: "rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
        }}>
          <div className="rounded-xl overflow-hidden mb-4 shadow-inner bg-black/20">
             <img src={photoUrl} alt="Shared Photo" className="w-full max-h-[60vh] object-contain mx-auto" />
          </div>
          
          <button
            onClick={handleDownload}
            className="w-full h-14 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              boxShadow: "0 10px 30px -5px rgba(59,130,246,0.4)",
            }}
          >
            <Download className="h-6 w-6" />
            <span>تحميل الصورة</span>
          </button>
        </div>

        <p className="text-center text-blue-200/30 text-xs mt-6">
          © عيادة الدكتور زياد أبو دقة التجميلية
        </p>
      </div>
    </div>
  );
}
