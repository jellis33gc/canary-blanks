import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function StarRating({ value, onChange, size = "w-6 h-6", readonly = false }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(n)}
          onMouseEnter={() => !readonly && setHovered(n)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={readonly ? "cursor-default" : "cursor-pointer"}
        >
          <Star
            className={`${size} transition-colors ${
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-border fill-border"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 text-right text-muted-foreground">{label}</span>
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-muted-foreground">{count}</span>
    </div>
  );
}

export default function ProductReviews({ productId, productName }) {
  const [reviews, setReviews] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ rating: 0, title: "", body: "" });
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  useEffect(() => {
    base44.entities.Review.filter({ product_id: productId, is_approved: true }, "-created_date", 50)
      .then(setReviews).catch(() => {});
    
    base44.auth.me().then(async (u) => {
      setUser(u);
      if (u) {
        setCheckingPurchase(true);
        // Check if user has purchased this product
        const orders = await base44.entities.Order.filter({ customer_email: u.email }, "-created_date", 100).catch(() => []);
        const hasBought = orders.some(order =>
          order.items?.some(item => item.product_id === productId)
        );
        setHasPurchased(hasBought);
        setCheckingPurchase(false);
      }
    }).catch(() => {});
  }, [productId]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({
    label: n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating || !hasPurchased) return;
    setSubmitting(true);
    await base44.entities.Review.create({
      product_id: productId,
      product_name: productName,
      author_name: user?.full_name || "Anonymous",
      author_email: user?.email || "",
      rating: form.rating,
      title: form.title,
      body: form.body,
      is_approved: true,
    });
    const updated = await base44.entities.Review.filter({ product_id: productId, is_approved: true }, "-created_date", 50);
    setReviews(updated);
    setSubmitting(false);
    setSubmitted(true);
    setShowForm(false);
    setForm({ rating: 0, title: "", body: "" });
    setTimeout(() => setSubmitted(false), 3000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row gap-8 items-start">
        {reviews.length > 0 ? (
          <>
            <div className="text-center shrink-0">
              <p className="text-6xl font-bold text-foreground">{avgRating}</p>
              <StarRating value={Math.round(parseFloat(avgRating))} readonly size="w-5 h-5" />
              <p className="text-sm text-muted-foreground mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex-1 space-y-1.5 min-w-0 w-full sm:w-auto">
              {ratingCounts.map(({ label, count }) => (
                <RatingBar key={label} label={label} count={count} total={reviews.length} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">No reviews yet — be the first to share your thoughts!</p>
        )}

        <div className="shrink-0">
           {submitted ? (
             <p className="text-green-600 font-semibold text-sm">✅ Thanks for your review!</p>
           ) : (
             <>
               {checkingPurchase ? (
                 <p className="text-muted-foreground text-sm">Checking order history...</p>
               ) : !user ? (
                 <Button
                   onClick={() => base44.auth.redirectToLogin()}
                   className="rounded-full bg-primary text-white font-bold"
                 >
                   Sign in to Review
                 </Button>
               ) : !hasPurchased ? (
                 <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                   <p className="font-medium">You must purchase this product to review it.</p>
                 </div>
               ) : (
                 <Button
                   onClick={() => setShowForm(v => !v)}
                   className="rounded-full bg-primary text-white font-bold"
                 >
                   {showForm ? "Cancel" : "Write a Review"}
                 </Button>
               )}
             </>
           )}
         </div>
      </div>

      {/* Review form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="bg-muted/50 rounded-2xl p-6 space-y-4 border border-border"
          >
            <h3 className="font-bold text-lg">Your Review</h3>
            <div>
              <label className="text-sm font-semibold mb-1 block">Rating <span className="text-primary">*</span></label>
              <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Review Title</label>
              <Input
                placeholder="Sum it up in a few words"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Your Experience</label>
              <Textarea
                placeholder="What did you love about it? Would you recommend it?"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                rows={4}
              />
            </div>
            <Button type="submit" disabled={!form.rating || submitting} className="rounded-full bg-primary text-white font-bold">
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Review list */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map(review => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-border rounded-2xl p-5 bg-card"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                      {(review.author_name || "A").charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm">{review.author_name || "Anonymous"}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(review.created_date)}</span>
                  </div>
                  <StarRating value={review.rating} readonly size="w-4 h-4" />
                </div>
              </div>
              {review.title && <p className="font-semibold mt-2">{review.title}</p>}
              {review.body && <p className="text-muted-foreground text-sm mt-1 leading-relaxed">{review.body}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}