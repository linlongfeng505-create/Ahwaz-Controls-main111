import { useEffect } from "react";

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
}

export function useSEO({
  title,
  description,
  canonicalUrl,
  ogImage,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    if (title) {
      document.title = title.includes("Flonexis") ? title : `${title} | Flonexis`;
    }

    // Helper: upsert meta tag
    function setMeta(attr: "name" | "property", key: string, content: string) {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }

    // 2. Update Description
    if (description) {
      const cleanDesc = description.replace(/<[^>]*>?/gm, "").slice(0, 160);
      setMeta("name", "description", cleanDesc);
      setMeta("property", "og:description", cleanDesc);
      setMeta("name", "twitter:description", cleanDesc);
    }

    // 3. Update OG / Twitter Title
    if (title) {
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }

    // 4. Update Canonical Link
    if (canonicalUrl || typeof window !== "undefined") {
      const href = canonicalUrl || `${window.location.origin}${window.location.pathname}`;
      let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", href);
    }

    // 5. Update Images
    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }

    // 6. Inject Schema.org JSON-LD
    let scriptEl = document.getElementById("page-dynamic-jsonld") as HTMLScriptElement | null;
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = "page-dynamic-jsonld";
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Clean up page dynamic jsonld on unmount
      const el = document.getElementById("page-dynamic-jsonld");
      if (el) el.remove();
    };
  }, [title, description, canonicalUrl, ogImage, jsonLd]);
}
