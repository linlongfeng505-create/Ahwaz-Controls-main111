import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, X, Upload, Lock, LogOut, Package, Settings, Inbox, Mail, Building2, Phone, Trash, FileText, BookOpen, Eye, EyeOff } from "lucide-react";

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
}

interface ArticleItem {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  coverUrl: string | null;
  published: boolean;
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

const STORAGE_KEY = "flonexis_admin_pw";

const emptyForm = {
  name: "",
  brand: "",
  model: "",
  category: CATEGORIES[0],
  description: "",
  specs: [""],
  imageObjectPath: null as string | null,
  imageDataUrl: null as string | null, // local base64 preview (not yet saved)
  removeImage: false,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/settings", {
      headers: { "x-admin-password": password },
    });
    if (res.ok) {
      sessionStorage.setItem(STORAGE_KEY, password);
      setAuthed(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect password");
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setPassword("");
    setAuthed(false);
    setSettingsForm(null);
  }

  function openAdd() {
    setForm({ ...emptyForm });
    setEditId(null);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setForm({
      name: p.name,
      brand: p.brand,
      model: p.model,
      category: p.category,
      description: p.description,
      specs: p.specs.length ? [...p.specs] : [""],
      imageObjectPath: p.imageObjectPath, // existing server URL e.g. /api/products/1/image
      imageDataUrl: null,   // no new local image yet
      removeImage: false,
    });
    setEditId(p.id);
    setFormError("");
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { imageObjectPath, imageDataUrl, removeImage, ...rest } = form;
      const body = {
        ...rest,
        specs: rest.specs.filter(s => s.trim()),
        ...(removeImage ? { removeImage: true } : {}),
        ...(imageDataUrl ? { imageDataUrl } : {}),
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
                    <th className="pb-3 font-mono text-xs text-muted-foreground uppercase pr-4">Brand</th>
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
                      <td className="py-3 pr-4"><Badge variant="outline" className="text-xs font-mono">{p.brand}</Badge></td>
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
              <div className="flex min-h-screen items-start justify-center px-4 py-8">
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
        <div className="container mx-auto px-4 md:px-8 py-10 max-w-2xl">
          {!currentSettings ? (
            <div className="text-muted-foreground font-mono">Loading settings...</div>
          ) : (
            <form
              onSubmit={e => { e.preventDefault(); saveSettingsMutation.mutate(); }}
              className="space-y-6"
            >
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
              </div>

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="bg-primary text-primary-foreground px-8 py-2.5 rounded-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
                >
                  {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </button>
                {settingsSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-green-600 font-mono"
                  >
                    Saved successfully
                  </motion.span>
                )}
              </div>
            </form>
          )}
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
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-start justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-sm w-full max-w-2xl relative"
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editId !== null ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    placeholder="e.g. Pressure Transmitter" required />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Brand *</label>
                  <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent"
                    placeholder="e.g. Rosemount" required />
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
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Description *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-none"
                  placeholder="Technical description..." required />
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

              <div>
                <label className="block text-xs font-mono text-muted-foreground mb-2 uppercase">Product Image</label>

                {/* Preview: show local data URL if just picked, else show server URL */}
                {(form.imageDataUrl || form.imageObjectPath) && !form.removeImage && (
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={form.imageDataUrl ?? form.imageObjectPath!}
                      alt="preview"
                      className="w-20 h-20 object-cover rounded-sm border border-border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setForm(f => ({ ...f, imageObjectPath: null, imageDataUrl: null, removeImage: true }));
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-red-500 hover:underline font-mono"
                    >
                      Remove image
                    </button>
                  </div>
                )}

                {/* File picker */}
                <label className="inline-flex items-center gap-2 border border-dashed border-border rounded-sm px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  {form.imageDataUrl || (form.imageObjectPath && !form.removeImage) ? "Change image" : "Upload image"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        // Compress first (max 1200px wide, JPEG quality 0.82)
                        const compressed = await compressImage(file);
                        const reader = new FileReader();
                        reader.onload = () => {
                          setForm(f => ({
                            ...f,
                            imageDataUrl: reader.result as string,
                            removeImage: false,
                          }));
                        };
                        reader.readAsDataURL(compressed);
                      } catch {
                        // Fallback: use original file without compression
                        const reader = new FileReader();
                        reader.onload = () => {
                          setForm(f => ({
                            ...f,
                            imageDataUrl: reader.result as string,
                            removeImage: false,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <p className="text-xs text-muted-foreground font-mono mt-1">Max 8MB. JPG, PNG, WebP.</p>
              </div>

              {formError && <p className="text-red-500 text-xs font-mono">{formError}</p>}

              <div className="flex gap-3 pt-2">
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
  const { data: articles = [], isLoading } = useQuery<ArticleItem[]>({
    queryKey: ["admin-articles"],
    queryFn: () =>
      fetch("/api/articles?limit=200", {
        headers: { "x-admin-password": password },
      })
        .then((r) => r.json())
        .then((res) => res.data ?? res),
  });

  const saveMutation = useMutation({
    mutationFn: async (form: EmptyArticleForm) => {
      const { coverDataUrl, removeCover, existingCoverUrl, ...rest } = form;
      const body = { ...rest, coverDataUrl: coverDataUrl ?? undefined, removeCover };
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
        <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-start justify-center px-4 py-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border rounded-sm w-full max-w-3xl relative"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
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

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
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

                {/* Content */}
                <div>
                  <label className="block text-xs font-mono text-muted-foreground mb-1 uppercase">Content *</label>
                  <textarea
                    value={articleForm.content}
                    onChange={(e) => setArticleForm((f) => ({ ...f, content: e.target.value }))}
                    rows={10}
                    className="w-full border border-border rounded-sm px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:border-accent resize-y font-mono"
                    placeholder="Article content (separate paragraphs with blank lines)..."
                    required
                  />
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

                {articleFormError && (
                  <p className="text-red-500 text-xs font-mono">{articleFormError}</p>
                )}

                <div className="flex gap-3 pt-2">
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
        </div>
      )}
    </div>
  );
}
