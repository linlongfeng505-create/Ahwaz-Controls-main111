import { Layout } from "@/components/layout";
import { motion } from "framer-motion";

const brands = [
  { name: "Rosemount / Emerson", desc: "Industry-standard pressure, temperature, flow, and level measurement instrumentation." },
  { name: "Yokogawa", desc: "High-accuracy field instruments, process analyzers, and industrial automation solutions." },
  { name: "Honeywell", desc: "Smart pressure, temperature, and multivariable transmitters." },
  { name: "Siemens", desc: "Process instrumentation, valve positioners, and comprehensive factory automation." },
  { name: "Fisher / Emerson", desc: "Control valves, regulators, and digital valve controllers." },
  { name: "Micro Motion", desc: "Premium Coriolis mass flow and density measurement meters." },
  { name: "Azbil", desc: "Smart valve positioners and advanced emergency shutdown (ESD) devices." },
  { name: "ABB", desc: "Analytical measurement, flow meters, and electrification products." },
  { name: "SAMSON", desc: "Control valves, regulators, and electropneumatic positioners." },
  { name: "YTC", desc: "High-performance pneumatic and smart valve positioners." },
  { name: "KOSO", desc: "Severe service control valves and actuators." },
  { name: "Topworx", desc: "Discrete valve control and position sensing technology." },
  { name: "Fluke", desc: "Industrial testing, diagnostic tools, and field communicators." },
];

export default function Brands() {
  return (
    <Layout>
      <div className="bg-primary pt-24 pb-16 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Partner Brands</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl font-mono">
              We source and supply 100% genuine equipment from the world's most trusted industrial manufacturers.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group p-8 border border-border bg-card hover:bg-primary hover:text-primary-foreground transition-all rounded-sm cursor-default"
            >
              <h2 className="text-2xl font-bold mb-4 text-foreground group-hover:text-accent transition-colors">{brand.name}</h2>
              <p className="text-muted-foreground group-hover:text-primary-foreground/80 text-sm leading-relaxed">{brand.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
