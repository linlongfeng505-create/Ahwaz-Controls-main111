import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Package, Tag, Layers, FileText, CheckCircle, Mail, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useState, useEffect, useCallback } from "react";

marked.setOptions({ breaks: true, gfm: true });

interface Product {
  id: number;
  name: string;
  model: string;
  category: string;
  description: string;
  specs: string[];
  imageObjectPath: string | null;
  imageUrls: string[];
  recommendedProducts?: Product[];
  createdAt: string;
  updatedAt: string;
}

async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error("Product not found");
  return res.json();
}

/** Auto-rotating image carousel component */
function ImageCarousel({ urls, name }: { urls: string[]; name: string }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const go = useCallback((next: number, dir: 1 | -1) => {
    setDirection(dir);
    setCurrent((next + urls.length) % urls.length);
  }, [urls.length]);

  // Auto-advance every 3 seconds when multiple images
  useEffect(() => {
    if (urls.length <= 1) return;
    const timer = setInterval(() => go(current + 1, 1), 3000);
    return () => clearInterval(timer);
  }, [current, urls.length, go]);

  if (urls.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-sm border-2 border-border bg-muted flex items-center justify-center">
        <Package className="w-24 h-24 text-muted-foreground/30" />
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div className="aspect-[4/3] rounded-sm overflow-hidden border-2 border-border bg-muted">
        <img src={urls[0]} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image with slide animation */}
      <div className="aspect-[4/3] rounded-sm overflow-hidden border-2 border-border bg-muted relative">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.img
            key={current}
            custom={direction}
            variants={{
              enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? "-100%" : "100%", opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeInOut" }}
            src={urls[current]}
            alt={`${name} — image ${current + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Prev / Next arrows */}
        <button
          onClick={() => go(current - 1, -1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => go(current + 1, 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors z-10"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Image counter */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-mono px-2 py-0.5 rounded-full z-10">
          {current + 1} / {urls.length}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i, i > current ? 1 : -1)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? "bg-accent w-4" : "bg-border hover:bg-muted-foreground"
            }`}
            aria-label={`Go to image ${i + 1}`}
          />
        ))}
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {urls.map((url, i) => (
          <button
            key={i}
            onClick={() => go(i, i > current ? 1 : -1)}
            className={`flex-shrink-0 w-16 h-16 rounded-sm overflow-hidden border-2 transition-all ${
              i === current ? "border-accent" : "border-border opacity-60 hover:opacity-100"
            }`}
          >
            <img src={url} alt={`thumbnail ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useSiteSettings();
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground font-mono">Loading product...</div>
        </div>
      </Layout>
    );
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center flex-col gap-4">
          <div className="text-2xl font-bold text-foreground">Product not found</div>
          <Link href="/products" className="text-accent underline font-mono">Back to catalog</Link>
        </div>
      </Layout>
    );
  }

  // Resolve image URLs: prefer gallery, fall back to legacy imageObjectPath
  const imageUrls = product.imageUrls?.length
    ? product.imageUrls
    : product.imageObjectPath
    ? [product.imageObjectPath]
    : [];

  return (
    <Layout>
      <div className="bg-primary pt-24 pb-12 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link href="/products" className="inline-flex items-center gap-2 text-primary-foreground/60 hover:text-primary-foreground font-mono text-sm mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to catalog
            </Link>
            <div className="flex flex-wrap gap-3 mb-4">
              <Badge variant="outline" className="border-primary-foreground/20 text-primary-foreground/70 font-mono text-xs px-3 py-1 bg-primary-foreground/10">{product.category}</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{product.name}</h1>
            <p className="text-xl text-primary-foreground/70 font-mono">{product.model}</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* ── Image carousel ── */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <ImageCarousel urls={imageUrls} name={product.name} />
          </motion.div>

          {/* ── Product info ── */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3 text-accent font-mono text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                Description
              </div>
              <div
                className="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(marked.parse(product.description) as string)
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-sm bg-muted/30">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs font-mono uppercase">
                  <Package className="w-3 h-3" />
                  Category
                </div>
                <div className="font-bold text-foreground">{product.category}</div>
              </div>
              <div className="p-4 border border-border rounded-sm bg-muted/30">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs font-mono uppercase">
                  <Layers className="w-3 h-3" />
                  Model
                </div>
                <div className="font-bold text-foreground font-mono">{product.model}</div>
              </div>
            </div>

            {product.specs && product.specs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-accent font-mono text-xs uppercase tracking-wider">
                  <CheckCircle className="w-4 h-4" />
                  Specifications
                </div>
                <ul className="space-y-2">
                  {product.specs.map((spec, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {spec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-border pt-6 space-y-3">
              <p className="text-sm text-muted-foreground font-mono">Request a quote for this product</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`mailto:${s.email}`}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Email Us
                </a>
                <a
                  href={`https://wa.me/${s.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-sm font-semibold hover:bg-accent/90 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              </div>
            </div>

            {/* Recommended Products */}
            {product.recommendedProducts && product.recommendedProducts.length > 0 && (
              <div className="mt-16 pt-8 border-t border-border">
                <h3 className="text-2xl font-bold mb-6">Recommended Products</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {product.recommendedProducts.map(rec => (
                    <Link key={rec.id} href={`/products/${rec.id}`}>
                      <div className="group cursor-pointer border border-border rounded-sm p-4 hover:border-accent transition-colors flex items-center gap-4 bg-card h-full">
                        {rec.imageObjectPath ? (
                          <div className="w-16 h-16 bg-secondary overflow-hidden shrink-0 border border-border rounded-sm">
                            <img src={rec.imageObjectPath} alt={rec.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-secondary flex items-center justify-center shrink-0 border border-border rounded-sm">
                            <Package className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <h4 className="font-bold text-foreground text-sm group-hover:text-accent transition-colors truncate">{rec.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono truncate">{rec.model}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
