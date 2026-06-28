import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Tag, Layers, FileText, CheckCircle, Mail, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";

interface Product {
  id: number;
  name: string;
  brand: string;
  model: string;
  category: string;
  description: string;
  specs: string[];
  imageObjectPath: string | null;
  createdAt: string;
  updatedAt: string;
}

async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error("Product not found");
  return res.json();
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const s = useSiteSettings();
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  const imageUrl = product?.imageObjectPath
    ? `/api/storage${product.imageObjectPath}`
    : null;

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
              <Badge className="bg-accent text-accent-foreground font-mono text-xs px-3 py-1">{product.brand}</Badge>
              <Badge variant="outline" className="border-primary-foreground/20 text-primary-foreground/70 font-mono text-xs px-3 py-1">{product.category}</Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{product.name}</h1>
            <p className="text-xl text-primary-foreground/70 font-mono">{product.model}</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            {imageUrl ? (
              <div className="aspect-[4/3] rounded-sm overflow-hidden border-2 border-border bg-muted">
                <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-sm border-2 border-border bg-muted flex items-center justify-center">
                <Package className="w-24 h-24 text-muted-foreground/30" />
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-3 text-accent font-mono text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                Description
              </div>
              <p className="text-foreground/80 leading-relaxed text-lg">{product.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-border rounded-sm bg-muted/30">
                <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs font-mono uppercase">
                  <Tag className="w-3 h-3" />
                  Brand
                </div>
                <div className="font-bold text-foreground">{product.brand}</div>
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
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
