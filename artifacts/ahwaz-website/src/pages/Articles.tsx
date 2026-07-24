import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Calendar, ChevronRight, BookOpen, FileText } from "lucide-react";

interface ArticleListItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  coverUrl: string | null;
  published: boolean;
  brand?: string | null;
  createdAt: string;
}

interface ArticlesResponse {
  data: ArticleListItem[];
  total: number;
  page: number;
  totalPages: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function Articles() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "");

  const { data, isLoading, isError } = useQuery<ArticlesResponse>({
    queryKey: ["articles-public", selectedBrand],
    queryFn: () =>
      fetch(`/api/articles?limit=50${selectedBrand ? `&brand=${encodeURIComponent(selectedBrand)}` : ""}`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      }),
  });

  const { data: brandsData } = useQuery<{ brands: string[] }>({
    queryKey: ["brands-public"],
    queryFn: () => fetch("/api/brands").then(r => r.json()),
  });

  const articles = data?.data ?? [];
  const brands = brandsData?.brands ?? [];

  const handleBrandChange = (b: string) => {
    setSelectedBrand(b);
    const url = new URL(window.location.href);
    if (b) url.searchParams.set("brand", b);
    else url.searchParams.delete("brand");
    window.history.replaceState(null, "", url.pathname + url.search);
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative py-24 bg-primary text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/30 to-transparent" />
        </div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="w-8 h-8 text-accent" />
              <span className="text-accent font-mono text-sm uppercase tracking-widest">
                News &amp; Insights
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
              Latest <span className="text-accent">Articles</span>
            </h1>
            <p className="text-lg text-primary-foreground/70">
              Industry news, technical guides, and company updates from Flonexis
              Controls.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Article Grid */}
      <section className="py-12 bg-background min-h-[50vh]">
        <div className="container mx-auto px-4 md:px-8">
          {/* Brand Filter */}
          {brands.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-10 pb-6 border-b border-border/50">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mr-2">Filter by Brand:</span>
              <button
                onClick={() => handleBrandChange("")}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                  selectedBrand === ""
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:border-accent hover:text-accent"
                }`}
              >
                All Brands
              </button>
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => handleBrandChange(b)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${
                    selectedBrand === b
                      ? "bg-accent text-accent-foreground border-accent"
                      : "bg-muted text-muted-foreground border-border hover:border-accent hover:text-accent"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-lg overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-muted" />
                  <div className="p-6 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="text-center py-24 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Failed to load articles. Please try again later.</p>
            </div>
          )}

          {!isLoading && !isError && articles.length === 0 && (
            <div className="text-center py-24 text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No articles published yet. Check back soon.</p>
            </div>
          )}

          {!isLoading && articles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Link href={`/articles/${article.slug}`}>
                    <article className="group bg-card border border-border rounded-lg overflow-hidden hover:border-accent hover:shadow-xl transition-all duration-300 cursor-pointer h-full flex flex-col">
                      {/* Cover */}
                      <div className="relative h-52 overflow-hidden">
                        {article.coverUrl ? (
                          <img
                            src={article.coverUrl}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary via-primary/80 to-accent/60 flex items-center justify-center relative">
                            {/* Decorative circles */}
                            <div className="absolute top-4 right-4 w-20 h-20 rounded-full border border-white/10" />
                            <div className="absolute bottom-6 left-6 w-12 h-12 rounded-full border border-white/10" />
                            <div className="absolute top-1/2 right-1/4 w-32 h-32 rounded-full bg-white/5" />
                            {/* Diagonal lines */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 20px, white 20px, white 21px)' }} />
                            {/* Title initial */}
                            <span className="text-6xl font-black text-white/20 select-none tracking-tight">
                              {article.title.charAt(0).toUpperCase()}
                            </span>
                            {/* Icon */}
                            <BookOpen className="absolute bottom-4 right-4 w-5 h-5 text-white/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      {/* Body */}
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            <time dateTime={article.createdAt}>
                              {formatDate(article.createdAt)}
                            </time>
                          </div>
                          {article.brand && (
                            <span className="bg-accent/10 text-accent px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                              {article.brand}
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-accent transition-colors leading-snug line-clamp-2">
                          {article.title}
                        </h2>
                        {article.summary && (
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                            {article.summary}
                          </p>
                        )}
                        <div className="mt-4 flex items-center gap-1 text-accent text-sm font-semibold group-hover:gap-2 transition-all">
                          Read more <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
