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
}

const DEFAULTS: SiteSettings = {
  email: "sales@flonexis.com",
  phone: "+86 134 0065 5796",
  whatsapp: "8613400655796",
  company_name: "Flonexis",
  company_subtitle: "Industrial Instrumentation",
  address: "China",
  copyright: "Flonexis. All rights reserved.",
};

const SiteSettingsContext = createContext<SiteSettings>(DEFAULTS);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()),
    staleTime: 60_000,
  });

  const settings = data ?? DEFAULTS;

  // Dynamically update browser tab title whenever company_name changes
  useEffect(() => {
    if (settings.company_name) {
      document.title = `${settings.company_name} | Industrial Instrumentation Supplier`;
    }
  }, [settings.company_name]);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
