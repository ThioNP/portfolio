import React, { useState, useEffect } from 'react';
import {
  CURATED_PALETTE,
  type Project,
  type ShapeType,
  type SiteSettings,
  DEFAULT_SITE_SETTINGS
} from '../data/projects';
import { SHAPE_GEOMETRIES } from '../lib/shapeGeometry';
import {
  fetchAdminPortfolioData,
  saveProjectToBackend,
  deleteProjectFromBackend,
  reorderProjectsInBackend,
  saveSiteSettingsToBackend,
  seedFirestoreDatabase,
  exportPortfolioBackupJson,
  importPortfolioBackupJson,
  resetPortfolioToFactoryDefaults
} from '../lib/portfolioService';
import {
  getSavedFirebaseConfig,
  saveRuntimeFirebaseConfig,
  clearRuntimeFirebaseConfig,
  isFirebaseConfigured,
  signInWithGoogle,
  signInWithEmail,
  signOutAdmin,
  subscribeToAuthChanges,
  type FirebaseConfigData
} from '../lib/firebase';
import type { User } from 'firebase/auth';
import {
  FlaskConical,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Check,
  Cloud,
  HardDrive,
  Download,
  Upload,
  RotateCcw,
  LogOut,
  ShieldCheck,
  Sparkles,
  Layers,
  Settings,
  Database,
  Eye,
  EyeOff,
  Smartphone,
  X
} from 'lucide-react';

type AdminTab = 'projects' | 'settings' | 'cloud';

