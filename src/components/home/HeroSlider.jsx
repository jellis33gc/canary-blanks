import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    id: 1,
    badge: "🌸 Spring Collection",
    title: "Bake Magic\nHappen!",
    subtitle: "Custom cakes, toppers, decorations & everything you need to create your perfect celebration",
    cta: { label: "Shop Now", to: "/shop" },
    cta2: { label: "Custom Cakes", to: "/shop?category=custom-cakes" },
    bg: "from-pink-400 via-rose-400 to-fuchsia-500",
    emoji: ["🎂", "🧁", "🎀", "🍰"],
    emojiPositions: [
      "top-8 left-8 text-8xl",
      "top-16 right-16 text-6xl",
      "bottom-8 left-1/4 text-5xl",
      "bottom-16 right-1/3 text-7xl",
    ],
    accentColor: "bg-white text-rose-500",
  },
  {
    id: 2,
    badge: "🔥 Summer Sale",
    title: "Up to 30% Off\nSeasonal Picks!",
    subtitle: "Grab our hottest deals on cake decorations, toppers and baking supplies before they're gone",
    cta: { label: "Shop the Sale", to: "/shop?sale=true" },
    cta2: { label: "View All", to: "/shop" },
    bg: "from-amber-400 via-orange-400 to-yellow-400",
    emoji: ["☀️", "🎉", "🍋", "🌻"],
    emojiPositions: [
      "top-8 right-10 text-8xl",
      "top-20 left-16 text-6xl",
      "bottom-10 right-1/4 text-5xl",
      "bottom-16 left-1/3 text-7xl",
    ],
    accentColor: "bg-white text-amber-600",
  },
  {
    id: 3,
    badge: "🎂 New Arrivals",
    title: "Fresh Cake\nDecorations In!",
    subtitle: "Discover the latest cake toppers, fondant tools and stunning edible decorations just added to our collection",
    cta: { label: "See What's New", to: "/shop?featured=true" },
    cta2: { label: "All Decorations", to: "/shop" },
    bg: "from-violet-500 via-purple-500 to-fuchsia-400",
    emoji: ["✨", "🌟", "🎊", "💜"],
    emojiPositions: [
      "top-10 left-1/3 text-8xl",
      "top-16 right-8 text-6xl",
      "bottom-12 left-8 text-5xl",
      "bottom-8 right-1/4 text-7xl",
    ],
    accentColor: "bg-white text-violet-600",
  },
  {
    id: 4,
    badge: "🏆 Loyalty Rewards",
    title: "Earn Points\non Every Order!",
    subtitle: "Join our Sweet Rewards programme. Earn 1 point per £1 spent and redeem them for exclusive discounts",
    cta: { label: "Join Rewards", to: "/account" },
    cta2: { label: "Shop & Earn", to: "/shop" },
    bg: "from-teal-400 via-emerald-400 to-cyan-400",
    emoji: ["🏆", "💎", "🎁", "🌈"],
    emojiPositions: [
      "top-12 right-12 text-8xl",
      "top-8 left-20 text-6xl",
      "bottom-10 right-1/3 text-5xl",
      "bottom-6 left-1/4 text-7xl",
    ],
    accentColor: "bg-white text-teal-600",
  },
];

const AUTOPLAY_INTERVAL = 5000;

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index, dir) => {
    setDirection(dir ?? (index > current ? 1 : -1));
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => goTo((current + 1) % slides.length, 1), [current, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length, -1), [current, goTo]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [next, paused]);

  const slide = slides[current];

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] } },
    exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] } }),
  };

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
          className={`absolute inset-0 bg-gradient-to-br ${slide.bg} text-white`}
        >
          {/* Floating emoji decorations */}
          <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
            {slide.emoji.map((em, i) => (
              <div key={i} className={`absolute ${slide.emojiPositions[i]}`}>{em}</div>
            ))}
          </div>

          {/* Soft radial glow */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center py-16 md:py-24">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="max-w-2xl"
            >
              {/* Badge */}
              <span className={`inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-5 shadow-md ${slide.accentColor}`}>
                {slide.badge}
              </span>

              {/* Headline */}
              <h1 className="font-brand text-5xl md:text-7xl mb-4 leading-tight drop-shadow-lg whitespace-pre-line">
                {slide.title}
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl mb-8 opacity-90 font-medium max-w-xl">
                {slide.subtitle}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold rounded-full px-8 shadow-lg">
                  <Link to={slide.cta.to}>{slide.cta.label} <ArrowRight className="ml-1 w-4 h-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/20 font-bold rounded-full px-8">
                  <Link to={slide.cta2.to}>{slide.cta2.label}</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full transition-all text-white shadow"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full transition-all text-white shadow"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"}`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Progress bar */}
      {!paused && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20 z-20 overflow-hidden">
          <motion.div
            key={current}
            className="h-full bg-white/70"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: AUTOPLAY_INTERVAL / 1000, ease: "linear" }}
          />
        </div>
      )}
    </section>
  );
}