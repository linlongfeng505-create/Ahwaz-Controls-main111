import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Clock, Globe, Award, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useTranslation } from "@/lib/i18n";

const stats = [
  { value: "100%", label: "Tested Before Dispatch", icon: <ShieldCheck className="w-8 h-8" /> },
  { value: "30", label: "Min Quote Response", icon: <Clock className="w-8 h-8" /> },
  { value: "50+", label: "Countries Served", icon: <Globe className="w-8 h-8" /> },
  { value: "12", label: "Months Warranty", icon: <Award className="w-8 h-8" /> },
];



const brands = ["Rosemount", "Yokogawa", "Honeywell", "Siemens", "Fisher", "Micro Motion", "Azbil", "ABB"];

export default function Home() {
  const s = useSiteSettings();
  const t = useTranslation();

  const translatedStats = [
    { value: "100%", label: t("home.stats.tested"), icon: <ShieldCheck className="w-8 h-8" /> },
    { value: "30", label: t("home.stats.response"), icon: <Clock className="w-8 h-8" /> },
    { value: "50+", label: t("home.stats.countries"), icon: <Globe className="w-8 h-8" /> },
    { value: "12", label: t("home.stats.warranty"), icon: <Award className="w-8 h-8" /> },
  ];

  const categories = [
    { title: t("cat.pressure.title", "Pressure Transmitters"), image: "/images/cat-pressure.png", desc: t("cat.pressure.desc", "Absolute, gauge, and differential pressure measurement.") },
    { title: t("cat.temp.title", "Temperature Instruments"), image: "/images/cat-temperature.png", desc: t("cat.temp.desc", "Sensors, transmitters, and thermowells for extreme conditions.") },
    { title: t("cat.flow.title", "Flow Meters"), image: "/images/cat-flow.png", desc: t("cat.flow.desc", "Coriolis, magnetic, and vortex flow measurement systems.") },
    { title: t("cat.valve.title", "Valve Positioners"), image: "/images/cat-valves.png", desc: t("cat.valve.desc", "Digital and smart positioners for precise valve control.") },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-40">
          <img src="/images/hero-home.png" alt="Industrial Refinery" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-transparent" />
        </div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-10 pt-20">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Two-color company name — matches header/footer style.
                  Multi-word: first word white, rest accent.
                  Single-word (e.g. "Flonexis"): split at midpoint so both colours always show. */}
              {(() => {
                const upper = s.company_name.toUpperCase();
                const parts = upper.split(" ");
                if (parts.length >= 2) {
                  return (
                    <div className="text-4xl md:text-6xl font-bold leading-tight mb-2 font-sans tracking-tight">
                      <span className="text-primary-foreground">{parts[0]} </span>
                      <span className="text-accent">{parts.slice(1).join(" ")}</span>
                    </div>
                  );
                }
                // Single word — split at midpoint
                const mid = Math.ceil(upper.length / 2);
                return (
                  <div className="text-4xl md:text-6xl font-bold leading-tight mb-2 font-sans tracking-tight">
                    <span className="text-primary-foreground">{upper.slice(0, mid)}</span>
                    <span className="text-accent">{upper.slice(mid)}</span>
                  </div>
                );
              })()}
              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 font-sans">
                {t("home.hero.title1", "Global Industrial")}<br />
                <span className="text-accent">{t("home.hero.title2", "Instrumentation.")}</span>
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl font-mono leading-relaxed">
                {t("home.hero.desc", s.home_description)}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/contact">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg h-14 px-8 font-bold">
                    {t("btn.requestQuote")} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/products">
                  <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-lg h-14 px-8 font-bold">
                    {t("btn.browseCatalog")}
                  </Button>
                </Link>
              </div>

              {/* Response-time guarantee — drives quote conversions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-6 inline-flex items-start gap-3 bg-primary-foreground/10 border border-primary-foreground/20 rounded-sm px-4 py-3 max-w-xl"
              >
                <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-primary-foreground/80 leading-relaxed">
                  <span className="font-bold text-primary-foreground">{t("home.guarantee.bold", "Reply within 30 minutes")}</span> {t("home.guarantee.text1", "when you submit a Quick Quote Request Monday–Friday, 8:30 a.m. – 6:00 p.m. CST.")}
                  {" "}<span className="text-primary-foreground/60">{t("home.guarantee.text2", "Requests outside these hours receive a reply the next business day.")}</span>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {translatedStats.map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center space-x-4"
              >
                <div className="text-accent">{stat.icon}</div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{t("home.categories.title")}</h2>
              <p className="text-muted-foreground max-w-2xl text-lg">{t("home.categories.desc")}</p>
            </div>
            <Link href="/products" className="hidden md:flex items-center text-primary font-bold hover:text-accent transition-colors">
              {t("btn.viewAll")} <ChevronRight className="ml-1 w-5 h-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat, i) => (
              <Link href="/products" key={i}>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group cursor-pointer bg-card rounded-md border border-border overflow-hidden hover:border-accent transition-all hover:shadow-lg"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img src={cat.image} alt={cat.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-accent transition-colors">{cat.title}</h3>
                    <p className="text-sm text-muted-foreground">{cat.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
          
          <div className="mt-8 text-center md:hidden">
            <Link href="/products">
              <Button variant="outline" className="w-full">View All Products</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Brands Marquee */}
      <section className="py-20 bg-primary text-primary-foreground overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 mb-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">{t("home.brands.title")}</h2>
          <p className="text-primary-foreground/60">{t("home.brands.desc")}</p>
        </div>
        
        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee whitespace-nowrap flex items-center space-x-16 px-8">
            {brands.map((brand, i) => (
              <span key={i} className="text-4xl md:text-5xl font-bold text-primary-foreground/20 hover:text-accent transition-colors cursor-default">
                {brand}
              </span>
            ))}
          </div>
          <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center space-x-16 px-8">
             {brands.map((brand, i) => (
              <span key={`dup-${i}`} className="text-4xl md:text-5xl font-bold text-primary-foreground/20 hover:text-accent transition-colors cursor-default">
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-secondary/50 -skew-x-12 translate-x-20" />
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-3xl">
            <h2 className="text-4xl font-bold text-foreground mb-6">{t("home.cta.title")}</h2>
            <p className="text-lg text-muted-foreground mb-8">{t("home.cta.desc")}</p>
            <Link href="/contact">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 text-lg font-bold">
                {t("btn.contactSales")}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