const EMPTY_PROJECT: Project = {
  id: '',
  title: '',
  subtitle: '',
  category: 'Artificial Intelligence',
  shapeType: 'hexagon',
  color: '#FF864A',
  summary: '',
  description: '',
  keyFeatures: [''],
  tags: ['TypeScript', 'React'],
  demoUrl: '',
  githubUrl: '',
  coverImage: '',
  metrics: [
    { label: 'Performance', value: '60 FPS' },
    { label: 'Latency', value: '<15ms' },
    { label: 'Scale', value: '10k+' }
  ],
  year: new Date().getFullYear().toString(),
  published: true,
  featuredOnMobile: true,
  order: 0
};

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<AdminTab>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [storageSource, setStorageSource] = useState<'firebase' | 'local'>('local');
  const [isLoading, setIsLoading] = useState(true);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auth states
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [localStudioUnlocked, setLocalStudioUnlocked] = useState<boolean>(() => {
    return !isFirebaseConfigured();
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Project Editor state
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Firebase Config Wizard state
  const [fbConfig, setFbConfig] = useState<FirebaseConfigData>(() => {
    return (
      getSavedFirebaseConfig() || {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      }
    );
  });
  const [rawConfigPaste, setRawConfigPaste] = useState('');
  const [importJsonText, setImportJsonText] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusBanner({ type, text });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminPortfolioData();
      setProjects(data.projects);
      setSiteSettings(data.siteSettings);
      setStorageSource(data.source);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const unsub = subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  // Check if user is authorized
  const envAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  const whitelist = [
    ...envAdminEmails,
    ...(siteSettings.adminWhitelistEmails || []).map((e) => e.trim().toLowerCase()).filter(Boolean)
  ];

  const isEmailAuthorized =
    !firebaseUser ||
    whitelist.length === 0 ||
    (firebaseUser.email && whitelist.includes(firebaseUser.email.toLowerCase()));

  const isAuthenticated = (firebaseUser && isEmailAuthorized) || localStudioUnlocked;

  // Handlers for Project CRUD
  const handleStartNewProject = () => {
    const slug = `project-${projects.length + 1}`;
    setEditingProject({
      ...EMPTY_PROJECT,
      id: slug,
      order: projects.length,
      color: CURATED_PALETTE[projects.length % CURATED_PALETTE.length].hex
    });
    setIsCreatingNew(true);
  };

  const handleEditProject = (proj: Project) => {
    setEditingProject({
      ...proj,
      keyFeatures: proj.keyFeatures.length > 0 ? [...proj.keyFeatures] : [''],
      metrics:
        proj.metrics.length > 0
          ? proj.metrics.map((m) => ({ ...m }))
          : [{ label: 'Metric', value: '100%' }],
      tags: [...proj.tags]
    });
    setIsCreatingNew(false);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    if (!editingProject.title.trim()) {
      showToast('Project title is required', 'error');
      return;
    }

    const sanitizedId =
      editingProject.id
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-') || `proj-${Date.now()}`;

    try {
      const updated = await saveProjectToBackend({
        ...editingProject,
        id: sanitizedId
      });
      setProjects(updated);
      setEditingProject(null);
      setIsCreatingNew(false);
      showToast(`Saved "${editingProject.title}" (${storageSource === 'firebase' ? 'Synced to Firestore' : 'Saved locally'})`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save project', 'error');
    }
  };

  const handleDeleteProject = async (proj: Project) => {
    if (!window.confirm(`Delete project "${proj.title}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const updated = await deleteProjectFromBackend(proj.id);
      setProjects(updated);
      if (editingProject?.id === proj.id) {
        setEditingProject(null);
      }
      showToast(`Deleted "${proj.title}"`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete project', 'error');
    }
  };

  const handleTogglePublished = async (proj: Project) => {
    try {
      const updated = await saveProjectToBackend({
        ...proj,
        published: !proj.published
      });
      setProjects(updated);
      showToast(`${proj.title} is now ${!proj.published ? 'Published on Live View' : 'Hidden (Draft)'}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const handleToggleMobile = async (proj: Project) => {
    try {
      const updated = await saveProjectToBackend({
        ...proj,
        featuredOnMobile: !proj.featuredOnMobile
      });
      setProjects(updated);
      showToast(`Updated mobile drop setting for "${proj.title}"`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update mobile flag', 'error');
    }
  };

  const handleMoveOrder = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= projects.length) return;
    const copy = [...projects];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    try {
      const updated = await reorderProjectsInBackend(copy);
      setProjects(updated);
      showToast('Updated shape drop order');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reorder projects', 'error');
    }
  };

  // Site Settings Save
  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await saveSiteSettingsToBackend(siteSettings);
      setSiteSettings(saved);
      showToast('Site & Header settings saved successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save site settings', 'error');
    }
  };

  // Parse pasted Firebase SDK snippet
  const handleParseFirebaseSnippet = () => {
    if (!rawConfigPaste.trim()) return;
    try {
      const extractField = (key: string) => {
        const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`);
        const match = rawConfigPaste.match(regex);
        return match ? match[1] : '';
      };

      const parsed: FirebaseConfigData = {
        apiKey: extractField('apiKey') || fbConfig.apiKey,
        authDomain: extractField('authDomain') || fbConfig.authDomain,
        projectId: extractField('projectId') || fbConfig.projectId,
        storageBucket: extractField('storageBucket') || fbConfig.storageBucket,
        messagingSenderId: extractField('messagingSenderId') || fbConfig.messagingSenderId,
        appId: extractField('appId') || fbConfig.appId
      };

      if (!parsed.apiKey || !parsed.projectId) {
        showToast('Could not find apiKey and projectId in pasted snippet', 'error');
        return;
      }

      setFbConfig(parsed);
      setRawConfigPaste('');
      showToast('Parsed Firebase config fields! Click "Save & Connect Firebase" to activate.');
    } catch {
      showToast('Could not parse snippet', 'error');
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbConfig.apiKey.trim() || !fbConfig.projectId.trim()) {
      showToast('Firebase apiKey and projectId are required', 'error');
      return;
    }
    saveRuntimeFirebaseConfig(fbConfig);
    showToast('Firebase config saved! Reloading connection...');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleDisconnectFirebase = () => {
    if (!window.confirm('Disconnect runtime Firebase config and switch back to Local Studio storage?')) {
      return;
    }
    clearRuntimeFirebaseConfig();
    window.location.reload();
  };

  const handleSeedCloud = async () => {
    try {
      await seedFirestoreDatabase();
      await loadAllData();
      showToast('Pushed all projects & site settings to Firebase Firestore!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to seed Firestore', 'error');
    }
  };

  const handleDownloadBackup = () => {
    const json = exportPortfolioBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded portfolio backup JSON');
  };

  const handleImportBackup = async () => {
    if (!importJsonText.trim()) return;
    try {
      const res = await importPortfolioBackupJson(importJsonText);
      setProjects(res.projects);
      setSiteSettings(res.siteSettings);
      setImportJsonText('');
      showToast('Imported backup JSON successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Invalid backup JSON', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all projects and settings to factory defaults?')) return;
    const res = await resetPortfolioToFactoryDefaults();
    setProjects(res.projects);
    setSiteSettings(res.siteSettings);
    showToast('Reset portfolio to default seed data');
  };

  // Auth Gate Screen if Firebase is configured and user hasn't signed in yet
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] flex items-center justify-center p-4 select-none">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-200/90 p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">
                  Portfolio CMS
                </h1>
                <p className="text-xs text-neutral-500 font-mono">Backend Admin Portal</p>
              </div>
            </div>
            <a
              href="/"
              className="text-xs font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1 px-3 py-1.5 rounded-full border border-neutral-200 hover:bg-neutral-50 transition-colors"
            >
              <span>Live Site</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700">
              {authError}
            </div>
          )}

          {firebaseUser && !isEmailAuthorized && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
              <p className="font-semibold">Unauthorized Account ({firebaseUser.email})</p>
              <p>Your email is not on the admin whitelist for this portfolio.</p>
              <button
                onClick={() => signOutAdmin()}
                className="underline font-medium"
              >
                Sign out and switch account
              </button>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={async () => {
                setAuthError(null);
                try {
                  await signInWithGoogle();
                } catch (err) {
                  setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed');
                }
              }}
              className="w-full py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-black text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Sign in with Google (Firebase Auth)</span>
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-neutral-200" />
              <span className="flex-shrink mx-3 text-[11px] font-mono uppercase text-neutral-400">
                Or Email Login
              </span>
              <div className="flex-grow border-t border-neutral-200" />
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError(null);
                try {
                  await signInWithEmail(loginEmail, loginPassword);
                } catch (err) {
                  setAuthError(err instanceof Error ? err.message : 'Email Sign-In failed');
                }
              }}
              className="space-y-3"
            >
              <input
                type="email"
                placeholder="Admin Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                required
              />
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-medium text-sm transition-colors cursor-pointer"
              >
                Sign In with Email
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Local development / setup?</span>
            <button
              type="button"
              onClick={() => setLocalStudioUnlocked(true)}
              className="font-medium text-neutral-800 hover:underline cursor-pointer"
            >
              Continue in Local Studio Mode →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F8F9FA] text-neutral-900 flex flex-col select-text overflow-y-auto">
      {/* Top Admin Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-sm">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
                  {siteSettings.brandName} — Studio CMS
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium ${
                    storageSource === 'firebase'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {storageSource === 'firebase' ? (
                    <>
                      <Cloud className="w-3 h-3" />
                      <span>Firestore Connected</span>
                    </>
                  ) : (
                    <>
                      <HardDrive className="w-3 h-3" />
                      <span>Local Studio Mode</span>
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Manage physics shapes, project case studies, and site settings
              </p>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-2xl border border-neutral-200/60">
            <button
              type="button"
              onClick={() => {
                setActiveTab('projects');
                setEditingProject(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Projects & Shapes ({projects.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                setEditingProject(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Site & Header</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('cloud');
                setEditingProject(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'cloud'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Firebase & Backups</span>
            </button>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {firebaseUser && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-full">
                <span>{firebaseUser.email}</span>
                <button
                  type="button"
                  onClick={() => signOutAdmin()}
                  title="Sign out"
                  className="text-neutral-500 hover:text-red-600 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-all shadow-xs"
            >
              <span>View Live Portfolio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {statusBanner && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in fade-in">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-medium ${
              statusBanner.type === 'success'
                ? 'bg-neutral-900 text-white border-neutral-800'
                : 'bg-red-600 text-white border-red-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-neutral-500 font-mono">
            Loading portfolio database...
          </div>
        ) : activeTab === 'projects' ? (
          editingProject ? (
            /* ================= PROJECT & SHAPE STUDIO EDITOR ================= */
            <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-xs overflow-hidden">
              <div className="px-6 sm:px-8 py-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {isCreatingNew ? 'Create New Project Shape' : `Editing: ${editingProject.title}`}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Configure the physics shape geometry, color, and case study content
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="w-9 h-9 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProject} className="p-6 sm:p-8 space-y-8">
                {/* Top Row: Live Shape Preview + Geometry & Color Picker */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#F8F9FA] p-6 rounded-3xl border border-neutral-200/70">
                  {/* Live Interactive SVG Preview */}
                  <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-neutral-200/60 shadow-2xs">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-3">
                      Live Physics Shape Preview
                    </span>
                    <div className="w-36 h-36 flex items-center justify-center transition-transform duration-300 hover:scale-105">
                      <svg
                        viewBox={SHAPE_GEOMETRIES[editingProject.shapeType].viewBox}
                        className="w-full h-full overflow-visible drop-shadow-sm"
                      >
                        <path
                          d={SHAPE_GEOMETRIES[editingProject.shapeType].path}
                          fill={editingProject.color}
                        />
                      </svg>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: editingProject.color }}
                      />
                      <span className="text-xs font-semibold text-neutral-800">
                        {editingProject.title || 'Untitled Project'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {editingProject.shapeType} · {editingProject.color}
                    </span>
                  </div>

                  {/* Shape Type & Color Swatches */}
                  <div className="lg:col-span-8 space-y-5">
                    <div>
                      <label className="block text-xs font-mono uppercase text-neutral-500 mb-2">
                        1. Select Interactive Geometry
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(['hexagon', 'circle', 'square', 'clover'] as ShapeType[]).map((shape) => {
                          const geo = SHAPE_GEOMETRIES[shape];
                          const isSelected = editingProject.shapeType === shape;
                          return (
                            <button
                              key={shape}
                              type="button"
                              onClick={() =>
                                setEditingProject({ ...editingProject, shapeType: shape })
                              }
                              className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-neutral-900 bg-white shadow-xs ring-2 ring-neutral-900/10'
                                  : 'border-neutral-200 bg-white/60 hover:bg-white'
                              }`}
                            >
                              <svg viewBox={geo.viewBox} className="w-8 h-8 shrink-0">
                                <path d={geo.path} fill={editingProject.color} />
                              </svg>
                              <span className="text-xs font-medium capitalize text-neutral-800">
                                {shape}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-neutral-500 mb-2">
                        2. Select Shape Color (Curated Palette or Custom Hex)
                      </label>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {CURATED_PALETTE.map((swatch) => (
                          <button
                            key={swatch.hex}
                            type="button"
                            onClick={() =>
                              setEditingProject({ ...editingProject, color: swatch.hex })
                            }
                            title={swatch.name}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                              editingProject.color.toUpperCase() === swatch.hex.toUpperCase()
                                ? 'border-neutral-900 bg-white shadow-xs scale-105'
                                : 'border-neutral-200 bg-white/70 hover:bg-white'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/10"
                              style={{ backgroundColor: swatch.hex }}
                            />
                            <span>{swatch.name}</span>
                          </button>
                        ))}
                        <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border border-neutral-200">
                          <input
                            type="color"
                            value={editingProject.color}
                            onChange={(e) =>
                              setEditingProject({ ...editingProject, color: e.target.value })
                            }
                            className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <input
                            type="text"
                            value={editingProject.color}
                            onChange={(e) =>
                              setEditingProject({ ...editingProject, color: e.target.value })
                            }
                            className="w-20 text-xs font-mono uppercase focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Visibility & Mobile Toggles */}
                    <div className="flex flex-wrap items-center gap-6 pt-2">
                      <label className="inline-flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProject.published}
                          onChange={(e) =>
                            setEditingProject({ ...editingProject, published: e.target.checked })
                          }
                          className="w-4 h-4 rounded accent-neutral-900"
                        />
                        <span className="text-xs font-medium text-neutral-800">
                          Published on Live View (`/`)
                        </span>
                      </label>

                      <label className="inline-flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingProject.featuredOnMobile}
                          onChange={(e) =>
                            setEditingProject({
                              ...editingProject,
                              featuredOnMobile: e.target.checked
                            })
                          }
                          className="w-4 h-4 rounded accent-neutral-900"
                        />
                        <span className="text-xs font-medium text-neutral-800">
                          Include in Mobile 5-Shape Drop
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Core Project Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      value={editingProject.title}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, title: e.target.value })
                      }
                      placeholder="e.g. Neural Audio Canvas"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={editingProject.category}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, category: e.target.value })
                      }
                      placeholder="e.g. Creative Tech"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Year *
                    </label>
                    <input
                      type="text"
                      value={editingProject.year}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, year: e.target.value })
                      }
                      placeholder="2026"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Subtitle / Tagline *
                    </label>
                    <input
                      type="text"
                      value={editingProject.subtitle}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, subtitle: e.target.value })
                      }
                      placeholder="Zero-Latency Web Audio & Spectral Synthesizer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Unique ID / Slug
                    </label>
                    <input
                      type="text"
                      value={editingProject.id}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, id: e.target.value })
                      }
                      disabled={!isCreatingNew}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm font-mono bg-neutral-50 disabled:text-neutral-400"
                    />
                  </div>
                </div>

                {/* Case Study Description */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Short Summary
                    </label>
                    <textarea
                      rows={3}
                      value={editingProject.summary}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, summary: e.target.value })
                      }
                      placeholder="1-sentence summary of the project..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Overview & Problem Statement (Case Study Body) *
                    </label>
                    <textarea
                      rows={3}
                      value={editingProject.description}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, description: e.target.value })
                      }
                      placeholder="Detailed architectural overview displayed in the project modal..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                      required
                    />
                  </div>
                </div>

                {/* Links & Media */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Live Demo / Experiment URL
                    </label>
                    <input
                      type="url"
                      value={editingProject.demoUrl || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, demoUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      GitHub / Source URL
                    </label>
                    <input
                      type="url"
                      value={editingProject.githubUrl || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, githubUrl: e.target.value })
                      }
                      placeholder="https://github.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1">
                      Cover Screenshot / Preview Image URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={editingProject.coverImage || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, coverImage: e.target.value })
                      }
                      placeholder="https://.../preview.png"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-neutral-900"
                    />
                  </div>
                </div>

                {/* Metrics Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase text-neutral-500">
                      Highlight Metrics (Up to 3 Cards in Modal)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProject({
                          ...editingProject,
                          metrics: [...editingProject.metrics, { label: '', value: '' }]
                        })
                      }
                      className="text-xs font-medium text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Metric</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {editingProject.metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-center gap-2"
                      >
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            placeholder="Label (e.g. Latency)"
                            value={m.label}
                            onChange={(e) => {
                              const next = [...editingProject.metrics];
                              next[idx] = { ...next[idx], label: e.target.value };
                              setEditingProject({ ...editingProject, metrics: next });
                            }}
                            className="w-full px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-xs"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g. <12ms)"
                            value={m.value}
                            onChange={(e) => {
                              const next = [...editingProject.metrics];
                              next[idx] = { ...next[idx], value: e.target.value };
                              setEditingProject({ ...editingProject, metrics: next });
                            }}
                            className="w-full px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-xs font-semibold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = editingProject.metrics.filter((_, i) => i !== idx);
                            setEditingProject({ ...editingProject, metrics: next });
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Technical Innovations Builder */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono uppercase text-neutral-500">
                      Key Technical Innovations (Bullet Points)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProject({
                          ...editingProject,
                          keyFeatures: [...editingProject.keyFeatures, '']
                        })
                      }
                      className="text-xs font-medium text-neutral-900 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Bullet</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editingProject.keyFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={feat}
                          placeholder="e.g. Zero-copy WebGPU compute shader pipeline..."
                          onChange={(e) => {
                            const next = [...editingProject.keyFeatures];
                            next[idx] = e.target.value;
                            setEditingProject({ ...editingProject, keyFeatures: next });
                          }}
                          className="flex-1 px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = editingProject.keyFeatures.filter((_, i) => i !== idx);
                            setEditingProject({ ...editingProject, keyFeatures: next });
                          }}
                          className="p-2 text-neutral-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tech Stack Tags */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase text-neutral-500">
                    Technologies & Tooling Tags
                  </label>
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                    {editingProject.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-neutral-200 text-xs font-mono text-neutral-800"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingProject({
                              ...editingProject,
                              tags: editingProject.tags.filter((_, i) => i !== idx)
                            })
                          }
                          className="text-neutral-400 hover:text-red-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Add tag + Enter"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tagInput.trim()) {
                            e.preventDefault();
                            setEditingProject({
                              ...editingProject,
                              tags: [...editingProject.tags, tagInput.trim()]
                            });
                            setTagInput('');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-neutral-200 text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tagInput.trim()) {
                            setEditingProject({
                              ...editingProject,
                              tags: [...editingProject.tags, tagInput.trim()]
                            });
                            setTagInput('');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white text-xs cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Save / Cancel Footer */}
                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-5 py-2.5 rounded-full border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-medium flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Project to Portfolio</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ================= PROJECTS LIST & ORDER MANAGER ================= */
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">
                    Portfolio Shapes & Case Studies
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Each published project drops into the physics playground in order. Desktop drops up to 7+ shapes; Mobile drops up to 5 mobile-featured shapes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleStartNewProject}
                  className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Project Shape</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {projects.map((proj, idx) => {
                  const geo = SHAPE_GEOMETRIES[proj.shapeType];
                  return (
                    <div
                      key={proj.id}
                      className={`p-4 sm:p-5 rounded-3xl bg-white border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        proj.published
                          ? 'border-neutral-200/90 shadow-2xs'
                          : 'border-neutral-200/50 opacity-60 bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Order Controls */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 text-neutral-500 cursor-pointer"
                            title="Move earlier in drop cascade"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] font-mono text-neutral-400">#{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleMoveOrder(idx, 1)}
                            disabled={idx === projects.length - 1}
                            className="p-1 rounded-lg hover:bg-neutral-100 disabled:opacity-30 text-neutral-500 cursor-pointer"
                            title="Move later in drop cascade"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* SVG Shape Badge */}
                        <div className="w-14 h-14 rounded-2xl bg-[#F8F9FA] border border-neutral-200/60 flex items-center justify-center p-2 shrink-0">
                          <svg viewBox={geo.viewBox} className="w-full h-full">
                            <path d={geo.path} fill={proj.color} />
                          </svg>
                        </div>

                        {/* Project Info */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-base text-neutral-900">
                              {proj.title}
                            </span>
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                              {proj.category} · {proj.year}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 line-clamp-1 max-w-xl">
                            {proj.subtitle}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {proj.tags.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Controls */}
                      <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePublished(proj)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                            proj.published
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                          }`}
                          title="Toggle visibility on public live view"
                        >
                          {proj.published ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Published</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Draft</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleMobile(proj)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                            proj.featuredOnMobile
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                          }`}
                          title="Include in mobile 5-shape physics drop"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Mobile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditProject(proj)}
                          className="px-3.5 py-1.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteProject(proj)}
                          className="p-2 rounded-full border border-neutral-200 text-neutral-400 hover:text-red-600 hover:border-red-200 cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : activeTab === 'settings' ? (
          /* ================= SITE & HEADER SETTINGS ================= */
          <form
            onSubmit={handleSaveSiteSettings}
            className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 space-y-6 max-w-3xl"
          >
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">
                Header & Site Settings
              </h2>
              <p className="text-xs text-neutral-500">
                Customize the top blurred header brand name, About modal content, and social links
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Header Brand Name
                </label>
                <input
                  type="text"
                  value={siteSettings.brandName}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, brandName: e.target.value })
                  }
                  placeholder="Muhammad Nurrudin Praseptyo"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Public Contact Email
                </label>
                <input
                  type="email"
                  value={siteSettings.contactEmail}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, contactEmail: e.target.value })
                  }
                  placeholder="contact@mnpraseptyo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  About Modal Badge Text
                </label>
                <input
                  type="text"
                  value={siteSettings.aboutBadge}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, aboutBadge: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  About Modal Heading
                </label>
                <input
                  type="text"
                  value={siteSettings.aboutTitle}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, aboutTitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                About Modal Bio Paragraphs (One paragraph per line)
              </label>
              <textarea
                rows={4}
                value={siteSettings.aboutParagraphs.join('\n\n')}
                onChange={(e) =>
                  setSiteSettings({
                    ...siteSettings,
                    aboutParagraphs: e.target.value.split(/\n\s*\n/)
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-neutral-100">
              <h3 className="text-xs font-mono uppercase text-neutral-500">
                Header Social Icon URLs
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['github', 'linkedin', 'instagram', 'twitter', 'discord', 'reddit'] as const).map((network) => (
                  <div key={network}>
                    <label className="block text-xs font-medium capitalize text-neutral-700 mb-1">
                      {network} URL
                    </label>
                    <input
                      type="url"
                      value={siteSettings.socialLinks[network] || ''}
                      onChange={(e) =>
                        setSiteSettings({
                          ...siteSettings,
                          socialLinks: {
                            ...siteSettings.socialLinks,
                            [network]: e.target.value
                          }
                        })
                      }
                      placeholder={`https://${network}.com/...`}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Site Settings</span>
              </button>
            </div>
          </form>
        ) : (
          /* ================= FIREBASE CLOUD & BACKUPS TAB ================= */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Firebase Connection Card */}
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Firebase Cloud Backend Connection
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Connect Firebase Firestore & Auth for live cloud persistence
                  </p>
                </div>
                {isFirebaseConfigured() && (
                  <button
                    type="button"
                    onClick={handleDisconnectFirebase}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              {/* Quick Paste Snippet */}
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2.5">
                <label className="block text-xs font-medium text-neutral-700">
                  Quick Setup: Paste Firebase Web SDK Config Object
                </label>
                <textarea
                  rows={3}
                  value={rawConfigPaste}
                  onChange={(e) => setRawConfigPaste(e.target.value)}
                  placeholder={`const firebaseConfig = {\n  apiKey: "AIza...",\n  projectId: "my-portfolio",\n  ...\n};`}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleParseFirebaseSnippet}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-medium cursor-pointer"
                >
                  Auto-Extract Fields from Snippet
                </button>
              </div>

              <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                      apiKey *
                    </label>
                    <input
                      type="text"
                      value={fbConfig.apiKey}
                      onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                      projectId *
                    </label>
                    <input
                      type="text"
                      value={fbConfig.projectId}
                      onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                      authDomain
                    </label>
                    <input
                      type="text"
                      value={fbConfig.authDomain}
                      onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                      placeholder="project.firebaseapp.com"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-500 mb-1">
                      appId
                    </label>
                    <input
                      type="text"
                      value={fbConfig.appId}
                      onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-black text-white text-xs font-medium cursor-pointer"
                  >
                    Save & Connect Firebase
                  </button>
                  {isFirebaseConfigured() && (
                    <button
                      type="button"
                      onClick={handleSeedCloud}
                      className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>1-Click Push All Data to Firestore</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* JSON Backups & Factory Reset Card */}
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  JSON Snapshots & Database Tools
                </h2>
                <p className="text-xs text-neutral-500">
                  Export your entire portfolio as a portable JSON file or restore from a snapshot
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-black text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Portfolio `.json`</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-4 py-2.5 rounded-2xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 text-xs font-medium flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset to Factory Seed Data</span>
                </button>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-neutral-100">
                <label className="block text-xs font-medium text-neutral-700">
                  Restore / Import from `.json` Snapshot
                </label>
                <textarea
                  rows={5}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Paste exported backup JSON here..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={handleImportBackup}
                  className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import Snapshot</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
