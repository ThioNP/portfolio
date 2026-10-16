import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import {
  PROJECTS,
  DEFAULT_SITE_SETTINGS,
  type Project,
  type SiteSettings
} from '../data/projects';
import { getFirebaseInstances, isFirebaseConfigured } from './firebase';

const LOCAL_PROJECTS_KEY = 'portfolio_cms_projects_v2';
const LOCAL_SETTINGS_KEY = 'portfolio_cms_site_settings_v2';

function normalizeProjects(list: Project[]): Project[] {
  return [...list]
    .map((p, idx) => ({
      ...p,
      published: p.published ?? true,
      featuredOnMobile: p.featuredOnMobile ?? idx < 5,
      order: typeof p.order === 'number' ? p.order : idx
    }))
    .sort((a, b) => a.order - b.order);
}

export function getLocalProjects(): Project[] {
  if (typeof window === 'undefined') return normalizeProjects(PROJECTS);
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    if (!raw) return normalizeProjects(PROJECTS);
    const parsed = JSON.parse(raw) as Project[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeProjects(parsed);
    }
  } catch {
    // Fallback to defaults
  }
  return normalizeProjects(PROJECTS);
}

export function setLocalProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(normalizeProjects(projects)));
}

export function getLocalSiteSettings(): SiteSettings {
  if (typeof window === 'undefined') return DEFAULT_SITE_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!raw) return DEFAULT_SITE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...parsed,
      socialLinks: {
        ...DEFAULT_SITE_SETTINGS.socialLinks,
        ...(parsed.socialLinks || {})
      }
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function setLocalSiteSettings(settings: SiteSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * Used by the Public Live View (/) to fetch published projects and site settings.
 */
export async function fetchPublicPortfolioData(): Promise<{
  projects: Project[];
  siteSettings: SiteSettings;
  source: 'firebase' | 'local';
}> {
  const localProjects = getLocalProjects();
  const localSettings = getLocalSiteSettings();

  if (!isFirebaseConfigured()) {
    return {
      projects: localProjects.filter((p) => p.published !== false),
      siteSettings: localSettings,
      source: 'local'
    };
  }

  const instances = getFirebaseInstances();
  if (!instances) {
    return {
      projects: localProjects.filter((p) => p.published !== false),
      siteSettings: localSettings,
      source: 'local'
    };
  }

  try {
    const [projSnap, settingsSnap] = await Promise.all([
      getDocs(collection(instances.db, 'projects')),
      getDoc(doc(instances.db, 'settings', 'site'))
    ]);

    let resolvedProjects = localProjects;
    if (!projSnap.empty) {
      const cloudProjects: Project[] = [];
      projSnap.forEach((docSnap) => {
        cloudProjects.push(docSnap.data() as Project);
      });
      resolvedProjects = normalizeProjects(cloudProjects);
      setLocalProjects(resolvedProjects);
    }

    let resolvedSettings = localSettings;
    if (settingsSnap.exists()) {
      resolvedSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...(settingsSnap.data() as Partial<SiteSettings>)
      };
      setLocalSiteSettings(resolvedSettings);
    }

    return {
      projects: resolvedProjects.filter((p) => p.published !== false),
      siteSettings: resolvedSettings,
      source: 'firebase'
    };
  } catch (err) {
    console.warn('Firestore fetch fallback to local cache:', err);
    return {
      projects: localProjects.filter((p) => p.published !== false),
      siteSettings: localSettings,
      source: 'local'
    };
  }
}

/**
 * Used exclusively by the /admin Portal to load all projects (including drafts).
 */
export async function fetchAdminPortfolioData(): Promise<{
  projects: Project[];
  siteSettings: SiteSettings;
  source: 'firebase' | 'local';
}> {
  const localProjects = getLocalProjects();
  const localSettings = getLocalSiteSettings();

  const instances = getFirebaseInstances();
  if (!instances) {
    return {
      projects: localProjects,
      siteSettings: localSettings,
      source: 'local'
    };
  }

  try {
    const [projSnap, settingsSnap] = await Promise.all([
      getDocs(collection(instances.db, 'projects')),
      getDoc(doc(instances.db, 'settings', 'site'))
    ]);

    let resolvedProjects = localProjects;
    if (!projSnap.empty) {
      const cloudProjects: Project[] = [];
      projSnap.forEach((docSnap) => {
        cloudProjects.push(docSnap.data() as Project);
      });
      resolvedProjects = normalizeProjects(cloudProjects);
      setLocalProjects(resolvedProjects);
    }

    let resolvedSettings = localSettings;
    if (settingsSnap.exists()) {
      resolvedSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...(settingsSnap.data() as Partial<SiteSettings>)
      };
      setLocalSiteSettings(resolvedSettings);
    }

    return {
      projects: resolvedProjects,
      siteSettings: resolvedSettings,
      source: 'firebase'
    };
  } catch (err) {
    console.warn('Admin Firestore fetch fallback to local:', err);
    return {
      projects: localProjects,
      siteSettings: localSettings,
      source: 'local'
    };
  }
}

