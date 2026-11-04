import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Clock, Globe, Award, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useTranslation } from "@/lib/i18n";
import { useState, useEffect } from "react";

const HERO_SLIDES = [
  {
    image: "/images/hero-bright-1.jpg",
    alt: "Modern Industrial Automation and Control Instrumentation Facility",
    badge: "Advanced Process Engineering",
  },
  {
    image: "/images/hero-bright-2.jpg",
    alt: "State-of-the-Art Precision Instrumentation and Flow Workshop",
    badge: "Precision Measurement Systems",
  },
];

const stats = [
  { value: "100%", label: "Tested Before Dispatch", icon: <ShieldCheck className="w-8 h-8" /> },
  { value: "30", label: "Min Quote Response", icon: <Clock className="w-8 h-8" /> },
  { value: "50+", label: "Countries Served", icon: <Globe className="w-8 h-8" /> },
  { value: "12", label: "Months Warranty", icon: <Award className="w-8 h-8" /> },
];





export default function Home() {
  const s = useSiteSettings();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);
  const t = useTranslation();

  // Parse brands from settings (dynamic, backend-managed)
  const brands: string[] = (() => {
    try {
      const parsed = JSON.parse(s.brands || "[]");
      return Array.isArray(parsed) ? parsed.map((b: any) => b.name || b).filter(Boolean) : [];
    } catch { return []; }
  })();


  const translatedStats = [
    { value: "100%", label: t("home.stats.tested"), icon: <ShieldCheck className="w-8 h-8" /> },
    { value: "30", label: t("home.stats.response"), icon: <Clock className="w-8 h-8" /> },
    { value: "50+", label: t("home.stats.countries"), icon: <Globe className="w-8 h-8" /> },
    { value: "12", label: t("home.stats.warranty"), icon: <Award className="w-8 h-8" /> },
  ];

  const categories = [
    { title: t("cat.pressure.title", "Pressure Transmitters"), image: "/images/cat-pressure.png", desc: t("cat.pressure.desc", "Absolute, gauge, and differential pressure measurement.") },
    { title: t("cat.valve.title", "Valve Positioners"), image: "/images/cat-valves.png", desc: t("cat.valve.desc", "Digital and smart positioners for precise valve control.") },
    { title: t("cat.domon.title", "Domon Valve"), image: "/images/cat-domon-valve.png", desc: t("cat.domon.desc", "Specialist dome valves for bulk solids, powder, and fly ash conveying systems.") },
    { title: t("cat.sootblower.title", "Soot Blowers"), image: "/images/cat-sootblower.png", desc: t("cat.sootblower.desc", "Industrial soot blowing equipment for boiler and heat exchanger cleaning.") },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-slate-950 text-white overflow-hidden">
        {/* Carousel Background Images */}
        <div className="absolute inset-0 z-0">
          {HERO_SLIDES.map((slide, index) => (
            <div
              key={slide.image}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                className="w-full h-full object-cover object-center"
              />
            </div>
          ))}
          {/* Smart Light/Contrast Overlays */}
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-slate-950/85 via-slate-950/50 via-50% to-transparent pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-24 z-10 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        </div>
        
        <div className="container mx-auto px-4 md:px-8 relative z-20 pt-20 pb-16">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent text-xs font-mono font-semibold mb-6 uppercase tracking-wider backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                {HERO_SLIDES[currentSlide].badge}
              </div>

              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 font-sans drop-shadow-sm">
                {t("home.hero.title1", "Global Industrial")}<br />
                <span className="text-accent">{t("home.hero.title2", "Instrumentation.")}</span>
              </h1>
              <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl font-mono leading-relaxed drop-shadow-sm">
                {t("home.hero.desc", s.home_description)}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/contact">
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-lg h-14 px-8 font-bold shadow-lg">
                    {t("btn.requestQuote")} <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/products">
                  <Button size="lg" variant="outline" className="border-white/60 text-white bg-slate-900/30 backdrop-blur-sm hover:bg-white hover:text-slate-950 text-lg h-14 px-8 font-bold">
                    {t("btn.browseCatalog")}
                  </Button>
                </Link>
              </div>

              {/* Response-time guarantee — drives quote conversions */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-6 inline-flex items-start gap-3 bg-slate-900/60 backdrop-blur-md border border-white/15 rounded-sm px-4 py-3 max-w-xl shadow-lg"
              >
                <Clock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-white/90 leading-relaxed">
                  <span className="font-bold text-white">{t("home.guarantee.bold", "Reply within 30 minutes")}</span> {t("home.guarantee.text1", "when you submit a Quick Quote Request Monday–Friday, 8:30 a.m. – 6:00 p.m. CST.")}
                  {" "}<span className="text-white/70">{t("home.guarantee.text2", "Requests outside these hours receive a reply the next business day.")}</span>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Carousel Navigation Indicator Dots */}
        <div className="absolute bottom-8 right-6 md:right-12 z-20 flex items-center gap-3 bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 shadow-xl">
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "w-8 bg-accent shadow-md shadow-accent/50"
                  : "w-2.5 bg-white/40 hover:bg-white/80"
              }`}
              title={`Switch to slide ${idx + 1}`}
              aria-label={`Switch to slide ${idx + 1}`}
            />
          ))}
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
    </Layout>
  );
}
