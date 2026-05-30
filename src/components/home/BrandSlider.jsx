import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function BrandSlider() {
  const { data: brands = [] } = useQuery({
    queryKey: ["brands-active"],
    queryFn: () => base44.entities.Brand.filter({ is_active: true }, "sort_order"),
  });

  if (brands.length === 0) return null;

  return (
    <div className="bg-white border-y border-border py-6 overflow-hidden">
      <div className="flex animate-[scroll_20s_linear_infinite] gap-12 w-max">
        {[...brands, ...brands].map((brand, i) => (
          <div key={i} className="flex items-center justify-center h-12 px-4">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} className="h-10 w-auto object-contain grayscale hover:grayscale-0 transition-all" />
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">{brand.name}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}