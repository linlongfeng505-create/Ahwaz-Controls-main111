import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <Layout>
      <div className="bg-primary pt-24 pb-16 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About Ahwaz Controls</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl font-mono">
              EHUADE Automation — Your trusted procurement partner for industrial instrumentation.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="flex flex-col lg:flex-row gap-16 items-start">
          <div className="w-full lg:w-1/2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-3xl font-bold mb-6 text-foreground">Who We Are</h2>
              <div className="space-y-6 text-lg text-muted-foreground leading-relaxed">
                <p>
                  Based in China, Ahwaz Controls (EHUADE Automation) is a leading B2B wholesale exporter specializing in high-grade industrial instrumentation and automation equipment.
                </p>
                <p>
                  For over a decade, we have served as a critical supply chain link for procurement engineers, EPC contractors, and end-users in the Oil & Gas, Chemical, Power, and Pharmaceutical sectors across 50+ countries.
                </p>
                <p>
                  Our mission is simple: provide authentic, major-brand equipment with faster lead times and competitive pricing, backed by uncompromising technical support.
                </p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-12 space-y-4">
              <h3 className="text-xl font-bold text-foreground mb-6">Our Commitment</h3>
              {[
                "100% Genuine factory-new equipment",
                "12-Month standard factory warranty on all products",
                "30-Minute quote response time during business hours",
                "Strict quality control and pre-shipment inspection",
                "Global logistics and customs clearance support"
              ].map((item, i) => (
                <div key={i} className="flex items-start text-foreground">
                  <CheckCircle2 className="w-6 h-6 text-accent mr-4 shrink-0" />
                  <span className="text-lg">{item}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <div className="w-full lg:w-1/2">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: 0.3 }}
              className="aspect-square rounded-sm overflow-hidden border-4 border-border shadow-2xl"
            >
              <img src="/images/hero-about.png" alt="Precision Engineering" className="w-full h-full object-cover" />
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
