import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export interface SiteSettings {
  email: string;
  phone: string;
  whatsapp: string;
  company_name: string;
  company_subtitle: string;
  address: string;
  copyright: string;
  site_description: string;
  og_image: string;
  home_description: string;
  enabled_languages: string;
}

const DEFAULTS: SiteSettings = {
  email: "sales@flonexis.com",
  phone: "+86 134 0065 5796",
  whatsapp: "8613400655796",
  company_name: "Flonexis",
  company_subtitle: "Industrial Instrumentation",
  address: "China",
  copyright: "Flonexis. All rights reserved.",
  site_description: "",
  og_image: "",
  home_description: "Supplying top-tier industrial control systems and precision instruments worldwide. Fast sourcing, competitive pricing, and expert technical support.",
  enabled_languages: "en,id,vi,ar",
};

const SiteSettingsContext = createContext<SiteSettings>(DEFAULTS);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => fetch("/api/settings").then(async r => {
      if (!r.ok) throw new Error("Failed to fetch settings");
      const json = await r.json();
      if (json && json.error) throw new Error(json.error);
      return json;
    }).catch(() => null),
    staleTime: 60_000,
  });

  const settings = data || DEFAULTS;

  // Dynamically update <title>, <meta description>, and Open Graph tags
  useEffect(() => {
    const name = settings.company_name || "Flonexis";
    const desc = settings.site_description;
    const ogImg = settings.og_image;

    // Title
    document.title = `${name} | Industrial Instrumentation Supplier`;

    // Helper: upsert a <meta> tag by name or property
    function setMeta(attr: "name" | "property", key: string, content: string) {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    if (desc) {
      setMeta("name", "description", desc);
      setMeta("property", "og:description", desc);
      setMeta("name", "twitter:description", desc);
    }

    setMeta("property", "og:title", name);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", name);

    if (ogImg) {
      setMeta("property", "og:image", ogImg);
      setMeta("name", "twitter:image", ogImg);
    }
  }, [settings.company_name, settings.site_description, settings.og_image]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
