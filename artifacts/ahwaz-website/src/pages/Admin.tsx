import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Plus, Edit, Trash2, X, Upload, Lock, LogOut, Package, Settings, Inbox, Mail, Building2, Phone, Eye, Trash } from "lucide-react";
import { ObjectUploader } from "@workspace/object-storage-web";

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

const CATEGORIES = [
  "Pressure Transmitters",
  "Temperature Instruments",
  "Flow Meters",
  "Valve Positioners",
  "Safety / ESD Devices",
  "Actuators",
  "Field Communicators",
];

const STORAGE_KEY = "ahwaz_admin_pw";

const emptyForm = {
  name: "",
  brand: "",
  model: "",
  category: CATEGORIES[0],
  description: "",
  specs: [""],
  imageObjectPath: null as string | null,
};

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
  const [activeTab, setActiveTab] = useState<"products" | "submissions" | "settings">("products");
  const [openSubmission, setOpenSubmission] = useState<Submission | null>(null);

  // Product form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formError, setFormError] = useState("");

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const qc = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: () => fetch("/api/products").then(r => r.json()),
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
      imageObjectPath: p.imageObjectPath,
    });
    setEditId(p.id);
    setFormError("");
    setShowForm(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { ...form, specs: form.specs.filter(s => s.trim()) };
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
                          <img src={`/api/storage${p.imageObjectPath}`} alt="" className="w-10 h-10 object-cover rounded-sm border border-border" />
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
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card border border-border rounded-sm w-full max-w-lg my-8"
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
                      href={`mailto:${openSubmission.email}?subject=Re: Your enquiry at Ahwaz Controls`}
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
                    { key: "company_name", label: "Company Name", placeholder: "Ahwaz Controls" },
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
                    placeholder="Ahwaz Controls (EHUADE Automation). All rights reserved."
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

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-sm w-full max-w-2xl my-8 relative"
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
                {form.imageObjectPath && (
                  <div className="mb-2 flex items-center gap-3">
                    <img src={`/api/storage${form.imageObjectPath}`} alt="" className="w-16 h-16 object-cover rounded-sm border border-border" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, imageObjectPath: null }))}
                      className="text-xs text-red-500 hover:underline font-mono">Remove image</button>
                  </div>
                )}
                <ObjectUploader
                  onGetUploadParameters={async (file) => {
                    const res = await fetch("/api/storage/uploads/request-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-admin-password": password },
                      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                    });
                    const { uploadURL, objectPath } = await res.json();
                    setForm(f => ({ ...f, imageObjectPath: objectPath }));
                    return { method: "PUT" as const, url: uploadURL, headers: { "Content-Type": file.type } };
                  }}
                  onComplete={() => {}}
                >
                  <div className="inline-flex items-center gap-2 border border-dashed border-border rounded-sm px-4 py-2 text-sm text-muted-foreground hover:border-accent hover:text-accent cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" /> Upload image
                  </div>
                </ObjectUploader>
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
      )}
    </Layout>
  );
}
