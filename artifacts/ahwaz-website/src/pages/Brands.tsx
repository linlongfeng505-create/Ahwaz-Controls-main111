import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";



export default function Brands() {
  const t = useTranslation();

  const brands = [
    { name: "Rosemount / Emerson", desc: t("brands.b1") },
    { name: "Yokogawa", desc: t("brands.b2") },
    { name: "Honeywell", desc: t("brands.b3") },
    { name: "Siemens", desc: t("brands.b4") },
    { name: "Fisher / Emerson", desc: t("brands.b5") },
    { name: "Micro Motion", desc: t("brands.b6") },
    { name: "Azbil", desc: t("brands.b7") },
    { name: "ABB", desc: t("brands.b8") },
    { name: "SAMSON", desc: t("brands.b9") },
    { name: "YTC", desc: t("brands.b10") },
    { name: "KOSO", desc: t("brands.b11") },
    { name: "Topworx", desc: t("brands.b12") },
    { name: "Fluke", desc: t("brands.b13") },
  ];
  
  return (
    <Layout>
      <div className="bg-primary pt-24 pb-16 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("brands.title")}</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl font-mono">
              {t("home.brands.desc")}
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
