import { Link, useLocation } from "wouter";
import { MessageCircle, Menu, X, ChevronRight, Mail, Phone, MapPin, Globe } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { useLanguage, useTranslation, SUPPORTED_LANGUAGES, Language } from "@/lib/i18n";

function LanguageSwitcher() {
  const { lang } = useLanguage();
  const settings = useSiteSettings();
  const enabledArray = (settings.enabled_languages || "en,id,vi,ar").split(",").map(s => s.trim());
  const activeLanguages = SUPPORTED_LANGUAGES.filter(l => enabledArray.includes(l.code));
  
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function switchLang(newLang: string) {
    const path = window.location.pathname;
    // Strip current lang prefix
    const stripped = path.replace(/^\/(id|vi|ar)(\/|$)/, "$2") || "/";
    const newPath = newLang === "en" ? stripped : `/${newLang}${stripped.startsWith("/") ? stripped : "/" + stripped}`;
    window.location.href = newPath;
  }

  const currentLabel = SUPPORTED_LANGUAGES.find(l => l.code === lang)?.label ?? "English";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent transition-colors px-2 py-1 rounded-sm"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLabel}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full right-0 mt-1 bg-card border border-border rounded-sm shadow-lg min-w-[140px] z-50"
          >
            {activeLanguages.map(l => (
              <button
                key={l.code}
                onClick={() => { setOpen(false); switchLang(l.code); }}
                className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${
                  l.code === lang ? "text-accent font-semibold" : "text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const s = useSiteSettings();
  const t = useTranslation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { href: "/products", label: t("nav.products") },
    { href: "/brands", label: t("nav.brands") },
    { href: "/industries", label: t("nav.industries") },
    { href: "/articles", label: t("nav.articles") },
    { href: "/about", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Top Bar */}
      <div className="bg-primary-foreground text-primary py-2 px-4 md:px-8 text-xs font-medium border-b border-border/40 hidden md:flex justify-between items-center z-50 relative">
        <div className="flex items-center space-x-6">
          <span className="flex items-center"><Mail className="w-3 h-3 mr-2" /> {s.email}</span>
          <span className="flex items-center"><Phone className="w-3 h-3 mr-2" /> {s.phone}</span>
        </div>
        <div>
          <span>B2B Wholesale Exporter of Industrial Instrumentation</span>
        </div>
      </div>

      {/* Main Header */}
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-300 ${
          isScrolled ? "bg-background/95 backdrop-blur-md shadow-sm border-b" : "bg-background"
        }`}
      >
        <div className="container mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <Link href="/">
            <div className="flex flex-col cursor-pointer">
              <span className="text-xl font-bold tracking-tight text-foreground leading-tight">
                {s.company_name.toUpperCase().split(" ").map((w, i) => (
                  i === 0 ? <span key={i}>{w} </span> : <span key={i} className="text-accent">{w}</span>
                ))}
              </span>
              <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground font-medium">
                {s.company_subtitle}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span
                  className={`text-sm font-semibold transition-colors hover:text-accent cursor-pointer ${
                    location === link.href ? "text-accent" : "text-foreground"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            ))}
            <Link href="/contact">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm font-bold shadow-md shadow-accent/20">
                {t("btn.contactUs")}
              </Button>
            </Link>
            <LanguageSwitcher />
          </nav>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden text-foreground p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-30 bg-background pt-24 px-4 overflow-y-auto"
          >
            <div className="flex flex-col space-y-6 text-lg font-medium">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className="flex justify-between items-center py-4 border-b border-border/50">
                    <span className={location === link.href ? "text-accent" : ""}>
                      {link.label}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
              <div className="pt-6 space-y-4">
                <Link href="/contact">
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-sm py-6 text-lg font-bold">
                    {t("btn.contactUs")}
                  </Button>
                </Link>
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  {SUPPORTED_LANGUAGES.filter(l => (s.enabled_languages || "en,id,vi,ar").split(",").map(x => x.trim()).includes(l.code)).map(l => (
                    <button
                      key={l.code}
                      onClick={() => {
                        const path = window.location.pathname;
                        const stripped = path.replace(/^\/(id|vi|ar)(\/|$)/, "$2") || "/";
                        const newPath = l.code === "en" ? stripped : `/${l.code}${stripped.startsWith("/") ? stripped : "/" + stripped}`;
                        window.location.href = newPath;
                      }}
                      className="text-sm px-3 py-1.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 w-full">{children}</main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground pt-16 pb-8 border-t-4 border-accent relative">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex flex-col mb-6">
                <span className="text-2xl font-bold tracking-tight text-white leading-tight">
                  {s.company_name.toUpperCase().split(" ").map((w, i) => (
                    i === 0 ? <span key={i}>{w} </span> : <span key={i} className="text-accent">{w}</span>
                  ))}
                </span>
                <span className="text-xs uppercase tracking-widest text-primary-foreground/60 font-medium">
                  {s.company_subtitle}
                </span>
              </div>
              <p className="text-primary-foreground/70 text-sm leading-relaxed mb-6">
                {t("footer.desc")}
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">{t("footer.quickLinks")}</h4>
              <ul className="space-y-3 text-sm text-primary-foreground/70">
                <li><Link href="/products"><span className="hover:text-accent cursor-pointer transition-colors">{t("nav.products")}</span></Link></li>
                <li><Link href="/brands"><span className="hover:text-accent cursor-pointer transition-colors">{t("nav.brands")}</span></Link></li>
                <li><Link href="/industries"><span className="hover:text-accent cursor-pointer transition-colors">{t("nav.industries")}</span></Link></li>
                <li><Link href="/articles"><span className="hover:text-accent cursor-pointer transition-colors">{t("nav.articles")}</span></Link></li>
                <li><Link href="/about"><span className="hover:text-accent cursor-pointer transition-colors">{t("nav.about")}</span></Link></li>
                <li><Link href="/contact"><span className="hover:text-accent cursor-pointer transition-colors">{t("nav.contact")}</span></Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">{t("footer.topCategories")}</h4>
              <ul className="space-y-3 text-sm text-primary-foreground/70">
                <li><Link href="/products"><span className="hover:text-accent cursor-pointer transition-colors">{t("cat.pressure.title", "Pressure Transmitters")}</span></Link></li>
                <li><Link href="/products"><span className="hover:text-accent cursor-pointer transition-colors">{t("cat.temp.title", "Temperature Instruments")}</span></Link></li>
                <li><Link href="/products"><span className="hover:text-accent cursor-pointer transition-colors">{t("cat.flow.title", "Flow Meters")}</span></Link></li>
                <li><Link href="/products"><span className="hover:text-accent cursor-pointer transition-colors">{t("cat.valve.title", "Valve Positioners")}</span></Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">{t("contact.title", "Contact Us")}</h4>
              <ul className="space-y-4 text-sm text-primary-foreground/70">
                <li className="flex items-start">
                  <Mail className="w-5 h-5 mr-3 text-accent shrink-0" />
                  <span>{s.email}</span>
                </li>
                <li className="flex items-start">
                  <MessageCircle className="w-5 h-5 mr-3 text-accent shrink-0" />
                  <span>{s.phone} (WhatsApp)</span>
                </li>
                <li className="flex items-start">
                  <MapPin className="w-5 h-5 mr-3 text-accent shrink-0" />
                  <span>{s.address}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-primary-foreground/10 text-xs text-primary-foreground/50 flex flex-col md:flex-row justify-between items-center">
            <p>&copy; {new Date().getFullYear()} {s.copyright}</p>
            <p className="mt-2 md:mt-0">{t("footer.warranty")}</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${s.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#1ebd5a] hover:scale-110 transition-all duration-300 flex items-center justify-center group"
        aria-label="Contact us on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute right-full mr-4 bg-primary text-white text-xs font-bold py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {t("footer.chat")}
        </span>
      </a>
    </div>
  );
}
