import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { PhysicsHero } from './components/PhysicsHero';
import { ProjectMorphModal } from './components/ProjectMorphModal';
import {
  DEFAULT_SITE_SETTINGS,
  type Project,
  type SiteSettings
} from './data/projects';
import {
  fetchPublicPortfolioData,
  getLocalProjects,
  getLocalSiteSettings
} from './lib/portfolioService';
import { Sparkles, X, Mail } from 'lucide-react';
import { GithubIcon, TwitterIcon, DiscordIcon, RedditIcon } from './components/Icons';

// Strictly code-split: Regular visitors on (/) NEVER download the AdminPortal bundle
const AdminPortal = lazy(() => import('./pages/AdminPortal'));

function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  return path === '/admin' || path.startsWith('/admin/') || hash === '#admin';
}

export function App() {
  const [isAdmin, setIsAdmin] = useState<boolean>(isAdminRoute);

  // Public Live View state — seeded immediately with local cache/defaults so shapes drop with 0 delay
  const [projects, setProjects] = useState<Project[]>(() =>
    getLocalProjects().filter((p) => p.published !== false)
  );
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(() =>
    getLocalSiteSettings() || DEFAULT_SITE_SETTINGS
  );

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdmin(isAdminRoute());
    };
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  // Fetch latest published data from backend on public route mount
  useEffect(() => {
    if (isAdmin) return;
    let mounted = true;
    fetchPublicPortfolioData().then((data) => {
      if (!mounted) return;
      setProjects(data.projects);
      setSiteSettings(data.siteSettings);
    });
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const handleOpenProject = useCallback((project: Project, rect?: DOMRect) => {
    setSelectedProject(project);
    if (rect) {
      setOriginRect(rect);
    }
  }, []);

  const handleCloseProject = () => {
    setSelectedProject(null);
  };

  // Dedicated Backend Admin Portal (/admin) — completely isolated from the public live view
  if (isAdmin) {
    return (
      <Suspense
        fallback={
          <div className="w-screen h-screen flex items-center justify-center bg-[#F8F9FA] text-xs font-mono text-neutral-500">
            Loading Backend Admin Portal...
          </div>
        }
      >
        <AdminPortal />
      </Suspense>
    );
  }

  // Public Live View (/) — 100% pure portfolio playground with zero CMS UI
  return (
    <div className="w-screen h-screen overflow-hidden bg-[#F8F9FA] text-neutral-900 select-none relative">
      {/* Google Labs 5-Layer Blurred Header */}
      <Header
        siteSettings={siteSettings}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenConnect={() => setIsConnectOpen(true)}
      />

      {/* The entire website is the full-viewport Physics Hero Shapes section */}
      <main className="w-full h-full">
        <PhysicsHero
          projects={projects}
          onSelectProject={handleOpenProject}
        />
      </main>

      {/* Expanding Morph Card Modal for Tapped Projects */}
      {selectedProject && (
        <ProjectMorphModal
          project={selectedProject}
          projects={projects}
          originRect={originRect}
          onClose={handleCloseProject}
          onSelectProject={(next) => setSelectedProject(next)}
        />
      )}

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={() => setIsAboutOpen(false)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md animate-in fade-in"
          />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{siteSettings.aboutBadge || 'About Portfolio Labs'}</span>
              </div>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-2xl font-semibold text-neutral-900 tracking-tight">
              {siteSettings.aboutTitle || 'Interactive Physics Playground'}
            </h3>
            {(siteSettings.aboutParagraphs || []).map((para, idx) => (
              <p key={idx} className="text-sm text-neutral-600 leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Stay Connected Modal */}
      {isConnectOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            onClick={() => setIsConnectOpen(false)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md animate-in fade-in"
          />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-200 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-mono">
                <Mail className="w-3.5 h-3.5 text-neutral-600" />
                <span>Stay Connected</span>
              </div>
              <button
                onClick={() => setIsConnectOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-2xl font-semibold text-neutral-900 tracking-tight">
              Let's connect
            </h3>
            <div className="space-y-3">
              {siteSettings.contactEmail && (
                <a
                  href={`mailto:${siteSettings.contactEmail}`}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 text-sm font-medium transition-colors"
                >
                  <span>{siteSettings.contactEmail}</span>
                  <span className="text-xs text-neutral-400 font-mono">Email</span>
                </a>
              )}
              <div className="grid grid-cols-4 gap-2 pt-2">
                {siteSettings.socialLinks.github && (
                  <a
                    href={siteSettings.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-700 transition-colors"
                  >
                    <GithubIcon className="w-5 h-5" />
                  </a>
                )}
                {siteSettings.socialLinks.twitter && (
                  <a
                    href={siteSettings.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-700 transition-colors"
                  >
                    <TwitterIcon className="w-4 h-4" />
                  </a>
                )}
                {siteSettings.socialLinks.discord && (
                  <a
                    href={siteSettings.socialLinks.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-700 transition-colors"
                  >
                    <DiscordIcon className="w-5 h-5" />
                  </a>
                )}
                {siteSettings.socialLinks.reddit && (
                  <a
                    href={siteSettings.socialLinks.reddit}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-2xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 flex items-center justify-center text-neutral-700 transition-colors"
                  >
                    <RedditIcon className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
