import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, X, Upload, Lock, LogOut, Package, Settings, Inbox, Mail, Building2, Phone, Trash, FileText, BookOpen, Eye, EyeOff, Tag, Download, Database } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Configure marked for safe, clean output
marked.setOptions({ breaks: true, gfm: true });

interface Product {
  id: number;
  name: string;
  model: string;
  category: string;
  description: string;
  specs: string[];
  imageObjectPath: string | null;
  imageUrls: string[];  // gallery images
  recommendedProductIds?: number[];
  translations?: Record<string, any>;
  createdAt: string;
}

interface Submission {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  message: string;
  read: boolean;
  createdAt: string;
}

interface SiteSettings {
  email: string;
  phone: string;
  whatsapp: string;
  company_name: string;
  company_subtitle: string;
  address: string;
  copyright: string;
  product_categories: string;
  wecom_webhook: string;
  enable_visitor_report: string;
  site_description: string;
  og_image: string;
}


const DEFAULT_CATEGORIES = [
  "Pressure Transmitters",
  "Temperature Instruments",
  "Flow Meters",
  "Valve Positioners",
  "Safety / ESD Devices",
  "Actuators",
  "Field Communicators",
];

function parseCategories(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_CATEGORIES;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

interface ArticleItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverUrl: string | null;
  published: boolean;
  recommendedArticleIds?: number[];
  recommendedProductIds?: number[];
  translations?: Record<string, any>;
  brand?: string | null;
  category?: string | null;
  createdAt: string;
}

interface EmptyArticleForm {
  title: string;
  slug: string;
  summary: string;
  content: string;
  published: boolean;
  coverDataUrl: string | null;
  removeCover: boolean;
  existingCoverUrl: string | null;
  recommendedArticleIds: number[];
  recommendedProductIds: number[];
  translations: Record<string, any>;
  brand: string;
  category: string;
}



const STORAGE_KEY = "flonexis_admin_pw";

const emptyForm = {
  name: "",
  model: "",
  category: "",
  description: "",
  specs: [""],
  imageObjectPath: null as string | null,
  imageDataUrl: null as string | null,
  removeImage: false,
  // multi-image gallery
  galleryUrls: [] as string[],      // existing server URLs (edit mode)
  galleryDataUrls: [] as string[],  // newly picked local data URLs
  deleteImageIds: [] as number[],   // IDs to delete on save
  recommendedProductIds: [] as number[],
  translations: {} as Record<string, any>,
};

/**
 * Compress an image File using the Canvas API before upload.
 * Resizes to maxWidth (default 1200px) and re-encodes as JPEG at the given quality (0–1).
 * Returns a compressed Blob. No third-party libraries required.
 */
function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

