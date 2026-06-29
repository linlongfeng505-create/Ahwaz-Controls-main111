import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { Calendar, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArticleDetail {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverUrl: string | null;
  published: boolean;
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

/** Render plain-text content with paragraph breaks */
function ArticleBody({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length <= 1) {
    // Fallback: split on single newlines
    return (
      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4">
        {content.split("\n").map((line, i) =>
          line.trim() ? (
            <p key={i} className="text-foreground/80 leading-relaxed text-lg">
              {line}
            </p>
          ) : (
            <br key={i} />
          )
        )}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-foreground/80 leading-relaxed text-lg">
          {para}
        </p>
      ))}
    </div>
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

          <div className="container mx-auto px-4 md:px-8 py-12 max-w-3xl">
            {/* Back link */}
            <Link href="/articles">
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors mb-8 group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Back to Articles
              </button>
            </Link>

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
            <div className="mt-16 pt-8 border-t border-border">
              <Link href="/articles">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Articles
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </Layout>
  );
}
