import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Droplet, Factory, Flame, Zap, ShieldAlert } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const industries = [
  {
    title: "Oil & Gas",
    icon: <Flame className="w-10 h-10 mb-6 text-accent" />,
    desc: "Upstream extraction, midstream transport, and downstream refining require rugged, hazardous-area certified instrumentation. We supply explosion-proof pressure transmitters, Coriolis flow meters, and severe-service control valves.",
    image: "/images/ind-oilgas.png"
  },
  {
    title: "Chemical Processing",
    icon: <Factory className="w-10 h-10 mb-6 text-accent" />,
    desc: "Corrosive environments demand specialized materials and extreme precision. We source chemical-resistant sensors, magnetic flow meters, and smart valve positioners to ensure batch consistency and plant safety."
  },
  {
    title: "Power Generation",
    icon: <Zap className="w-10 h-10 mb-6 text-accent" />,
    desc: "Thermal, nuclear, and renewable power plants rely on critical steam and water cycle monitoring. We provide high-temperature transmitters, vortex flow meters, and reliable actuators for continuous operation."
  },
  {
    title: "Pharmaceuticals",
    icon: <ShieldAlert className="w-10 h-10 mb-6 text-accent" />,
    desc: "Strict hygiene and FDA/regulatory requirements mandate sanitary instrumentation. We supply hygienic pressure and temperature sensors designed for CIP/SIP processes in clean-room environments."
  },
  {
    title: "Water & Wastewater",
    icon: <Droplet className="w-10 h-10 mb-6 text-accent" />,
    desc: "Environmental monitoring and treatment facilities require robust flow and level measurement. We stock reliable magnetic flow meters and durable pressure transmitters for municipal and industrial water management."
  }
];

export default function Industries() {
  const t = useTranslation();

  return (
    <Layout>
      <div className="bg-primary pt-24 pb-16 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("industries.title")}</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl font-mono">
              Providing critical measurement and control solutions for the world's most demanding industrial environments.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {industries.map((ind, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`p-8 border border-border bg-card ${ind.image ? 'lg:col-span-2 flex flex-col md:flex-row gap-8 items-center bg-secondary/20 border-none' : ''}`}
            >
              {ind.image && (
                <div className="w-full md:w-1/2 aspect-video rounded-sm overflow-hidden">
                  <img src={ind.image} alt={ind.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className={ind.image ? "w-full md:w-1/2" : ""}>
                {!ind.image && ind.icon}
                {ind.image && <div className="text-accent mb-4">{ind.icon}</div>}
                <h2 className="text-2xl font-bold mb-4 text-foreground">{ind.title}</h2>
                <p className="text-muted-foreground leading-relaxed text-lg">{ind.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
