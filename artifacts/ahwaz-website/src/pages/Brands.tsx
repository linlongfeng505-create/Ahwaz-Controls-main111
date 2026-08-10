import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useTranslation } from "@/lib/i18n";
import { useSiteSettings } from "@/context/SiteSettingsContext";

interface BrandItem {
  name: string;
  desc: string;
}

function parseBrands(raw: string | undefined): BrandItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((b: any) => b.name) : [];
  } catch { return []; }
}

export default function Brands() {
  const t = useTranslation();
  const s = useSiteSettings();

  const brands = parseBrands(s.brands);
  
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
        {brands.length === 0 ? (
          <p className="text-center text-muted-foreground font-mono py-12">No brands configured yet.</p>
        ) : (
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
        )}
      </div>
    </Layout>
  );
}
