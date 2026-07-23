import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Calendar, ArrowLeft, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({ breaks: true, gfm: true });

interface ArticleDetail {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverUrl: string | null;
  published: boolean;
  recommendedArticles?: {
    id: number;
    title: string;
    slug: string;
    coverUrl: string | null;
    summary: string | null;
  }[];
  recommendedProducts?: {
    id: number;
    name: string;
    brand: string;
    model: string;
    category: string;
    imageUrl: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Render article content as Markdown → HTML */
function ArticleBody({ content }: { content: string }) {
  const html = DOMPurify.sanitize(marked.parse(content) as string);
  return (
    <div
      className="prose prose-neutral dark:prose-invert max-w-none
        prose-headings:font-bold prose-headings:text-foreground
        prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:text-lg
        prose-a:text-accent prose-a:no-underline hover:prose-a:underline
        prose-strong:text-foreground
        prose-code:text-accent prose-code:bg-muted prose-code:px-1 prose-code:rounded
        prose-pre:bg-muted prose-pre:border prose-pre:border-border
        prose-blockquote:border-l-accent prose-blockquote:text-muted-foreground
        prose-img:rounded-sm prose-img:border prose-img:border-border
        prose-hr:border-border
        prose-ul:text-foreground/80 prose-ol:text-foreground/80"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default function ArticleDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data: article, isLoading, isError } = useQuery<ArticleDetail>({
    queryKey: ["article", slug],
    queryFn: () =>
      fetch(`/api/articles/${slug}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
    enabled: !!slug,
  });

  return (
    <Layout>
      {isLoading && (
        <div className="container mx-auto px-4 md:px-8 py-24 max-w-3xl animate-pulse space-y-6">
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="h-10 bg-muted rounded w-3/4" />
          <div className="h-72 bg-muted rounded" />
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded w-full" />
            ))}
          </div>
        </div>
      )}

      {isError && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="w-20 h-20 mb-6 opacity-20" />
          <h2 className="text-2xl font-bold mb-2 text-foreground">Article Not Found</h2>
          <p className="mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link href="/articles">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Articles
            </Button>
          </Link>
        </div>
      )}

      {!isLoading && article && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Cover Image */}
          {article.coverUrl && (
            <div className="w-full h-72 md:h-96 overflow-hidden bg-secondary">
              <img
                src={article.coverUrl}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="container mx-auto px-4 md:px-8 py-12">
            {/* Back link */}
            <Link href="/articles">
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors mb-8 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Articles
              </button>
            </Link>

            {/* Two-column layout: sidebar + content */}
            {(() => {
              const hasRecommendations =
                (article.recommendedArticles && article.recommendedArticles.length > 0) ||
                (article.recommendedProducts && article.recommendedProducts.length > 0);

              return (
                <div className={hasRecommendations ? "flex flex-col lg:flex-row gap-10" : ""}>
                  {/* Left Sidebar — sticky recommendations */}
                  {hasRecommendations && (
                    <aside className="lg:w-64 xl:w-72 shrink-0 order-2 lg:order-1">
                      <div className="lg:sticky lg:top-28 space-y-8">
                        {/* Recommended Articles — text list, no images */}
                        {article.recommendedArticles && article.recommendedArticles.length > 0 && (
                          <div>
                            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5" />
                              Related Articles
                            </h4>
                            <ul className="space-y-2.5">
                              {article.recommendedArticles.map(rec => (
                                <li key={rec.id}>
                                  <Link href={`/articles/${rec.slug}`}>
                                    <div className="group cursor-pointer p-2.5 rounded-sm border border-transparent hover:border-border hover:bg-muted/40 transition-all">
                                      <h5 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors leading-snug line-clamp-2">
                                        {rec.title}
                                      </h5>
                                      {rec.summary && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                          {rec.summary}
                                        </p>
                                      )}
                                    </div>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommended Products — with images */}
                        {article.recommendedProducts && article.recommendedProducts.length > 0 && (
                          <div>
                            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Package className="w-3.5 h-3.5" />
                              Related Products
                            </h4>
                            <div className="space-y-3">
                              {article.recommendedProducts.map(rec => (
                                <Link key={rec.id} href={`/products/${rec.id}`}>
                                  <div className="group cursor-pointer border border-border rounded-sm overflow-hidden hover:border-accent hover:shadow-md transition-all bg-card">
                                    {rec.imageUrl ? (
                                      <div className="h-32 bg-secondary overflow-hidden">
                                        <img
                                          src={rec.imageUrl}
                                          alt={rec.name}
                                          className="w-full h-full object-contain group-hover:scale-105 transition-transform p-2"
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-32 bg-secondary flex items-center justify-center">
                                        <Package className="w-8 h-8 text-muted-foreground/20" />
                                      </div>
                                    )}
                                    <div className="p-3">
                                      <p className="text-[10px] text-accent font-mono mb-0.5">{rec.brand} · {rec.model}</p>
                                      <h5 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-snug">
                                        {rec.name}
                                      </h5>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{rec.category}</p>
                                    </div>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </aside>
                  )}

                  {/* Right Content — main article */}
                  <div className={`flex-1 min-w-0 order-1 lg:order-2 ${hasRecommendations ? 'max-w-3xl' : 'max-w-3xl mx-auto'}`}>
                    {/* Meta */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Calendar className="w-3.5 h-3.5" />
                      <time dateTime={article.createdAt}>{formatDate(article.createdAt)}</time>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
                      {article.title}
                    </h1>

                    {/* Summary */}
                    {article.summary && (
                      <p className="text-xl text-muted-foreground leading-relaxed mb-10 border-l-4 border-accent pl-4">
                        {article.summary}
                      </p>
                    )}

                    {/* Divider */}
                    <hr className="border-border mb-10" />

                    {/* Content */}
                    <ArticleBody content={article.content} />

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-border">
                      <Link href="/articles">
                        <Button variant="outline">
                          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Articles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </motion.div>
      )}
    </Layout>
  );
}