async function apiFetch(path: string, options: RequestInit = {}, pw: string) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": pw,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export default function Admin() {
  const [password, setPassword] = useState(() => sessionStorage.getItem(STORAGE_KEY) ?? "");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"products" | "submissions" | "settings" | "articles">("products");
  const [openSubmission, setOpenSubmission] = useState<Submission | null>(null);

  // Product form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");
  const [recProductSearchProd, setRecProductSearchProd] = useState("");
  const [descTab, setDescTab] = useState<"write" | "preview">("write");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"general" | "seo" | "categories" | "database">("general");

  // Category management state (within settings)
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [dbDownloading, setDbDownloading] = useState(false);
  const [dbRestoring, setDbRestoring] = useState(false);
  const dbUploadRef = useRef<HTMLInputElement>(null);

  // Article form state
  const emptyArticleForm: EmptyArticleForm = {
    title: "",
    slug: "",
    summary: "",
    content: "",
    published: false,
    coverDataUrl: null,
    removeCover: false,
    existingCoverUrl: null,
    recommendedArticleIds: [],
    recommendedProductIds: [],
    translations: {},
    brand: "",
    category: "",
  };
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [articleEditId, setArticleEditId] = useState<number | null>(null);
  const [articleForm, setArticleForm] = useState<EmptyArticleForm>({ ...emptyArticleForm });
  const [articleFormError, setArticleFormError] = useState("");
  const articleCoverRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: () => fetch("/api/products?limit=1000").then(r => r.json()).then(res => res.data ?? res),
    enabled: authed,
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<Submission[]>({
    queryKey: ["admin-submissions"],
    queryFn: () => apiFetch("/api/submissions", {}, password),
    enabled: authed,
    refetchInterval: activeTab === "submissions" ? 30_000 : false,
  });

  const unreadCount = submissions.filter(s => !s.read).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/submissions/${id}/read`, { method: "PATCH" }, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-submissions"] }),
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/submissions/${id}`, { method: "DELETE" }, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-submissions"] });
      setOpenSubmission(null);
    },
  });

  const { data: settingsData } = useQuery<SiteSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => fetch("/api/settings").then(r => r.json()),
    enabled: authed,
  });

  // Keep local settings form in sync with fetched data (only on first load)
  const currentSettings = settingsForm ?? settingsData ?? null;

  // Derive the live category list from settings
  const categories = parseCategories(currentSettings?.product_categories);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      
      if (res.ok) {
        sessionStorage.setItem(STORAGE_KEY, password);
        setAuthed(true);
        setAuthError("");
      } else {
        setAuthError(data.error || "Incorrect password");
      }
    } catch (err) {
      setAuthError("Network error. Please try again.");
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setPassword("");
    setAuthed(false);
    setSettingsForm(null);
  }

  function openAdd() {
    setForm({ ...emptyForm, category: categories[0] ?? "" });
    setEditId(null);
    setFormError("");
    setDescTab("write");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      model: p.model,
      category: p.category,
      description: p.description,
      specs: p.specs.length ? [...p.specs] : [""],
      imageObjectPath: p.imageObjectPath,
      imageDataUrl: null,
      removeImage: false,
      galleryUrls: p.imageUrls ?? (p.imageObjectPath ? [p.imageObjectPath] : []),
      galleryDataUrls: [],
      deleteImageIds: [],
      recommendedProductIds: p.recommendedProductIds ?? [],
      translations: p.translations ?? {},
    });
    setEditId(p.id);
    setFormError("");
    setDescTab("write");
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { imageObjectPath, imageDataUrl, removeImage, galleryUrls, galleryDataUrls, deleteImageIds, translations, ...rest } = form;
      const body = {
        ...rest,
        brand: "",
        specs: rest.specs.filter(s => s.trim()),
        translations,
        ...(removeImage ? { removeImage: true } : {}),
        ...(imageDataUrl ? { imageDataUrl } : {}),
        ...(galleryDataUrls.length > 0 ? { extraImageDataUrls: galleryDataUrls } : {}),
        ...(deleteImageIds.length > 0 ? { deleteImageIds } : {}),
      };
      if (editId !== null) {
        return apiFetch(`/api/products/${editId}`, { method: "PUT", body: JSON.stringify(body) }, password);
      } else {
        return apiFetch("/api/products", { method: "POST", body: JSON.stringify(body) }, password);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setShowForm(false);
      setFormError("");
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/products/${id}`, { method: "DELETE" }, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () => apiFetch("/api/settings", { method: "PUT", body: JSON.stringify(currentSettings) }, password),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      setSettingsForm(data);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    },
  });

  async function handleDbDownload() {
    setDbDownloading(true);
    try {
      const res = await fetch("/api/admin/db-download", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Download failed");
        return;
      }
      const blob = await res.blob();
      const dateStr = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ahwaz-backup-${dateStr}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDbDownloading(false);
    }
  }

  async function handleDbRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!confirm("Are you sure you want to restore the database? This will overwrite ALL current data (products, settings, etc.) and the server will restart. Proceed?")) {
      e.target.value = "";
      return;
    }

    setDbRestoring(true);
    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Result is "data:application/octet-stream;base64,..."
          resolve(result.split(",")[1]); 
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const res = await fetch("/api/admin/db-restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ dbFileBase64: base64 }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Restore failed");
        return;
      }
      
      alert("Database restored successfully! The server is restarting, please wait a few seconds and then refresh the page.");
      window.location.reload();
    } catch (err: any) {
      alert("Error reading file: " + err.message);
    } finally {
      setDbRestoring(false);
      e.target.value = "";
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.brand || !form.model || !form.description) {
      setFormError("Please fill all required fields.");
      return;
    }
    saveMutation.mutate();
  }

  function updateSpec(i: number, val: string) {
    const s = [...form.specs];
    s[i] = val;
    setForm(f => ({ ...f, specs: s }));
  }

  function updateSettings(key: keyof SiteSettings, value: string) {
    setSettingsForm(prev => ({ ...(prev ?? settingsData!), [key]: value }));
  }

  function addCategory() {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const current = parseCategories(currentSettings?.product_categories);
    if (current.includes(trimmed)) return;
    const updated = [...current, trimmed];
    updateSettings("product_categories", JSON.stringify(updated));
    setNewCategoryInput("");
  }

  function removeCategory(cat: string) {
    const current = parseCategories(currentSettings?.product_categories);
    const updated = current.filter(c => c !== cat);
    updateSettings("product_categories", JSON.stringify(updated));
    // If current product form has this category selected, reset to first
    if (form.category === cat) {
      setForm(f => ({ ...f, category: updated[0] ?? "" }));
    }
  }

  if (!authed) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
            <div className="border border-border rounded-sm p-8 bg-card">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-5 h-5 text-accent" />
                <h1 className="text-xl font-bold text-foreground">Admin Login</h1>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground font-mono text-sm focus:outline-none focus:border-accent"
                    placeholder="Enter admin password"
                    required
                  />
                </div>
                {authError && <p className="text-red-500 text-xs font-mono">{authError}</p>}
                <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-sm font-semibold hover:bg-primary/90 transition-colors">
                  Login
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="bg-primary pt-24 pb-10 text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">Admin Panel</h1>
            <p className="text-primary-foreground/60 font-mono text-sm">Manage products and site settings</p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 border border-primary-foreground/20 text-primary-foreground/70 px-4 py-2 rounded-sm hover:border-primary-foreground/50 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-background sticky top-20 z-20">
        <div className="container mx-auto px-4 md:px-8 flex gap-0">
          <button
            onClick={() => setActiveTab("products")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "products" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4" />
            Products
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "submissions" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Inbox className="w-4 h-4" />
            Enquiries
            {unreadCount > 0 && (
              <span className="bg-accent text-accent-foreground text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "settings" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-4 h-4" />
            Site Settings
          </button>
          <button
            onClick={() => setActiveTab("articles")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "articles" ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Articles
          </button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="container mx-auto px-4 md:px-8 py-10">
          <div className="flex justify-end mb-6">
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2 rounded-sm font-semibold hover:bg-accent/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>

          {productsLoading ? (
            <div className="text-muted-foreground font-mono">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border rounded-sm">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-mono">No products yet. Add your first product.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Product</th>
                    <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Model</th>
                    <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Category</th>
                    <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Image</th>
                    <th className="pb-3 font-mono text-xs text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 pr-4 font-medium text-foreground">{p.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{p.model}</td>
                      <td className="py-3 pr-4 text-muted-foreground text-xs">{p.category}</td>
                      <td className="py-3 pr-4">
                        {p.imageObjectPath ? (
                          <img src={p.imageObjectPath ?? ""} alt="" className="w-10 h-10 object-cover rounded-sm border border-border" />
                        ) : (
                          <span className="text-muted-foreground/40 text-xs font-mono">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === "submissions" && (
        <div className="container mx-auto px-4 md:px-8 py-10">
          {submissionsLoading ? (
            <div className="text-muted-foreground font-mono">Loading enquiries...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border rounded-sm">
              <Inbox className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-mono">No enquiries yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map(sub => (
                <div
                  key={sub.id}
                  onClick={() => {
                    setOpenSubmission(sub);
                    if (!sub.read) markReadMutation.mutate(sub.id);
                  }}
                  className={`border rounded-sm p-5 cursor-pointer hover:border-accent transition-colors ${
                    sub.read ? "border-border bg-background" : "border-accent/40 bg-accent/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {!sub.read && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-sm">{sub.name}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Building2 className="w-3 h-3" /> {sub.company}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Mail className="w-3 h-3" /> {sub.email}
                          </span>
                          {sub.phone && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono">
                              <Phone className="w-3 h-3" /> {sub.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(sub.createdAt).toLocaleString()}
                      </span>
                      {!sub.read && (
                        <Badge variant="outline" className="text-xs border-accent text-accent">New</Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2 pl-5">{sub.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Submission detail modal */}
          {openSubmission && (
            <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
              <div className="min-h-full flex items-start justify-center px-4 py-12">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-sm w-full max-w-lg"
              >
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                  <h2 className="text-lg font-bold text-foreground">Enquiry Details</h2>
                  <button onClick={() => setOpenSubmission(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Name</p>
                      <p className="font-semibold text-foreground">{openSubmission.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Company</p>
                      <p className="font-semibold text-foreground">{openSubmission.company}</p>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Email</p>
                      <a href={`mailto:${openSubmission.email}`} className="text-accent hover:underline font-mono text-xs">
                        {openSubmission.email}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Phone</p>
                      <p className="font-mono text-xs text-foreground">{openSubmission.phone ?? "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Received</p>
                      <p className="font-mono text-xs text-foreground">{new Date(openSubmission.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase mb-2">Message / RFQ</p>
                    <div className="bg-muted rounded-sm p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {openSubmission.message}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 flex-wrap">
                    <a
                      href={`mailto:${openSubmission.email}?subject=Re: Your enquiry at Flonexis`}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-sm font-semibold hover:bg-primary/90 transition-colors text-sm"
                    >
                      <Mail className="w-4 h-4" /> Reply by Email
                    </a>
                    <button
                      onClick={() => {
                        if (confirm("Delete this enquiry?")) deleteSubmissionMutation.mutate(openSubmission.id);
                      }}
                      className="inline-flex items-center gap-2 border border-red-200 text-red-500 hover:bg-red-50 px-5 py-2 rounded-sm font-semibold transition-colors text-sm"
                    >
                      <Trash className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </motion.div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sub-tab Navigation */}
            <div className="w-full md:w-48 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-border md:pr-4 scrollbar-hide">
              {[
                { id: "general", label: "General Config" },
                { id: "seo", label: "SEO & Copy" },
                { id: "categories", label: "Categories" },
                { id: "database", label: "Database / Backup" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id as any)}
                  className={`text-left px-3 py-2 rounded-sm text-sm font-semibold whitespace-nowrap transition-colors ${
                    settingsTab === tab.id
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-tab Content */}
            <div className="flex-1">
              {!currentSettings ? (
                <div className="text-muted-foreground font-mono">Loading settings...</div>
              ) : (
                <div className="space-y-6">
                  {/* General Config Tab */}
                  {settingsTab === "general" && (
                    <form onSubmit={e => { e.preventDefault(); saveSettingsMutation.mutate(); }} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {(
                          [
                            { key: "company_name", label: "Company Name", placeholder: "Flonexis" },
                            { key: "company_subtitle", label: "Company Subtitle", placeholder: "EHUADE Automation" },
                            { key: "email", label: "Email Address", placeholder: "sales@example.com" },
                            { key: "phone", label: "Phone Number", placeholder: "+86 131 9339 8860" },
                            { key: "whatsapp", label: "WhatsApp Number", placeholder: "8613193398860 (digits only, no +)" },
                            { key: "address", label: "Address / Location", placeholder: "China" },
                          ] as { key: keyof SiteSettings; label: string; placeholder: string }[]
                        ).map(field => (
                          <div key={field.key} className={field.key === "address" ? "md:col-span-2" : ""}>
                            <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">{field.label}</label>
                            <input
                              value={currentSettings[field.key]}
                              onChange={e => updateSettings(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                            />
                            {field.key === "whatsapp" && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">Digits only, no + sign. E.g. 8613193398860</p>
                            )}
                          </div>
                        ))}

                        <div className="md:col-span-2">
                          <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Copyright Text</label>
                          <input
                            value={currentSettings.copyright}
                            onChange={e => updateSettings("copyright", e.target.value)}
                            placeholder="Flonexis. All rights reserved."
                            className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                          />
                          <p className="text-xs text-muted-foreground mt-1 font-mono">The year is added automatically.</p>
                        </div>

                        <div className="md:col-span-2 border-t border-border pt-5">
                          <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">
                            企业微信群机器人 Webhook URL
                          </label>
                          <input
                            value={currentSettings.wecom_webhook ?? ""}
                            onChange={e => updateSettings("wecom_webhook", e.target.value)}
                            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx"
                            className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            填入后，每次收到询价表单时自动向企业微信群发送通知。
                          </p>
                        </div>

                        <div className="md:col-span-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="enable_visitor_report"
                            checked={currentSettings.enable_visitor_report === "true"}
                            onChange={e => updateSettings("enable_visitor_report", e.target.checked ? "true" : "false")}
                            className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                          />
                          <label htmlFor="enable_visitor_report" className="text-sm font-semibold text-foreground">
                            启用访客日报推送
                          </label>
                          <span className="text-xs text-muted-foreground font-mono ml-2">
                            (每天早上 8 点统计发送至 Webhook)
                          </span>
                        </div>

                        <div className="md:col-span-2 border-t border-border pt-5">
                          <label className="block text-xs font-mono text-muted-foreground mb-3 uppercase">
                            Enabled Languages
                          </label>
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 opacity-60 cursor-not-allowed">
                              <input type="checkbox" checked={true} readOnly className="w-4 h-4 text-accent border-border rounded" />
                              <label className="text-sm font-semibold text-foreground">English (en) - Primary Language</label>
                            </div>
                            {[
                              { code: "id", label: "Indonesian (id)" },
                              { code: "vi", label: "Vietnamese (vi)" },
                              { code: "ar", label: "Arabic (ar)" }
                            ].map(lang => {
                              const isEnabled = (currentSettings.enabled_languages || "en,id,vi,ar").includes(lang.code);
                              return (
                                <div key={lang.code} className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`enable_${lang.code}`}
                                    checked={isEnabled}
                                    onChange={(e) => {
                                      const current = (currentSettings.enabled_languages || "en,id,vi,ar").split(",").map(s => s.trim()).filter(Boolean);
                                      let updated = [];
                                      if (e.target.checked) {
                                        updated = Array.from(new Set([...current, lang.code]));
                                      } else {
                                        updated = current.filter(c => c !== lang.code);
                                      }
                                      // Ensure "en" is always included
                                      if (!updated.includes("en")) updated.unshift("en");
                                      updateSettings("enabled_languages", updated.join(","));
                                    }}
                                    className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                                  />
                                  <label htmlFor={`enable_${lang.code}`} className="text-sm font-semibold text-foreground cursor-pointer">
                                    {lang.label}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 font-mono">
                            Disabled languages will be hidden from the website's language switcher, and direct links will redirect to English.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 pt-4 border-t border-border">
                        <button
                          type="submit"
                          disabled={saveSettingsMutation.isPending}
                          className="bg-primary text-primary-foreground px-8 py-2.5 rounded-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                        >
                          {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                        </button>
                        {settingsSaved && <span className="text-sm text-green-600 font-mono">Saved successfully</span>}
                      </div>
                    </form>
                  )}

                  {/* SEO & Copy Tab */}
                  {settingsTab === "seo" && (
                    <form onSubmit={e => { e.preventDefault(); saveSettingsMutation.mutate(); }} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div>
                        <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">
                          Homepage Description
                          <span className="ml-1 normal-case text-muted-foreground/60">（首页大标题下方的正文描述）</span>
                        </label>
                        <textarea
                          value={currentSettings.home_description ?? ""}
                          onChange={e => updateSettings("home_description", e.target.value)}
                          rows={4}
                          placeholder="Supplying top-tier industrial control systems and precision instruments worldwide..."
                          className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1 font-mono">这段文字将直接显示在首页大标题下方，介绍公司的核心定位。</p>
                      </div>

                      <div className="border-t border-border pt-5">
                        <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">
                          Site Description
                          <span className="ml-1 normal-case text-muted-foreground/60">(meta description)</span>
                        </label>
                        <textarea
                          value={currentSettings.site_description ?? ""}
                          onChange={e => updateSettings("site_description", e.target.value)}
                          rows={3}
                          placeholder="一句话介绍公司，最大 160 字符。"
                          className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-none"
                        />
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          建议 120–160 字符，显示在搜索结果摘要中。
                          <span className={`ml-1 ${(currentSettings.site_description ?? "").length > 160 ? "text-red-500" : "text-muted-foreground/50"}`}>
                            {(currentSettings.site_description ?? "").length}/160
                          </span>
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">
                          OG Image URL
                          <span className="ml-1 normal-case text-muted-foreground/60">（微信/社媒分享封面图）</span>
                        </label>
                        <input
                          value={currentSettings.og_image ?? ""}
                          onChange={e => updateSettings("og_image", e.target.value)}
                          placeholder="https://yourdomain.com/images/og-cover.jpg"
                          className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1 font-mono">建议尺寸 1200×630px。</p>
                        {currentSettings.og_image && (
                          <img src={currentSettings.og_image} alt="OG preview" className="mt-2 h-20 rounded-sm border border-border object-cover" />
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-4 border-t border-border">
                        <button
                          type="submit"
                          disabled={saveSettingsMutation.isPending}
                          className="bg-primary text-primary-foreground px-8 py-2.5 rounded-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                        >
                          {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                        </button>
                        {settingsSaved && <span className="text-sm text-green-600 font-mono">Saved successfully</span>}
                      </div>
                    </form>
                  )}

                  {/* Categories Tab */}
                  {settingsTab === "categories" && (
                    <form onSubmit={e => { e.preventDefault(); saveSettingsMutation.mutate(); }} className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-accent" />
                        <h3 className="text-sm font-semibold text-foreground">Product Categories</h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {categories.map(cat => (
                          <span
                            key={cat}
                            className="inline-flex items-center gap-1.5 bg-muted text-foreground text-xs font-mono px-3 py-1.5 rounded-full border border-border"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() => removeCategory(cat)}
                              className="text-muted-foreground hover:text-red-500 transition-colors ml-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {categories.length === 0 && (
                          <p className="text-xs text-muted-foreground font-mono">No categories yet. Add one below.</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryInput}
                          onChange={e => setNewCategoryInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
                          placeholder="New category name..."
                          className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={addCategory}
                          disabled={!newCategoryInput.trim()}
                          className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-4 py-2 rounded-sm font-semibold hover:bg-accent/90 transition-colors disabled:opacity-40 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-2">Categories define the structure of your product catalog.</p>

                      <div className="flex items-center gap-4 pt-4 border-t border-border mt-6">
                        <button
                          type="submit"
                          disabled={saveSettingsMutation.isPending}
                          className="bg-primary text-primary-foreground px-8 py-2.5 rounded-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                        >
                          {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                        </button>
                        {settingsSaved && <span className="text-sm text-green-600 font-mono">Saved successfully</span>}
                      </div>
                    </form>
                  )}

                  {/* Database / Backup Tab */}
                  {settingsTab === "database" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="border border-border rounded-sm p-6 bg-background">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-5 h-5 text-accent" />
                          <h3 className="text-base font-semibold text-foreground">Database Export</h3>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono mb-5">
                          Download the complete SQLite database as a single file. WAL data will be automatically merged before download.
                        </p>
                        <button
                          type="button"
                          onClick={handleDbDownload}
                          disabled={dbDownloading}
                          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                        >
                          {dbDownloading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                              Merging &amp; Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4" />
                              Download Database (.db)
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mt-8 border border-red-200 bg-red-50/50 rounded-sm p-6">
                        <div className="flex items-center gap-2 mb-2">
                          <Upload className="w-5 h-5 text-red-600" />
                          <h3 className="text-base font-semibold text-red-700">Restore Database (Danger Zone)</h3>
                        </div>
                        <p className="text-sm text-red-700/80 font-mono mb-5">
                          Uploading a backup will overwrite all current data (products, settings, articles, submissions). 
                          The server will automatically restart. Proceed with caution.
                        </p>
                        <input
                          type="file"
                          accept=".db,.sqlite"
                          ref={dbUploadRef}
                          onChange={handleDbRestore}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => dbUploadRef.current?.click()}
                          disabled={dbRestoring}
                          className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                        >
                          {dbRestoring ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Restoring &amp; Restarting...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Restore Database
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Articles Tab */}
      {activeTab === "articles" && (
        <ArticlesTab
          password={password}
          qc={qc}
          showArticleForm={showArticleForm}
          setShowArticleForm={setShowArticleForm}
          articleEditId={articleEditId}
          setArticleEditId={setArticleEditId}
          articleForm={articleForm}
          setArticleForm={setArticleForm}
          articleFormError={articleFormError}
          setArticleFormError={setArticleFormError}
          articleCoverRef={articleCoverRef}
          emptyArticleForm={emptyArticleForm}
        />
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[100] overflow-hidden flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-sm w-full max-w-2xl flex flex-col max-h-full overflow-hidden relative"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
              <h2 className="text-lg font-bold text-foreground">{editId !== null ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    placeholder="e.g. Pressure Transmitter" required />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Model *</label>
                  <input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    placeholder="e.g. 3051S" required />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description — Markdown editor with Write/Preview tabs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono text-muted-foreground uppercase">Description * <span className="normal-case text-accent">(Markdown supported)</span></label>
                  <div className="flex gap-0 border border-border rounded-sm overflow-hidden text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setDescTab("write")}
                      className={`px-3 py-1 transition-colors ${
                        descTab === "write"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescTab("preview")}
                      className={`px-3 py-1 transition-colors border-l border-border ${
                        descTab === "preview"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Preview
                    </button>
                  </div>
                </div>

                {descTab === "write" ? (
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={6}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-y font-mono"
                    placeholder={`Supports **Markdown**:\n- **bold**, *italic*, \`code\`\n- ## Headings\n- - bullet lists\n- [links](url)`}
                    required
                  />
                ) : (
                  <div
                    className="min-h-[144px] border border-border rounded-sm px-4 py-3 bg-muted/30 prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{
                      __html: form.description
                        ? DOMPurify.sanitize(marked.parse(form.description) as string)
                        : '<span class="text-muted-foreground italic text-xs">Nothing to preview yet...</span>'
                    }}
                  />
                )}
                <p className="text-xs text-muted-foreground font-mono mt-1">Tip: **bold**, *italic*, ## heading, - list, [text](url)</p>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase">Specifications</label>
                <div className="space-y-2">
                  {form.specs.map((spec, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={spec} onChange={e => updateSpec(i, e.target.value)}
                        className="flex-1 border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                        placeholder={`Spec ${i + 1}`} />
                      <button type="button" onClick={() => setForm(f => ({ ...f, specs: f.specs.filter((_, idx) => idx !== i) }))}
                        className="text-muted-foreground hover:text-red-500 px-2"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm(f => ({ ...f, specs: [...f.specs, ""] }))}
                    className="text-xs font-mono text-accent hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add spec
                  </button>
                </div>
              </div>

              {/* ── Product Images (multi-image) ─────────────────────────── */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase">
                  Product Images
                  <span className="ml-2 normal-case text-muted-foreground/60">(multiple allowed)</span>
                </label>

                {/* Existing gallery thumbnails */}
                {(form.galleryUrls.length > 0 || form.galleryDataUrls.length > 0) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {/* Server-side images (edit mode) */}
                    {form.galleryUrls.map((url, idx) => {
                      // Extract image id from URL pattern /api/products/:id/images/:imgId
                      const match = url.match(/\/images\/(\d+)$/);
                      const imgId = match ? parseInt(match[1], 10) : null;
                      const isDeleted = imgId !== null && form.deleteImageIds.includes(imgId);
                      return (
                        <div key={url} className={`relative group ${isDeleted ? "opacity-30" : ""}`}>
                          <img
                            src={url}
                            alt={`image ${idx + 1}`}
                            className="w-20 h-20 object-cover rounded-sm border border-border"
                          />
                          {!isDeleted ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (imgId !== null) {
                                  setForm(f => ({ ...f, deleteImageIds: [...f.deleteImageIds, imgId] }));
                                } else {
                                  setForm(f => ({ ...f, galleryUrls: f.galleryUrls.filter((_, i) => i !== idx) }));
                                }
                              }}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setForm(f => ({ ...f, deleteImageIds: f.deleteImageIds.filter(id => id !== imgId) }))}
                              className="absolute inset-0 flex items-center justify-center text-xs text-white bg-black/50 rounded-sm"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Newly picked local images */}
                    {form.galleryDataUrls.map((dataUrl, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={dataUrl}
                          alt={`new ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-sm border border-accent/50"
                        />
                        <button
                          type="button"
                          onClick={() => setForm(f => ({ ...f, galleryDataUrls: f.galleryDataUrls.filter((_, i) => i !== idx) }))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <span className="absolute bottom-0 left-0 right-0 text-center text-xs bg-accent/80 text-white py-0.5 rounded-b-sm">New</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Multi-file picker */}
                <label className="inline-flex items-center gap-2 border border-dashed border-border rounded-sm px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  Add images
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      const newDataUrls: string[] = [];
                      for (const file of files) {
                        try {
                          const compressed = await compressImage(file);
                          const dataUrl = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(compressed);
                          });
                          newDataUrls.push(dataUrl);
                        } catch {
                          const dataUrl = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.readAsDataURL(file);
                          });
                          newDataUrls.push(dataUrl);
                        }
                      }
                      setForm(f => ({ ...f, galleryDataUrls: [...f.galleryDataUrls, ...newDataUrls] }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground font-mono mt-1">Max 8MB per image. JPG, PNG, WebP. Select multiple files at once.</p>
              </div>

              {/* Recommended Products */}
              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase">Recommended Products</label>
                <input
                  type="text"
                  placeholder="Search products..."
                  value={recProductSearchProd}
                  onChange={(e) => setRecProductSearchProd(e.target.value)}
                  className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent mb-2"
                />
                <div className="border border-border rounded-sm p-3 max-h-40 overflow-y-auto bg-background">
                  {(() => {
                    const filtered = products
                      .filter(p => p.id !== editId)
                      .filter(p => !recProductSearchProd || p.name.toLowerCase().includes(recProductSearchProd.toLowerCase()) || p.model.toLowerCase().includes(recProductSearchProd.toLowerCase()));
                    if (filtered.length === 0) {
                      return <p className="text-xs text-muted-foreground italic">{recProductSearchProd ? "No matching products." : "No other products available."}</p>;
                    }
                    return (
                      <div className="space-y-2">
                        {filtered.map(p => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={form.recommendedProductIds.includes(p.id)}
                              onChange={(e) => {
                                setForm(f => ({
                                  ...f,
                                  recommendedProductIds: e.target.checked
                                    ? [...f.recommendedProductIds, p.id]
                                    : f.recommendedProductIds.filter(id => id !== p.id)
                                }));
                              }}
                              className="accent-accent"
                            />
                            <span className="text-sm text-foreground">{p.name} <span className="text-muted-foreground">({p.model})</span></span>
                          </label>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                {form.recommendedProductIds.length > 0 && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">Selected: {form.recommendedProductIds.length} product(s)</p>
                )}
              </div>

              {/* ── Multi-Language Translations ──────────────────────── */}
              <div className="border-t border-border pt-5">
                <label className="block text-xs font-mono text-muted-foreground mb-3 uppercase">
                  🌐 Multi-Language Translations
                  <span className="ml-2 normal-case text-muted-foreground/60">(Indonesian, Vietnamese, Arabic)</span>
                </label>
                {(["id", "vi", "ar"] as const).map(langCode => {
                  const langLabels: Record<string, string> = { id: "🇮🇩 Indonesian", vi: "🇻🇳 Vietnamese", ar: "🇸🇦 Arabic" };
                  const t = form.translations[langCode] || {};
                  const updateT = (field: string, value: string) => {
                    setForm(f => ({
                      ...f,
                      translations: {
                        ...f.translations,
                        [langCode]: { ...f.translations[langCode], [field]: value }
                      }
                    }));
                  };
                  return (
                    <details key={langCode} className="mb-3 border border-border rounded-sm overflow-hidden">
                      <summary className="px-4 py-2.5 bg-muted/30 text-sm font-semibold cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                        <span>{langLabels[langCode]}</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {t.name ? "✓ has translation" : "empty"}
                        </span>
                      </summary>
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="block text-xs font-mono text-muted-foreground mb-1">Name</label>
                          <input
                            value={t.name || ""}
                            onChange={e => updateT("name", e.target.value)}
                            className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                            placeholder={`Product name in ${langLabels[langCode]}...`}
                            dir={langCode === "ar" ? "rtl" : "ltr"}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-mono text-muted-foreground mb-1">Description</label>
                          <textarea
                            value={t.description || ""}
                            onChange={e => updateT("description", e.target.value)}
                            rows={4}
                            className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-y font-mono"
                            placeholder={`Product description in ${langLabels[langCode]}... (Markdown)`}
                            dir={langCode === "ar" ? "rtl" : "ltr"}
                          />
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>

              {formError && <p className="text-red-500 text-xs font-mono">{formError}</p>}

              </div>

              <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/10 shrink-0">
                <button type="submit" disabled={saveMutation.isPending}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm">
                  {saveMutation.isPending ? "Saving..." : editId !== null ? "Save Changes" : "Add Product"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="border border-border px-6 py-2 rounded-sm font-semibold text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArticlesTab — self-contained sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface ArticlesTabProps {
  password: string;
  qc: ReturnType<typeof useQueryClient>;
  showArticleForm: boolean;
  setShowArticleForm: (v: boolean) => void;
  articleEditId: number | null;
  setArticleEditId: (v: number | null) => void;
  articleForm: EmptyArticleForm;
  setArticleForm: React.Dispatch<React.SetStateAction<EmptyArticleForm>>;
  articleFormError: string;
  setArticleFormError: (v: string) => void;
  articleCoverRef: React.RefObject<HTMLInputElement | null>;
  emptyArticleForm: EmptyArticleForm;
}

function ArticlesTab({
  password,
  qc,
  showArticleForm,
  setShowArticleForm,
  articleEditId,
  setArticleEditId,
  articleForm,
  setArticleForm,
  articleFormError,
  setArticleFormError,
  articleCoverRef,
  emptyArticleForm,
}: ArticlesTabProps) {
  const [contentTab, setContentTab] = useState<"write" | "preview">("write");
  const [recArticleSearch, setRecArticleSearch] = useState("");
  const [recProductSearch, setRecProductSearch] = useState("");

  const { data: articles = [], isLoading } = useQuery<ArticleItem[]>({
    queryKey: ["admin-articles"],
    queryFn: () =>
      fetch("/api/articles?limit=200", {
        headers: { "x-admin-password": password },
      })
        .then((r) => r.json())
        .then((res) => res.data ?? res),
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: () => fetch("/api/products?limit=1000").then(r => r.json()).then(res => res.data ?? res),
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["admin-categories"],
    queryFn: () => fetch("/api/products/categories").then(r => r.json()).then(res => res.categories ?? []),
  });

  const saveMutation = useMutation({
    mutationFn: async (form: EmptyArticleForm) => {
      const { coverDataUrl, removeCover, existingCoverUrl, translations, ...rest } = form;
      const body = { ...rest, translations, coverDataUrl: coverDataUrl ?? undefined, removeCover };
      const url =
        articleEditId !== null
          ? `/api/articles/${articleEditId}`
          : "/api/articles";
      const method = articleEditId !== null ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-articles"] });
      setShowArticleForm(false);
    },
    onError: (err: Error) => setArticleFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/articles/${id}`, {
        method: "DELETE",
        headers: { "x-admin-password": password },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  const togglePublishMutation = useMutation({
    mutationFn: async (article: ArticleItem) => {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          title: article.title,
          slug: article.slug,
          summary: article.summary ?? "",
          content: article.content,
          published: !article.published,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-articles"] }),
  });

  function openAdd() {
    setArticleForm({ ...emptyArticleForm });
    setArticleEditId(null);
    setArticleFormError("");
    setShowArticleForm(true);
  }

  function openEdit(a: ArticleItem) {
    setArticleForm({
      title: a.title,
      slug: a.slug,
      summary: a.summary ?? "",
      content: a.content,
      published: a.published,
      coverDataUrl: null,
      removeCover: false,
      existingCoverUrl: a.coverUrl,
      recommendedArticleIds: a.recommendedArticleIds ?? [],
      recommendedProductIds: a.recommendedProductIds ?? [],
      translations: a.translations ?? {},
      brand: a.brand ?? "",
      category: a.category ?? "",
    });
    setArticleEditId(a.id);
    setArticleFormError("");
    setShowArticleForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setArticleFormError("");
    if (!articleForm.title.trim()) { setArticleFormError("Title is required"); return; }
    if (!articleForm.slug.trim()) { setArticleFormError("Slug is required"); return; }
    if (!articleForm.content.trim()) { setArticleFormError("Content is required"); return; }
    saveMutation.mutate(articleForm);
  }

  // Auto-generate slug from title (only for new articles)
  function handleTitleChange(val: string) {
    setArticleForm((f) => {
      const newForm = { ...f, title: val };
      if (articleEditId === null && !f.slug) {
        newForm.slug = val
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
          .replace(/^-|-$/g, "");
      }
      return newForm;
    });
  }

  return (
    <div className="container mx-auto px-4 md:px-8 py-10">
      <div className="flex justify-end mb-6">
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2 rounded-sm font-semibold hover:bg-accent/90 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Article
        </button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground font-mono">Loading articles...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-border rounded-sm">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-mono">No articles yet. Create your first article.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Title</th>
                <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Slug</th>
                <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Status</th>
                <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Date</th>
                <th className="pb-3 font-mono text-xs text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 pr-4 font-medium text-foreground max-w-xs truncate">{a.title}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{a.slug}</td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => togglePublishMutation.mutate(a)}
                      title={a.published ? "Click to unpublish" : "Click to publish"}
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                        a.published
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {a.published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {a.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground font-mono">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${a.title}"?`)) deleteMutation.mutate(a.id);
                        }}
                        className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Article Form Modal */}
      {showArticleForm && (
        <div className="fixed inset-0 bg-black/60 z-[100] overflow-hidden flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-sm w-full max-w-3xl flex flex-col max-h-full overflow-hidden relative"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <h2 className="text-lg font-bold text-foreground">
                  {articleEditId !== null ? "Edit Article" : "New Article"}
                </h2>
                <button
                  onClick={() => setShowArticleForm(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {/* Title */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Title *</label>
                  <input
                    value={articleForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    placeholder="Article title"
                    required
                  />
                </div>
                
                {/* Category */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Category</label>
                  <select
                    value={articleForm.category || ""}
                    onChange={(e) => setArticleForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent appearance-none"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>


                {/* Slug */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Slug (URL) *</label>
                  <input
                    value={articleForm.slug}
                    onChange={(e) =>
                      setArticleForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))
                    }
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent font-mono"
                    placeholder="my-article-slug"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    URL: /articles/{articleForm.slug || "slug"}
                  </p>
                </div>

                {/* Summary */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Summary</label>
                  <textarea
                    value={articleForm.summary}
                    onChange={(e) => setArticleForm((f) => ({ ...f, summary: e.target.value }))}
                    rows={2}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-none"
                    placeholder="Brief article summary (shown in list cards)..."
                  />
                </div>

                {/* Content — Markdown editor */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-mono text-muted-foreground uppercase">
                      Content * <span className="normal-case text-accent">(Markdown supported)</span>
                    </label>
                    <div className="flex gap-0 border border-border rounded-sm overflow-hidden text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setContentTab("write")}
                        className={`px-3 py-1 transition-colors ${
                          contentTab === "write"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setContentTab("preview")}
                        className={`px-3 py-1 transition-colors border-l border-border ${
                          contentTab === "preview"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Preview
                      </button>
                    </div>
                  </div>

                  {contentTab === "write" ? (
                    <textarea
                      value={articleForm.content}
                      onChange={(e) => setArticleForm((f) => ({ ...f, content: e.target.value }))}
                      rows={14}
                      className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-y font-mono"
                      placeholder={`# Article Title\n\nWrite your article in **Markdown**...\n\n## Section\n\nParagraph text, *italic*, **bold**, [links](url)\n\n- Bullet list\n- Another item\n\n\`\`\`code blocks\`\`\``}
                      required
                    />
                  ) : (
                    <div
                      className="min-h-[280px] border border-border rounded-sm px-5 py-4 bg-muted/30 overflow-y-auto prose prose-sm max-w-none text-foreground
                        prose-headings:text-foreground prose-p:text-foreground/80
                        prose-a:text-accent prose-code:text-accent prose-code:bg-muted prose-code:px-1 prose-code:rounded
                        prose-pre:bg-muted prose-pre:border prose-pre:border-border
                        prose-blockquote:border-l-accent prose-blockquote:text-muted-foreground"
                      dangerouslySetInnerHTML={{
                        __html: articleForm.content
                          ? DOMPurify.sanitize(marked.parse(articleForm.content) as string)
                          : '<span class="text-muted-foreground italic text-xs">Nothing to preview yet...</span>'
                      }}
                    />
                  )}
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    Tip: # H1, ## H2, **bold**, *italic*, `code`, ```block```, - list, [text](url)
                  </p>
                </div>


                {/* Cover Image */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase">Cover Image</label>
                  {(articleForm.coverDataUrl || (articleForm.existingCoverUrl && !articleForm.removeCover)) && (
                    <div className="mb-3 flex items-center gap-3">
                      <img
                        src={articleForm.coverDataUrl ?? articleForm.existingCoverUrl!}
                        alt="cover preview"
                        className="w-24 h-16 object-cover rounded-sm border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setArticleForm((f) => ({
                            ...f,
                            coverDataUrl: null,
                            existingCoverUrl: null,
                            removeCover: true,
                          }));
                          if (articleCoverRef.current) articleCoverRef.current.value = "";
                        }}
                        className="text-xs text-red-500 hover:underline font-mono"
                      >
                        Remove cover
                      </button>
                    </div>
                  )}
                  <label className="inline-flex items-center gap-2 border border-dashed border-border rounded-sm px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    {articleForm.coverDataUrl || (articleForm.existingCoverUrl && !articleForm.removeCover)
                      ? "Change cover"
                      : "Upload cover"}
                    <input
                      ref={articleCoverRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const compressed = await compressImage(file);
                          const reader = new FileReader();
                          reader.onload = () =>
                            setArticleForm((f) => ({
                              ...f,
                              coverDataUrl: reader.result as string,
                              removeCover: false,
                            }));
                          reader.readAsDataURL(compressed);
                        } catch {
                          const reader = new FileReader();
                          reader.onload = () =>
                            setArticleForm((f) => ({
                              ...f,
                              coverDataUrl: reader.result as string,
                              removeCover: false,
                            }));
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground font-mono mt-1">Max 8MB. JPG, PNG, WebP.</p>
                </div>

                {/* Published toggle */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setArticleForm((f) => ({ ...f, published: !f.published }))}
                      className={`w-10 h-6 rounded-full transition-colors relative ${
                        articleForm.published ? "bg-accent" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          articleForm.published ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {articleForm.published ? "Published" : "Draft"}
                    </span>
                  </label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {articleForm.published
                      ? "Visible to public visitors"
                      : "Only visible to admins"}
                  </span>
                </div>

                {/* Recommended Articles */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase">Recommended Articles</label>
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={recArticleSearch}
                    onChange={(e) => setRecArticleSearch(e.target.value)}
                    className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent mb-2"
                  />
                  <div className="border border-border rounded-sm p-3 max-h-40 overflow-y-auto bg-background">
                    {(() => {
                      const filtered = articles
                        .filter(a => a.id !== articleEditId)
                        .filter(a => !recArticleSearch || a.title.toLowerCase().includes(recArticleSearch.toLowerCase()));
                      if (filtered.length === 0) {
                        return <p className="text-xs text-muted-foreground italic">{recArticleSearch ? "No matching articles." : "No other articles available."}</p>;
                      }
                      return (
                        <div className="space-y-2">
                          {filtered.map(a => (
                            <label key={a.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={articleForm.recommendedArticleIds.includes(a.id)}
                                onChange={(e) => {
                                  setArticleForm(f => ({
                                    ...f,
                                    recommendedArticleIds: e.target.checked
                                      ? [...f.recommendedArticleIds, a.id]
                                      : f.recommendedArticleIds.filter(id => id !== a.id)
                                  }));
                                }}
                                className="accent-accent"
                              />
                              <span className="text-sm text-foreground">{a.title}</span>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  {articleForm.recommendedArticleIds.length > 0 && (
                    <p className="text-xs text-muted-foreground font-mono mt-1">Selected: {articleForm.recommendedArticleIds.length} article(s)</p>
                  )}
                </div>

                {/* Recommended Products */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase">Recommended Products</label>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={recProductSearch}
                    onChange={(e) => setRecProductSearch(e.target.value)}
                    className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent mb-2"
                  />
                  <div className="border border-border rounded-sm p-3 max-h-40 overflow-y-auto bg-background">
                    {(() => {
                      const filtered = products
                        .filter(p => !recProductSearch || p.name.toLowerCase().includes(recProductSearch.toLowerCase()) || p.model.toLowerCase().includes(recProductSearch.toLowerCase()));
                      if (filtered.length === 0) {
                        return <p className="text-xs text-muted-foreground italic">{recProductSearch ? "No matching products." : "No products available."}</p>;
                      }
                      return (
                        <div className="space-y-2">
                          {filtered.map(p => (
                            <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={articleForm.recommendedProductIds.includes(p.id)}
                                onChange={(e) => {
                                  setArticleForm(f => ({
                                    ...f,
                                    recommendedProductIds: e.target.checked
                                      ? [...f.recommendedProductIds, p.id]
                                      : f.recommendedProductIds.filter(id => id !== p.id)
                                  }));
                                }}
                                className="accent-accent"
                              />
                              <span className="text-sm text-foreground">{p.name} <span className="text-muted-foreground">({p.model})</span></span>
                            </label>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  {articleForm.recommendedProductIds.length > 0 && (
                    <p className="text-xs text-muted-foreground font-mono mt-1">Selected: {articleForm.recommendedProductIds.length} product(s)</p>
                  )}
                </div>


                {/* ── Multi-Language Translations ──────────────────────── */}
                <div className="border-t border-border pt-5">
                  <label className="block text-xs font-mono text-muted-foreground mb-3 uppercase">
                    🌐 Multi-Language Translations
                    <span className="ml-2 normal-case text-muted-foreground/60">(Indonesian, Vietnamese, Arabic)</span>
                  </label>
                  {(["id", "vi", "ar"] as const).map(langCode => {
                    const langLabels: Record<string, string> = { id: "🇮🇩 Indonesian", vi: "🇻🇳 Vietnamese", ar: "🇸🇦 Arabic" };
                    const t = articleForm.translations[langCode] || {};
                    const updateT = (field: string, value: string) => {
                      setArticleForm(f => ({
                        ...f,
                        translations: {
                          ...f.translations,
                          [langCode]: { ...f.translations[langCode], [field]: value }
                        }
                      }));
                    };
                    return (
                      <details key={langCode} className="mb-3 border border-border rounded-sm overflow-hidden">
                        <summary className="px-4 py-2.5 bg-muted/30 text-sm font-semibold cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
                          <span>{langLabels[langCode]}</span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {t.title ? "✓ has translation" : "empty"}
                          </span>
                        </summary>
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="block text-xs font-mono text-muted-foreground mb-1">Title</label>
                            <input
                              value={t.title || ""}
                              onChange={e => updateT("title", e.target.value)}
                              className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                              placeholder={`Article title in ${langLabels[langCode]}...`}
                              dir={langCode === "ar" ? "rtl" : "ltr"}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-mono text-muted-foreground mb-1">Summary</label>
                            <textarea
                              value={t.summary || ""}
                              onChange={e => updateT("summary", e.target.value)}
                              rows={2}
                              className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-none"
                              placeholder={`Article summary in ${langLabels[langCode]}...`}
                              dir={langCode === "ar" ? "rtl" : "ltr"}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-mono text-muted-foreground mb-1">Content</label>
                            <textarea
                              value={t.content || ""}
                              onChange={e => updateT("content", e.target.value)}
                              rows={8}
                              className="w-full border border-border rounded-sm px-3 py-1.5 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-y font-mono"
                              placeholder={`Article content in ${langLabels[langCode]}... (Markdown)`}
                              dir={langCode === "ar" ? "rtl" : "ltr"}
                            />
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>

                {articleFormError && (
                  <p className="text-red-500 text-xs font-mono">{articleFormError}</p>
                )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted/10 shrink-0">
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                  >
                    {saveMutation.isPending
                      ? "Saving..."
                      : articleEditId !== null
                      ? "Save Changes"
                      : "Create Article"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowArticleForm(false)}
                    className="border border-border px-6 py-2 rounded-sm font-semibold text-muted-foreground hover:text-foreground transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
        </div>
      )}
    </div>
  );
}
