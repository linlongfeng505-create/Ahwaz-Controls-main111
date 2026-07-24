import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import { LanguageContext, Language } from "@/lib/i18n";
import NotFound from "@/pages/not-found";

import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Brands from "@/pages/Brands";
import Industries from "@/pages/Industries";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";
import Articles from "@/pages/Articles";
import ArticleDetail from "@/pages/ArticleDetail";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/brands" component={Brands} />
      <Route path="/industries" component={Industries} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/admin" component={Admin} />
      <Route path="/articles" component={Articles} />
      <Route path="/articles/:slug" component={ArticleDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { useEffect, useState, useMemo } from "react";

// Setup global fetch interceptor for lang parameter
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === "string" && input.startsWith("/api/")) {
    const url = new URL(input, window.location.origin);
    const lang = (window as any).__APP_LANG;
    if (lang && lang !== "en") {
      url.searchParams.set("lang", lang);
    }
    input = url.toString();
  }
  return originalFetch(input, init);
};

function LanguageWrapper({ children }: { children: React.ReactNode }) {
  // Initialize synchronously to avoid first-render null returning and state bailout issues
  const initialMatch = window.location.pathname.match(/^\/(id|vi|ar)(?:\/|$)/);
  const initialLang = (initialMatch ? initialMatch[1] : "en") as Language;
  const initialBase = initialMatch ? `/${initialLang}` : "";

  const [lang, setLang] = useState<Language>(initialLang);
  const [base, setBase] = useState(initialBase);

  // Set global for fetch interceptor before first render
  if ((window as any).__APP_LANG === undefined) {
    (window as any).__APP_LANG = initialLang;
    document.documentElement.lang = initialLang;
    document.documentElement.dir = initialLang === "ar" ? "rtl" : "ltr";
  }

  useEffect(() => {
    // Just in case location changes without unmounting
    const path = window.location.pathname;
    const match = path.match(/^\/(id|vi|ar)(?:\/|$)/);
    const detectedLang = (match ? match[1] : "en") as Language;
    
    if (lang !== detectedLang) {
      setLang(detectedLang);
      setBase(match ? `/${detectedLang}` : "");
      (window as any).__APP_LANG = detectedLang;
      document.documentElement.lang = detectedLang;
      document.documentElement.dir = detectedLang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang }}>
      <WouterRouter base={base}>
        {children}
      </WouterRouter>
    </LanguageContext.Provider>
  );
}

function App() {
  useEffect(() => {
    fetch("/api/visit", { method: "POST" }).catch(() => {
      // ignore
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SiteSettingsProvider>
        <TooltipProvider>
          <LanguageWrapper>
            <Router />
          </LanguageWrapper>
          <Toaster />
        </TooltipProvider>
      </SiteSettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
