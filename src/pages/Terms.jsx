import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ChevronDown, ChevronUp } from "lucide-react";

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full text-left p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
        <h2 className="font-bold text-lg">{title}</h2>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>}
    </div>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-brand text-4xl mb-2">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 27 June 2026</p>

        <div className="space-y-4">
          <Section title="1. Introduction" defaultOpen>
            <p>Welcome to CanaryBlanks. By placing an order on our website, you agree to these Terms & Conditions. Please read them carefully before making a purchase.</p>
            <p>These terms apply to all sales of sublimation blanks and related products through our online store.</p>
          </Section>

          <Section title="2. Orders & Payment">
            <p>All orders are subject to availability and confirmation of the order price. We reserve the right to refuse any order. Payment must be made in full at the time of purchase via our secure Stripe payment gateway.</p>
            <p>Prices are displayed in Euros (€) and include applicable taxes where required. Shipping costs are calculated at checkout.</p>
          </Section>

          <Section title="3. Delivery" defaultOpen>
            <p>We currently offer delivery within Gran Canaria (postcodes starting with 35) and local collection from our store.</p>
            <p>Delivery times are estimates and are not guaranteed. We are not liable for delays caused by courier services.</p>
            <p>Free shipping is available on qualifying orders as displayed at checkout.</p>
          </Section>

          <Section title="4. Right of Withdrawal (EU Consumer Law)" defaultOpen>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-semibold text-amber-800 mb-2">14-Day Withdrawal Right</p>
              <p className="text-amber-800">Under EU consumer protection law, you have the right to withdraw from your purchase within 14 calendar days from the date you receive your goods, without giving any reason.</p>
            </div>
            <p><strong>How to exercise your right of withdrawal:</strong></p>
            <p>You can submit a withdrawal request directly from your account page by clicking "Request Withdrawal" on any eligible delivered order. This will open a return request that our team will review and process.</p>
            <p><strong>Conditions for withdrawal:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The 14-day period begins from the date of delivery</li>
              <li>Goods must be returned unused, in their original packaging, and in resalable condition</li>
              <li>Customised or personalised sublimation products may be exempt from the right of withdrawal where the customisation has already begun</li>
            </ul>
            <p><strong>Refund processing:</strong></p>
            <p>We will process your refund within 14 days of receiving the returned goods. The refund will be issued to your original payment method.</p>
          </Section>

          <Section title="5. Return Shipping Costs" defaultOpen>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="font-semibold text-red-800 mb-1">Customer Responsibility for Return Shipping</p>
              <p className="text-red-800">When exercising your right of withdrawal, <strong>you (the consumer) are responsible for all costs associated with returning the goods to us.</strong> Return shipping charges are not refundable and will not be reimbursed under any circumstances.</p>
            </div>
            <p>We strongly recommend using a tracked and insured delivery service when returning goods, as we cannot be held responsible for items lost or damaged in transit on their way back to us.</p>
            <p>The original delivery charge (if any was paid) will be refunded as part of your withdrawal, however the cost of the return shipping is borne entirely by the customer.</p>
          </Section>

          <Section title="6. Returns Portal">
            <p>You can track the status of your return requests through our online Returns Portal at any time. Once your request is approved, you will be prompted to enter your return tracking number so we can monitor the shipment.</p>
            <p>The Returns Portal provides real-time updates on the status of your withdrawal, including when your return is received and when your refund has been processed.</p>
          </Section>

          <Section title="7. Product Quality & Damaged Goods">
            <p>If you receive damaged or faulty goods, please contact us within 48 hours of delivery with photographic evidence. We will arrange a replacement or refund at no cost to you, including return shipping for faulty items.</p>
            <p>Claims for damage or faults reported after 48 hours will be assessed on a case-by-case basis.</p>
          </Section>

          <Section title="8. Privacy">
            <p>Your personal data is processed in accordance with our Privacy Policy and applicable EU GDPR regulations. We only use your data to process orders, manage returns, and improve our services.</p>
          </Section>

          <Section title="9. Contact">
            <p>If you have any questions about these Terms & Conditions or wish to exercise your right of withdrawal, please contact us through our website or visit our store in person.</p>
          </Section>
        </div>
      </div>
      <Footer />
    </div>
  );
}