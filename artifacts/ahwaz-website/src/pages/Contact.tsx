import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

export default function Contact() {
  const s = useSiteSettings();
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Submission failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: "", company: "", email: "", phone: "", message: "" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMutation.mutate();
  }

  return (
    <Layout>
      <div className="bg-primary pt-24 pb-16 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Sales</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl font-mono">
              Send us your requirements. We aim to return all quotes within 30 minutes during business hours.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="flex flex-col lg:flex-row gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full lg:w-1/3 space-y-10"
          >
            <div>
              <h2 className="text-2xl font-bold mb-6 text-foreground">Get in Touch</h2>
              <p className="text-muted-foreground mb-8">Whether you need a single replacement transmitter or instrumentation for a complete plant overhaul, our engineering sales team is ready to assist.</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center rounded-sm mr-4 shrink-0 text-primary">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Email</h3>
                  <a href={`mailto:${s.email}`} className="text-primary hover:text-accent font-medium">{s.email}</a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center rounded-sm mr-4 shrink-0 text-primary">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">WhatsApp / Phone</h3>
                  <a href={`https://wa.me/${s.whatsapp}`} className="text-primary hover:text-accent font-medium">{s.phone}</a>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center rounded-sm mr-4 shrink-0 text-primary">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Business Hours</h3>
                  <p className="text-muted-foreground">Mon - Fri: 8:30am – 6:00pm (CST)</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="w-12 h-12 bg-secondary flex items-center justify-center rounded-sm mr-4 shrink-0 text-primary">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Headquarters</h3>
                  <p className="text-muted-foreground">{s.company_name}<br />{s.address}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full lg:w-2/3"
          >
            <div className="bg-card p-8 border border-border shadow-sm rounded-sm">
              <h2 className="text-2xl font-bold mb-6 text-foreground">Request a Quote</h2>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center py-12"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Enquiry Received!</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Thank you. Our sales team will get back to you within 30 minutes during business hours.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                    className="font-semibold"
                  >
                    Submit Another Enquiry
                  </Button>
                </motion.div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Full Name *</label>
                      <Input
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="John Doe"
                        className="bg-background"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Company *</label>
                      <Input
                        value={form.company}
                        onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                        placeholder="Acme Industrial"
                        className="bg-background"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Email Address *</label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="john@example.com"
                        className="bg-background"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">Phone / WhatsApp</label>
                      <Input
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 234 567 8900"
                        className="bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Requirements / RFQ Details *</label>
                    <Textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      placeholder="Please include part numbers, quantities, and target delivery dates..."
                      className="min-h-[150px] bg-background"
                      required
                    />
                  </div>

                  {submitMutation.isError && (
                    <p className="text-red-500 text-sm font-mono">{(submitMutation.error as Error).message}</p>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitMutation.isPending}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-14 text-lg font-bold"
                  >
                    {submitMutation.isPending ? "Sending..." : "Submit RFQ"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    By submitting this form, you agree to our privacy policy. We will not share your data.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
