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
  const { data, isLoading, isError } = useQuery<ArticlesResponse>({
    queryKey: ["articles-public"],
    queryFn: () =>
      fetch("/api/articles?limit=50").then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      }),
  });

  const articles = data?.data ?? [];

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
              Industry news, technical guides, and company updates from Ahwaz
              Controls.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Article Grid */}
      <section className="py-20 bg-background min-h-[50vh]">
        <div className="container mx-auto px-4 md:px-8">
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
                      <div className="relative h-52 bg-secondary overflow-hidden">
                        {article.coverUrl ? (
                          <img
                            src={article.coverUrl}
                            alt={article.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>

                      {/* Body */}
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <Calendar className="w-3.5 h-3.5" />
                          <time dateTime={article.createdAt}>
                            {formatDate(article.createdAt)}
                          </time>
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
