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
  email: "sales@ahwazcontrols.com",
  phone: "+86 131 9339 8860",
  whatsapp: "8613193398860",
  company_name: "Ahwaz Controls",
  company_subtitle: "EHUADE Automation",
  address: "China",
  copyright: "Ahwaz Controls (EHUADE Automation). All rights reserved.",
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
