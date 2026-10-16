import React, { useEffect, useState } from 'react';
import type { Project } from '../data/projects';
import { PROJECTS } from '../data/projects';
import { SHAPE_GEOMETRIES } from '../lib/shapeGeometry';
import { X, ExternalLink, ArrowLeft, ArrowRight, CheckCircle2, Calendar, Layers } from 'lucide-react';
import { GithubIcon } from './Icons';

interface ProjectMorphModalProps {
  project: Project | null;
  projects?: Project[];
  originRect: DOMRect | null;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
}

export const ProjectMorphModal: React.FC<ProjectMorphModalProps> = ({
  project,
  projects = PROJECTS,
  originRect: _originRect,
  onClose,
  onSelectProject,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (project) {
      // Trigger expansion animation immediately after mount
      const timer = requestAnimationFrame(() => {
        setIsExpanded(true);
      });
      // Lock background scroll
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        cancelAnimationFrame(timer);
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [project]);

  const handleClose = () => {
    setIsExpanded(false);
    setTimeout(() => {
      onClose();
    }, 280);
  };

  if (!project) return null;

  const activeList = projects.length > 0 ? projects : PROJECTS;
  const geo = SHAPE_GEOMETRIES[project.shapeType];
  const currentIndex = Math.max(0, activeList.findIndex((p) => p.id === project.id));
  const prevProject = activeList[(currentIndex - 1 + activeList.length) % activeList.length];
  const nextProject = activeList[(currentIndex + 1) % activeList.length];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 lg:p-10 select-none">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`fixed inset-0 bg-neutral-900/60 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isExpanded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Morphing Container */}
      <div
        className={`relative z-10 w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-neutral-200/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isExpanded
            ? 'scale-100 opacity-100 translate-y-0'
            : 'scale-90 opacity-0 translate-y-8'
        }`}
      >
        {/* Top Header Banner with Project Color Accent */}
        <div 
          className="relative px-6 sm:px-8 pt-8 pb-6 flex items-start justify-between border-b border-neutral-100 overflow-hidden"
          style={{ backgroundColor: `${project.color}18` }}
        >
          {/* Subtle geometric background watermark */}
          <div 
            className="absolute -right-8 -top-8 w-44 h-44 opacity-25 pointer-events-none"
            style={{ color: project.color }}
          >
            <svg viewBox={geo.viewBox} className="w-full h-full fill-current">
              <path d={geo.path} />
            </svg>
          </div>

          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span 
                className="w-3.5 h-3.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-xs font-mono font-medium tracking-wide uppercase text-neutral-600">
                {project.category}
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-xs font-mono text-neutral-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {project.year}
              </span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
              {project.title}
            </h2>
            <p className="text-sm sm:text-base text-neutral-600 font-medium max-w-xl">
              {project.subtitle}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="relative z-10 w-10 h-10 rounded-full bg-white/80 hover:bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200 flex items-center justify-center transition-all shadow-sm active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6 select-text">
          {/* Optional Cover Image / Media Preview */}
          {project.coverImage && (
            <div className="rounded-2xl overflow-hidden border border-neutral-200/80 bg-neutral-100">
              <img
                src={project.coverImage}
                alt={project.title}
                className="w-full max-h-72 object-cover"
              />
            </div>
          )}

          {/* Metrics Row */}
          {project.metrics && project.metrics.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
              {project.metrics.map((metric, i) => (
                <div key={i} className="text-center sm:text-left">
                  <div className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
                    {metric.label}
                  </div>
                  <div className="text-lg sm:text-2xl font-semibold text-neutral-900 mt-0.5">
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Overview & Description */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
              Overview & Problem Statement
            </h3>
            <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Key Architecture Highlights */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
              Key Technical Innovations
            </h3>
            <ul className="space-y-2">
              {project.keyFeatures.map((feat, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm sm:text-base text-neutral-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-1 flex-shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tech Stack Chips */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Technologies & Tooling
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-lg text-xs font-mono font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions & Navigation */}
        <div className="px-6 sm:px-8 py-4 bg-neutral-50 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
          {/* External links */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white text-xs sm:text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <span>Live Experiment</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white text-neutral-700 text-xs sm:text-sm font-medium border border-neutral-200 hover:bg-neutral-100 transition-colors"
              >
                <GithubIcon className="w-4 h-4" />
                <span>Source</span>
              </a>
            )}
          </div>

          {/* Next / Previous Project Carousel Switcher */}
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto text-xs text-neutral-500 font-mono">
            <button
              onClick={() => onSelectProject(prevProject)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-neutral-200/70 transition-colors text-neutral-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev:</span> {prevProject.shapeType}
            </button>
            <span className="text-neutral-300">|</span>
            <button
              onClick={() => onSelectProject(nextProject)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-neutral-200/70 transition-colors text-neutral-700"
            >
              <span className="hidden sm:inline">Next:</span> {nextProject.shapeType}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
