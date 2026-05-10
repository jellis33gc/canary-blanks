import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const AUTOPLAY_INTERVAL = 5000;

const ACCENT_MAP = {
  "from-pink-400 via-rose-400 to-fuchsia-500": "bg-white text-rose-500",
  "from-amber-400 via-orange-400 to-yellow-400": "bg-white text-amber-600",
  "from-violet-500 via-purple-500 to-fuchsia-400": "bg-white text-violet-600",
  "from-teal-400 via-emerald-400 to-cyan-400": "bg-white text-teal-600",
  "from-blue-400 via-sky-400 to-cyan-400": "bg-white text-blue-600",
  "from-red-400 via-rose-500 to-pink-500": "bg-white text-red-600",
};

const EMOJI_POSITIONS = [
  "top-8 left-8 text-8xl",
  "top-16 right-16 text-6xl",
  "bottom-8 left-1/4 text-5xl",
  "bottom-16 right-1/3 text-7xl",
];

export default function HeroSlider() {
  const [slides, setSlides] = useState([]);
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    base44.entities.HeroSlide.filter({ is_active: true }, "sort_order").then(s => {
      if (s.length > 0) setSlides(s);
    }).catch(() => {});
  }, []);

  const goTo = useCallback((index, dir) => {
    setDirection(dir ?? (index > current ? 1 : -1));
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => {
    if (slides.length === 0) return;
    goTo((current + 1) % slides.length, 1);
  }, [current, slides.length, goTo]);

  const prev = useCallback(() => {
    if (slides.length === 0) return;
    goTo((current - 1 + slides.length) % slides.length, -1);
  }, [current, slides.length, goTo]);

  useEffect(() => {
    if (paused || slides.length === 0) return;
    const timer = setInterval(next, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [next, paused, slides.length]);

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] } },
    exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] } }),
  };

  if (slides.length === 0) return null;

  const slide = slides[current];
  const emojis = (slide.emoji || "").split(" ").filter(Boolean).slice(0, 4);
  const accentColor = ACCENT_MAP[slide.bg] || "bg-white text-primary";

  return (
    <section
      className="relative overflow-hidden"
      style={{ minHeight: "clamp(420px, 55vw, 640px)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          className={`absolute inset-0 text-white ${slide.bg_image ? "" : `bg-gradient-to-br ${slide.bg}`}`}
        >
          {/* Background image (if set) */}
          {slide.bg_image && (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.bg_image})` }}
            />
          )}

          {/* Overlay: darker when image, lighter when gradient */}
          <div className={`absolute inset-0 pointer-events-none ${slide.bg_image ? "bg-black/25" : "bg-black/10"}`} />

          {/* Floating emoji decorations (only shown when no image) */}
          {!slide.bg_image && (
            <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
              {emojis.map((em, i) => (
                <div key={i} className={`absolute ${EMOJI_POSITIONS[i]}`}>{em}</div>
              ))}
            </div>
          )}

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="max-w-2xl"
            >
              {slide.badge && (
                <span className={`inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-5 shadow-md ${slide.bg_image ? "bg-white/20 backdrop-blur-sm text-white" : accentColor}`}>
                  {slide.badge}
                </span>
              )}
              <h1 className="font-brand text-5xl md:text-7xl mb-4 leading-tight drop-shadow-lg whitespace-pre-line">
                {slide.title}
              </h1>
              {slide.subtitle && (
                <p className="text-lg md:text-xl mb-8 opacity-90 font-medium max-w-xl drop-shadow">
                  {slide.subtitle}
                </p>
              )}
              <div className="flex flex-wrap gap-4">
                {slide.cta_label && slide.cta_url && (
                  <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold rounded-full px-8 shadow-lg">
                    <Link to={slide.cta_url}>{slide.cta_label} <ArrowRight className="ml-1 w-4 h-4" /></Link>
                  </Button>
                )}
                {slide.cta2_label && slide.cta2_url && (
                  <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20 font-bold rounded-full px-8">
                    <Link to={slide.cta2_url}>{slide.cta2_label}</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full transition-all text-white shadow" aria-label="Previous slide">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full transition-all text-white shadow" aria-label="Next slide">
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"}`} aria-label={`Go to slide ${i + 1}`} />
        ))}
      </div>

      {!paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-20 overflow-hidden">
          <motion.div key={current} className="h-full bg-white/70" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: "linear" }} />
        </div>
      )}
    </section>
  );
}