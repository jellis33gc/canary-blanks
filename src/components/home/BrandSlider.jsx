import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

export default function BrandSlider() {
  const { data: brands = [] } = useQuery({
    queryKey: ["brands-active"],
    queryFn: () => base44.entities.Brand.filter({ is_active: true }, "sort_order"),
  });

  const [paused, setPaused] = useState(false);

  if (brands.length === 0) return null;

  return (
    <div
      className="bg-white border-y border-border py-6 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex gap-12 w-max"
        style={{ animation: `scroll 40s linear infinite`, animationPlayState: paused ? 'paused' : 'running' }}
      >
        {[...brands, ...brands].map((brand, i) => (
          <Link key={i} to={`/shop?brand=${brand.id}`} className="flex items-center justify-center h-12 px-4 cursor-pointer">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} className="h-10 w-auto object-contain grayscale hover:grayscale-0 transition-all" />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">{brand.name}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}