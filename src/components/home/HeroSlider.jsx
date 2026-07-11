import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const AUTOPLAY_INTERVAL = 5000;

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

  // Parallax: bg moves at 30% extra offset creating depth
  const bgVariants = {
    enter: (dir) => ({ x: dir > 0 ? "130%" : "-130%" }),
    center: { x: "0%", transition: { duration: 0.75, ease: [0.32, 0.72, 0, 1] } },
    exit: (dir) => ({ x: dir > 0 ? "-130%" : "130%", transition: { duration: 0.65, ease: [0.32, 0.72, 0, 1] } }),
  };
  const contentVariants = {
    enter: (dir) => ({ x: dir > 0 ? "60%" : "-60%", opacity: 0 }),
    center: { x: "0%", opacity: 1, transition: { duration: 0.65, ease: [0.32, 0.72, 0, 1] } },
    exit: (dir) => ({ x: dir > 0 ? "-60%" : "60%", opacity: 0, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] } }),
  };

  const DefaultHero = () => (
    <section className="relative overflow-hidden min-h-[520px] gradient-hero flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-5 bg-primary/15 text-primary">Sublimation Blanks & Craft Supplies</span>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4">
              <span className="text-foreground block">Premium</span>
              <span className="text-primary block">Sublimation</span>
              <span className="text-primary block">Blanks</span>
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              Your one-stop shop for high-quality sublimation blanks, heat-press supplies, and craft essentials. Bring your designs to life.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-full px-8">
                <Link to="/shop">Shop Now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary/20 font-bold rounded-full px-8">
                <Link to="/shop">Browse Categories</Link>
              </Button>
            </div>
          </motion.div>
          <div className="flex justify-center">
            <div className="w-72 h-72 md:w-80 md:h-80 rounded-full bg-secondary shadow-xl flex flex-col items-center justify-center gap-3 border border-border">
              <span className="text-6xl">🖨️</span>
              <p className="font-bold text-primary text-lg">Print-Ready Quality</p>
              <p className="text-muted-foreground text-sm">Crafted for Creatives</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  if (slides.length === 0) return <DefaultHero />;

  const slide = slides[current];

  return (
    <section
      className="relative overflow-hidden flex items-center min-h-[520px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slide.bg_image ? (
        <img src={slide.bg_image} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${slide.bg || "from-pink-400 via-rose-400 to-fuchsia-500"}`} />
      )}
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Content layer */}
      <div className="relative z-10 w-full">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={`content-${slide.id}`}
            custom={direction}
            variants={contentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                {slide.badge && (
                  <span className="inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-5 bg-white/20 text-white backdrop-blur-sm">
                    {slide.badge}
                  </span>
                )}
                <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-4">
                  {(slide.title || "").split("\n").map((line, i) => (
                    <span key={i} className="text-white block drop-shadow-md">{line}</span>
                  ))}
                </h1>
                {slide.subtitle && (
                  <p className="text-white/90 text-lg mb-8 max-w-md drop-shadow">{slide.subtitle}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  {slide.cta_label && slide.cta_url && (
                    <Button asChild size="lg" className="bg-white text-secondary hover:bg-white/90 font-bold rounded-full px-8 shadow-lg">
                      <Link to={slide.cta_url}>{slide.cta_label}</Link>
                    </Button>
                  )}
                  {slide.cta2_label && slide.cta2_url && (
                    <Button asChild size="lg" className="bg-white/20 border border-white text-white hover:bg-white/30 font-bold rounded-full px-8 backdrop-blur-sm">
                      <Link to={slide.cta2_url}>{slide.cta2_label}</Link>
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                {slide.bg_image ? null : (
                  <div className="w-64 h-64 md:w-72 md:h-72 rounded-full bg-white/20 backdrop-blur-sm shadow-xl flex flex-col items-center justify-center gap-3 border border-white/30">
                    <span className="text-6xl">{(slide.emoji || "").split(" ")[0] || "🎂"}</span>
                    <p className="font-bold text-white text-lg drop-shadow">Handcrafted Quality</p>
                    <p className="text-white/80 text-sm">Made with Love</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/80 hover:bg-white rounded-full shadow transition-all" aria-label="Previous slide">
            <ChevronLeft className="w-5 h-5 text-primary" />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/80 hover:bg-white rounded-full shadow transition-all" aria-label="Next slide">
            <ChevronRight className="w-5 h-5 text-primary" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, i) => (
              <button key={i} onClick={() => goTo(i)} className={`h-2 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}