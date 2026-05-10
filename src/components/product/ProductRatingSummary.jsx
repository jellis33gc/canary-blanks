import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Star } from "lucide-react";

export default function ProductRatingSummary({ productId }) {
  const [avgRating, setAvgRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    base44.entities.Review.filter({ product_id: productId, is_approved: true })
      .then(reviews => {
        if (reviews.length > 0) {
          const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
          setAvgRating(parseFloat(avg));
          setReviewCount(reviews.length);
        }
      })
      .catch(() => {});
  }, [productId]);

  if (!avgRating) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <Star
            key={n}
            className={`w-4 h-4 transition-colors ${
              n <= Math.round(avgRating)
                ? "fill-amber-400 text-amber-400"
                : "text-border fill-border"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-foreground">{avgRating}</span>
      <span className="text-xs text-muted-foreground">({reviewCount} review{reviewCount !== 1 ? "s" : ""})</span>
    </div>
  );
}