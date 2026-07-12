import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Send, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      await base44.integrations.Core.SendEmail({
        to: "hello@canaryblanks.es",
        subject: `Contact Form: ${form.subject || "General Enquiry"}`,
        body: `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`,
      });
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            <span className="text-secondary">Get in </span><span className="text-primary">Touch</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Have a question about a product, order, or custom request? We'd love to hear from you!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-muted/50 rounded-2xl p-6 text-center border border-border">
            <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-1">Email Us</h3>
            <p className="text-sm text-muted-foreground">hello@canaryblanks.es</p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-6 text-center border border-border">
            <Phone className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-1">Call Us</h3>
            <p className="text-sm text-muted-foreground">Mon–Fri, 9am–5pm CET</p>
          </div>
          <div className="bg-muted/50 rounded-2xl p-6 text-center border border-border">
            <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-1">Based in</h3>
            <p className="text-sm text-muted-foreground">Canary Islands, Spain</p>
          </div>
        </div>

        {status === "success" ? (
          <div className="max-w-xl mx-auto bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800 mb-2">Message Sent!</h2>
            <p className="text-green-700 mb-6">Thanks for reaching out. We'll get back to you as soon as possible.</p>
            <Button asChild className="bg-primary text-white rounded-full">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto bg-white rounded-2xl border border-border shadow-sm p-8 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl" placeholder="Your name" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="rounded-xl" placeholder="you@example.com" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Subject</Label>
              <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="rounded-xl" placeholder="What's this about?" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Message *</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="rounded-xl min-h-[140px] resize-y" placeholder="Tell us how we can help..." />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={status === "loading"} className="w-full bg-primary text-white rounded-full font-bold py-3">
              {status === "loading" ? "Sending..." : "Send Message"}
              {status !== "loading" && <Send className="w-4 h-4 ml-1" />}
            </Button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}