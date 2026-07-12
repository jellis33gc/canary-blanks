import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function NewsletterForm({ variant = "footer" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await base44.functions.invoke("subscribeNewsletter", { email: email.trim() });
      if (res.data?.error) {
        setStatus("error");
        setMessage(res.data.error);
      } else {
        setStatus("success");
        setMessage("You're subscribed! Check your inbox for a confirmation.");
        setEmail("");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (variant === "block") {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            disabled={status === "loading" || status === "success"}
            className="flex-1 border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          />
          <Button type="submit" disabled={status === "loading" || status === "success"} className="rounded-full">
            {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : status === "success" ? <CheckCircle2 className="w-4 h-4" /> : "Subscribe"}
          </Button>
        </div>
        {message && (
          <p className={`text-xs mt-2 ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>
        )}
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          disabled={status === "loading" || status === "success"}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
        />
        <button type="submit" disabled={status === "loading" || status === "success"} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center min-w-[56px]">
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : status === "success" ? <CheckCircle2 className="w-4 h-4" /> : "Join"}
        </button>
      </div>
      {message && (
        <p className={`text-xs mt-2 ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>
      )}
    </form>
  );
}