function sanitizeProjectForFirestore(project: Project): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: project.id.trim(),
    title: project.title.trim(),
    subtitle: project.subtitle.trim(),
    category: project.category.trim(),
    shapeType: project.shapeType,
    color: project.color.trim(),
    summary: project.summary.trim(),
    description: project.description.trim(),
    keyFeatures: project.keyFeatures.filter((f) => f.trim().length > 0),
    tags: project.tags.filter((t) => t.trim().length > 0),
    metrics: project.metrics.filter((m) => m.label.trim() && m.value.trim()),
    year: project.year.trim() || new Date().getFullYear().toString(),
    published: Boolean(project.published),
    featuredOnMobile: Boolean(project.featuredOnMobile),
    order: Number(project.order) || 0,
    updatedAt: Date.now()
  };

  if (project.demoUrl?.trim()) payload.demoUrl = project.demoUrl.trim();
  if (project.githubUrl?.trim()) payload.githubUrl = project.githubUrl.trim();
  if (project.coverImage?.trim()) payload.coverImage = project.coverImage.trim();
  if (project.galleryImages && project.galleryImages.length > 0) {
    payload.galleryImages = project.galleryImages.filter((g) => g.trim().length > 0);
  }
  if (project.accentTextColor?.trim()) {
    payload.accentTextColor = project.accentTextColor.trim();
  }

  return payload;
}

export async function saveProjectToBackend(project: Project): Promise<Project[]> {
  const current = getLocalProjects();
  const existingIdx = current.findIndex((p) => p.id === project.id);
  const updatedProject: Project = {
    ...project,
    updatedAt: Date.now()
  };

  let nextList: Project[];
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = updatedProject;
  } else {
    updatedProject.order = current.length;
    nextList = [...current, updatedProject];
  }

  const normalized = normalizeProjects(nextList);
  setLocalProjects(normalized);

  const instances = getFirebaseInstances();
  if (instances) {
    await setDoc(
      doc(instances.db, 'projects', updatedProject.id),
      sanitizeProjectForFirestore(updatedProject)
    );
  }

  return normalized;
}

export async function deleteProjectFromBackend(projectId: string): Promise<Project[]> {
  const current = getLocalProjects().filter((p) => p.id !== projectId);
  const reindexed = current.map((p, i) => ({ ...p, order: i }));
  setLocalProjects(reindexed);

  const instances = getFirebaseInstances();
  if (instances) {
    await deleteDoc(doc(instances.db, 'projects', projectId));
  }

  return reindexed;
}

export async function reorderProjectsInBackend(orderedProjects: Project[]): Promise<Project[]> {
  const reindexed = orderedProjects.map((p, idx) => ({
    ...p,
    order: idx,
    updatedAt: Date.now()
  }));
  setLocalProjects(reindexed);

  const instances = getFirebaseInstances();
  if (instances) {
    const batch = writeBatch(instances.db);
    reindexed.forEach((proj) => {
      batch.set(doc(instances.db, 'projects', proj.id), sanitizeProjectForFirestore(proj));
    });
    await batch.commit();
  }

  return reindexed;
}

export async function saveSiteSettingsToBackend(settings: SiteSettings): Promise<SiteSettings> {
  setLocalSiteSettings(settings);

  const instances = getFirebaseInstances();
  if (instances) {
    await setDoc(doc(instances.db, 'settings', 'site'), {
      brandName: settings.brandName.trim() || 'Muhammad Nurrudin Praseptyo',
      aboutBadge: settings.aboutBadge.trim(),
      aboutTitle: settings.aboutTitle.trim(),
      aboutParagraphs: settings.aboutParagraphs.filter((p) => p.trim().length > 0),
      contactEmail: settings.contactEmail.trim(),
      socialLinks: settings.socialLinks,
      adminWhitelistEmails: settings.adminWhitelistEmails.filter((e) => e.trim().length > 0),
      updatedAt: Date.now()
    });
  }

  return settings;
}

export async function seedFirestoreDatabase(): Promise<void> {
  const instances = getFirebaseInstances();
  if (!instances) {
    throw new Error('Firebase is not connected. Add your Firebase config first.');
  }

  const projects = getLocalProjects();
  const settings = getLocalSiteSettings();

  const batch = writeBatch(instances.db);
  projects.forEach((proj) => {
    batch.set(doc(instances.db, 'projects', proj.id), sanitizeProjectForFirestore(proj));
  });
  batch.set(doc(instances.db, 'settings', 'site'), {
    brandName: settings.brandName.trim() || 'Muhammad Nurrudin Praseptyo',
    aboutBadge: settings.aboutBadge.trim(),
    aboutTitle: settings.aboutTitle.trim(),
    aboutParagraphs: settings.aboutParagraphs.filter((p) => p.trim().length > 0),
    contactEmail: settings.contactEmail.trim(),
    socialLinks: settings.socialLinks,
    adminWhitelistEmails: settings.adminWhitelistEmails.filter((e) => e.trim().length > 0),
    updatedAt: Date.now()
  });

  await batch.commit();
}

export function exportPortfolioBackupJson(): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      siteSettings: getLocalSiteSettings(),
      projects: getLocalProjects()
    },
    null,
    2
  );
}

export async function importPortfolioBackupJson(jsonString: string): Promise<{
  projects: Project[];
  siteSettings: SiteSettings;
}> {
  const parsed = JSON.parse(jsonString);
  if (!parsed || !Array.isArray(parsed.projects)) {
    throw new Error('Invalid backup JSON format: missing "projects" array.');
  }

  const projects = normalizeProjects(parsed.projects);
  const siteSettings: SiteSettings = {
    ...DEFAULT_SITE_SETTINGS,
    ...(parsed.siteSettings || {})
  };

  setLocalProjects(projects);
  setLocalSiteSettings(siteSettings);

  if (isFirebaseConfigured()) {
    await seedFirestoreDatabase();
  }

  return { projects, siteSettings };
}

export async function resetPortfolioToFactoryDefaults(): Promise<{
  projects: Project[];
  siteSettings: SiteSettings;
}> {
  const defaultProjects = normalizeProjects(PROJECTS);
  setLocalProjects(defaultProjects);
  setLocalSiteSettings(DEFAULT_SITE_SETTINGS);

  return {
    projects: defaultProjects,
    siteSettings: DEFAULT_SITE_SETTINGS
  };
}
