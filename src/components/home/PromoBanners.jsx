import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const styleMap = {
  pink:   "from-pink-400 via-rose-400 to-pink-500 text-white",
  yellow: "from-yellow-300 via-amber-300 to-yellow-400 text-yellow-900",
  purple: "from-purple-400 via-violet-500 to-purple-600 text-white",
  mint:   "from-emerald-300 via-teal-400 to-emerald-500 text-white",
  dark:   "from-slate-700 via-slate-800 to-slate-900 text-white",
};

const ctaStyleMap = {
  pink:   "bg-white text-pink-500 hover:bg-white/90",
  yellow: "bg-yellow-900 text-yellow-100 hover:bg-yellow-800",
  purple: "bg-white text-purple-600 hover:bg-white/90",
  mint:   "bg-white text-emerald-600 hover:bg-white/90",
  dark:   "bg-white text-slate-800 hover:bg-white/90",
};

export default function PromoBanners() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    base44.entities.PromoBanner.filter({ is_active: true }, "sort_order", 10).then(all => {
      const live = all.filter(b => {
        if (b.starts_at && b.starts_at > today) return false;
        if (b.ends_at && b.ends_at < today) return false;
        return true;
      });
      setBanners(live);
    }).catch(() => {});
  }, []);

  const visible = banners.filter(b => !dismissed.has(b.id));

  if (visible.length === 0) return null;

  const idx = Math.min(current, visible.length - 1);
  const banner = visible[idx];
  const style = banner.style || "pink";

  return (
    <section className={`relative bg-gradient-to-r ${styleMap[style]} py-4 px-4`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Prev arrow */}
        {visible.length > 1 && (
          <button onClick={() => setCurrent((idx - 1 + visible.length) % visible.length)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-center sm:text-left"
          >
            {banner.emoji && <span className="text-2xl">{banner.emoji}</span>}
            <div>
              {banner.badge_text && (
                <span className="inline-block text-xs font-bold uppercase tracking-widest bg-white/20 rounded-full px-2 py-0.5 mb-1 mr-2">
                  {banner.badge_text}
                </span>
              )}
              <span className="font-bold text-sm sm:text-base">{banner.title}</span>
              {banner.subtitle && <span className="text-sm opacity-80 ml-2 hidden sm:inline">{banner.subtitle}</span>}
            </div>
            {banner.cta_label && banner.cta_url && (
              <Button asChild size="sm" className={`rounded-full font-bold shrink-0 ${ctaStyleMap[style]}`}>
                <Link to={banner.cta_url}>{banner.cta_label}</Link>
              </Button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Next arrow */}
        {visible.length > 1 && (
          <button onClick={() => setCurrent((idx + 1) % visible.length)} className="shrink-0 opacity-70 hover:opacity-100 transition-opacity">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Dismiss */}
        <button onClick={() => { setDismissed(new Set([...dismissed, banner.id])); setCurrent(0); }} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dots */}
      {visible.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-2">
          {visible.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-white scale-125' : 'bg-white/40'}`} />
          ))}
        </div>
      )}
    </section>
  );
}