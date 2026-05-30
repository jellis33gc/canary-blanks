import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Star, TrendingUp, Zap, Trophy, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const TIERS = [
  { name: "Sugar Baby", min: 0, max: 500, color: "bg-pink-100 text-pink-700", icon: "🍬" },
  { name: "Cake Lover", min: 500, max: 1500, color: "bg-purple-100 text-purple-700", icon: "🎂" },
  { name: "Frosting Fan", min: 1500, max: 3000, color: "bg-yellow-100 text-yellow-700", icon: "✨" },
  { name: "Master Baker", min: 3000, max: Infinity, color: "bg-primary/10 text-primary", icon: "👑" },
];

function getTier(points) {
  return TIERS.find(t => points >= t.min && points < t.max) || TIERS[TIERS.length - 1];
}

function getNextTier(points) {
  const idx = TIERS.findIndex(t => points >= t.min && points < t.max);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export default function LoyaltyTracker({ profile, loyaltyHistory, onPointsRedeemed }) {
  const [redeeming, setRedeeming] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState(0);
  const [redeemMsg, setRedeemMsg] = useState("");

  const points = profile?.loyalty_points || 0;
  const tier = getTier(points);
  const nextTier = getNextTier(points);
  const progressPct = nextTier
    ? Math.min(100, ((points - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  const maxRedeemable = Math.floor(points / 100); // £1 per 100 pts

  const handleRedeem = async () => {
    if (redeemAmount <= 0 || redeemAmount > maxRedeemable) return;
    setRedeeming(true);
    setRedeemMsg("");

    const pointsUsed = redeemAmount * 100;
    const code = `REDEEM-${Date.now()}`;

    // Create discount code
    await base44.entities.DiscountCode.create({
      code,
      type: "fixed",
      value: redeemAmount,
      is_active: true,
      usage_limit: 1,
      used_count: 0,
      one_per_customer: false,
    });

    // Deduct points
    await base44.entities.CustomerProfile.update(profile.id, {
      loyalty_points: points - pointsUsed,
    });

    await base44.entities.LoyaltyTransaction.create({
      customer_id: profile.user_id,
      customer_email: profile.email,
      type: "redeem",
      points: -pointsUsed,
      description: `Redeemed ${pointsUsed} pts → discount code ${code}`,
    });

    setRedeemMsg(code);
    setRedeeming(false);
    if (onPointsRedeemed) onPointsRedeemed(points - pointsUsed);
  };

  return (
    <div className="space-y-5">
      {/* Balance card */}
      <div className="gradient-fun text-white rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-80 font-medium">Your Balance</p>
            <p className="text-5xl font-brand">{points.toLocaleString()}</p>
            <p className="text-sm opacity-75 mt-1">= €{(points / 100).toFixed(2)} discount value</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold bg-white/20`}>
              {tier.icon} {tier.name}
            </span>
          </div>
        </div>

        {/* Tier progress */}
        {nextTier && (
          <div>
            <div className="flex justify-between text-xs opacity-80 mb-1">
              <span>{tier.name}</span>
              <span>{nextTier.name} at {nextTier.min.toLocaleString()} pts</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs opacity-75 mt-1">{(nextTier.min - points).toLocaleString()} pts to reach {nextTier.name}</p>
          </div>
        )}
        {!nextTier && (
          <div className="flex items-center gap-2 mt-2">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-medium">You've reached the highest tier! 🎉</span>
          </div>
        )}
      </div>

      {/* Tiers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TIERS.map(t => (
          <div key={t.name} className={`rounded-xl p-3 text-center border-2 transition-all ${points >= t.min ? 'border-primary/40 bg-primary/5' : 'border-border bg-card opacity-60'}`}>
            <p className="text-2xl mb-1">{t.icon}</p>
            <p className="text-xs font-bold">{t.name}</p>
            <p className="text-xs text-muted-foreground">{t.min === 0 ? "0+" : `${t.min.toLocaleString()}+`} pts</p>
            {points >= t.min && <Badge className="mt-1 text-[10px] bg-primary/20 text-primary border-0">Unlocked ✓</Badge>}
          </div>
        ))}
      </div>

      {/* Redeem section */}
      {maxRedeemable > 0 && !redeemMsg && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Redeem Points</h3>
          </div>
          <p className="text-sm text-muted-foreground">You can redeem up to <strong>€{maxRedeemable}.00</strong> (100 pts = €1)</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-full overflow-hidden">
              <button onClick={() => setRedeemAmount(a => Math.max(0, a - 1))} className="px-3 py-2 hover:bg-muted font-bold text-lg">−</button>
              <span className="px-4 py-2 font-bold text-primary min-w-[60px] text-center">€{redeemAmount}</span>
              <button onClick={() => setRedeemAmount(a => Math.min(maxRedeemable, a + 1))} className="px-3 py-2 hover:bg-muted font-bold text-lg">+</button>
            </div>
            <span className="text-sm text-muted-foreground">= {redeemAmount * 100} pts</span>
          </div>
          <Button
            onClick={handleRedeem}
            disabled={redeeming || redeemAmount <= 0}
            className="rounded-full bg-primary text-white font-bold w-full"
          >
            {redeeming ? "Generating..." : `Redeem €${redeemAmount} Discount Code`}
          </Button>
        </div>
      )}

      {/* Success: show generated code */}
      {redeemMsg && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-5 text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <p className="font-bold text-green-800">Your discount code is ready!</p>
          <div className="bg-white border border-green-200 rounded-xl px-4 py-3 font-mono font-bold text-lg tracking-widest text-primary">
            {redeemMsg}
          </div>
          <p className="text-xs text-green-600">Use this code at checkout for €{redeemAmount} off your order</p>
          <Button variant="outline" size="sm" className="rounded-full mt-2" onClick={() => { setRedeemMsg(""); setRedeemAmount(0); }}>
            Redeem More
          </Button>
        </div>
      )}

      {/* How it works */}
      <div className="bg-muted/50 border border-border rounded-2xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />How to Earn Points</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500 shrink-0" /> Earn <strong className="text-foreground">1 point</strong> for every €1 spent</li>
          <li className="flex items-center gap-2"><Gift className="w-4 h-4 text-primary shrink-0" /> Redeem <strong className="text-foreground">100 points</strong> = €1 discount</li>
          <li className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500 shrink-0" /> Points <strong className="text-foreground">never expire</strong></li>
        </ul>
      </div>

      {/* History */}
      <div>
        <h3 className="font-bold mb-3">Points History</h3>
        {loyaltyHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No transactions yet — start shopping to earn points!</p>
        ) : (
          <div className="space-y-2">
            {loyaltyHistory.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-sm">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(t.created_date), "dd MMM yyyy")}</p>
                </div>
                <p className={`font-bold text-sm ${t.type === 'earn' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'earn' ? '+' : ''}{t.points} pts
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}