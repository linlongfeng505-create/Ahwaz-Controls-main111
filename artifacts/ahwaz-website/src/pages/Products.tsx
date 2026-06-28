import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowRight, Package, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useState } from "react";

interface Product {
  id: number;
  name: string;
  brand: string;
  model: string;
  category: string;
  description: string;
  specs: string[];
  imageObjectPath: string | null;
}

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CATEGORIES = [
  "Pressure Transmitters",
  "Temperature Instruments",
  "Flow Meters",
  "Valve Positioners",
  "Safety / ESD Devices",
  "Actuators",
  "Field Communicators",
];

const HARDCODED_CATEGORIES = [
  {
    id: "pressure",
    title: "Pressure Transmitters",
    description: "Absolute, gauge, and differential pressure measurement.",
    image: "/images/cat-pressure.png",
    models: [
      { brand: "Rosemount", model: "3051 Series", desc: "Industry standard for pressure measurement." },
      { brand: "Rosemount", model: "1151DR", desc: "Alphaline analog pressure transmitter." },
      { brand: "Honeywell", model: "SmartLine STR800", desc: "High performance differential pressure." },
      { brand: "Yokogawa", model: "EJA Series", desc: "DPharp electronic transmitter." },
    ]
  },
  {
    id: "temperature",
    title: "Temperature Instruments",
    description: "Sensors, transmitters, and thermowells.",
    image: "/images/cat-temperature.png",
    models: [
      { brand: "Rosemount", model: "848T", desc: "Wireless temperature transmitter." },
      { brand: "Rosemount", model: "214C / 3144P / 114C", desc: "Complete temperature measurement kit." },
      { brand: "Rosemount", model: "644 Series", desc: "Versatile temperature transmitter." },
    ]
  },
  {
    id: "flow",
    title: "Flow Meters",
    description: "Accurate measurement of liquid and gas flow rates.",
    image: "/images/cat-flow.png",
    models: [
      { brand: "Micro Motion", model: "Coriolis", desc: "Elite series mass flow and density meters." },
      { brand: "Yokogawa", model: "ADMAG", desc: "Magnetic flow meter series." },
      { brand: "Yokogawa", model: "digitalYEWFLO", desc: "Vortex flow meters." },
      { brand: "Various", model: "Rotameter", desc: "Metal tube variable area flow meters." },
    ]
  },
  {
    id: "positioners",
    title: "Valve Positioners",
    description: "Precise pneumatic and digital control.",
    image: "/images/cat-valves.png",
    models: [
      { brand: "Siemens", model: "SIPART PS2", desc: "6DR5110-0NN00-0AA0 electro-pneumatic." },
      { brand: "Fisher", model: "FIELDVUE", desc: "Digital valve controllers." },
      { brand: "Azbil", model: "AVP301/302", desc: "Smart valve positioners." },
      { brand: "SAMSON", model: "Type 3730", desc: "Electropneumatic positioner." },
    ]
  },
  {
    id: "safety",
    title: "Safety / ESD Devices",
    description: "Emergency shutdown and safety instrumented systems.",
    image: "/images/cat-safety.png",
    models: [
      { brand: "Azbil", model: "Smart ESD 700 Series", desc: "AVP77x/78x/79x emergency shutdown controllers." },
    ]
  },
  {
    id: "actuators",
    title: "Actuators",
    description: "Reliable mechanical actuation for valves.",
    image: "/images/cat-actuators.png",
    models: [
      { brand: "Fisher", model: "2052", desc: "Spring-and-Diaphragm Rotary Actuator." },
    ]
  },
  {
    id: "communicators",
    title: "Field Communicators",
    description: "Handheld diagnostic and configuration tools.",
    image: "/images/cat-communicators.png",
    models: [
      { brand: "Fluke", model: "HART Communicator", desc: "Compatible with all HART devices." },
    ]
  }
];

const PAGE_SIZE = 12;

export default function Products() {
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
    ...(selectedCategory ? { category: selectedCategory } : {}),
  });

  const { data: result, isLoading } = useQuery<ProductsResponse>({
    queryKey: ["products", page, selectedCategory],
    queryFn: () => fetch(`/api/products?${params}`).then(r => r.json()),
    placeholderData: prev => prev,
  });

  const products = result?.data ?? [];
  const totalPages = result?.totalPages ?? 0;
  const total = result?.total ?? 0;
  const hasDbProducts = total > 0 || (result !== undefined && !isLoading);

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat);
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const showHardcoded = result !== undefined && total === 0 && !selectedCategory;

  return (
    <Layout>
      <div className="bg-primary pt-24 pb-16 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Product Catalog</h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl font-mono">
              We supply genuine industrial instrumentation from the world's leading manufacturers.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-12">

        {/* DB Products Section */}
        {!showHardcoded && (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar filters */}
            <aside className="w-full lg:w-56 shrink-0">
              <div className="sticky top-28 space-y-1">
                <p className="text-xs font-mono text-muted-foreground uppercase mb-3">Filter by Category</p>
                <button
                  onClick={() => handleCategoryChange("")}
                  className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                    selectedCategory === ""
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  All Categories
                  {total > 0 && !selectedCategory && (
                    <span className="ml-2 text-xs opacity-60">({total})</span>
                  )}
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </aside>

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              {/* Results header */}
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <p className="text-sm text-muted-foreground font-mono">
                  {isLoading ? "Loading..." : total === 0
                    ? "No products found"
                    : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total} products`}
                </p>
                {selectedCategory && (
                  <button
                    onClick={() => handleCategoryChange("")}
                    className="inline-flex items-center gap-1 text-xs text-accent hover:underline font-mono"
                  >
                    <X className="w-3 h-3" /> Clear filter
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div key={i} className="h-56 bg-muted animate-pulse rounded-sm" />
                  ))}
                </div>
              ) : total === 0 ? (
                <div className="text-center py-24 border border-dashed border-border rounded-sm">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground font-mono">No products in this category yet.</p>
                  <button onClick={() => handleCategoryChange("")} className="mt-4 text-sm text-accent hover:underline font-mono">
                    View all categories
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {products.map((product, i) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <Link href={`/products/${product.id}`}>
                          <Card className="h-full p-5 border-border hover:border-accent transition-colors cursor-pointer group flex flex-col">
                            {product.imageObjectPath ? (
                              <div className="aspect-video rounded-sm overflow-hidden border border-border mb-4">
                                <img
                                  src={`/api/storage${product.imageObjectPath}`}
                                  alt={product.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                            ) : (
                              <div className="aspect-video rounded-sm border border-border mb-4 bg-muted flex items-center justify-center">
                                <Package className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                            )}
                            <Badge variant="outline" className="mb-2 text-xs font-mono text-primary border-primary/20 bg-primary/5 w-fit">
                              {product.brand}
                            </Badge>
                            <h3 className="text-base font-bold text-foreground mb-1 leading-snug">{product.name}</h3>
                            <p className="text-xs font-mono text-muted-foreground mb-2">{product.model}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">{product.description}</p>
                            <div className="flex items-center gap-1 text-accent text-xs font-mono mt-4 group-hover:gap-2 transition-all">
                              View details <ArrowRight className="w-3 h-3" />
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 rounded-sm border border-border hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                        const isEllipsis =
                          totalPages > 7 &&
                          p !== 1 &&
                          p !== totalPages &&
                          Math.abs(p - page) > 2;
                        const showEllipsisBefore =
                          totalPages > 7 && p === page - 3 && p > 2;
                        const showEllipsisAfter =
                          totalPages > 7 && p === page + 3 && p < totalPages - 1;

                        if (isEllipsis && !showEllipsisBefore && !showEllipsisAfter) return null;
                        if (showEllipsisBefore)
                          return (
                            <span key={p} className="text-muted-foreground px-1 text-sm font-mono">
                              …
                            </span>
                          );
                        if (showEllipsisAfter)
                          return (
                            <span key={p} className="text-muted-foreground px-1 text-sm font-mono">
                              …
                            </span>
                          );

                        return (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`w-9 h-9 rounded-sm text-sm font-mono border transition-colors ${
                              p === page
                                ? "bg-primary text-primary-foreground border-primary font-bold"
                                : "border-border hover:border-accent hover:text-accent"
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === totalPages}
                        className="p-2 rounded-sm border border-border hover:border-accent hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Fallback hardcoded catalog when no DB products */}
        {showHardcoded && (
          <div className="space-y-24">
            {HARDCODED_CATEGORIES.map((category) => (
              <motion.section
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                id={category.id}
              >
                <div className="flex flex-col lg:flex-row gap-12 items-start">
                  <div className="w-full lg:w-1/3 sticky top-28">
                    <div className="aspect-[4/3] rounded-sm overflow-hidden border-2 border-border mb-6">
                      <img src={category.image} alt={category.title} className="w-full h-full object-cover" />
                    </div>
                    <h2 className="text-3xl font-bold text-foreground mb-3">{category.title}</h2>
                    <p className="text-muted-foreground">{category.description}</p>
                  </div>
                  <div className="w-full lg:w-2/3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.models.map((model, i) => (
                        <Card key={i} className="p-6 border-border hover:border-accent transition-colors">
                          <Badge variant="outline" className="mb-4 text-xs font-mono text-primary border-primary/20 bg-primary/5">{model.brand}</Badge>
                          <h3 className="text-xl font-bold text-foreground mb-2">{model.model}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{model.desc}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
