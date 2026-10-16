import React from 'react';
import { FlaskConical } from 'lucide-react';
import { DiscordIcon, RedditIcon, TwitterIcon, GithubIcon, LinkedinIcon, InstagramIcon } from './Icons';
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '../data/projects';

interface HeaderProps {
  siteSettings?: SiteSettings;
  onOpenAbout?: () => void;
  onOpenConnect?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  siteSettings = DEFAULT_SITE_SETTINGS,
  onOpenAbout,
  onOpenConnect,
}) => {
  const { brandName, socialLinks } = siteSettings;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-20 transition-all select-none">
      {/* 5-Layer Progressive Feathered Blur */}
      <div aria-hidden="true" className="header__blur">
        <span className="header__blur-layer header__blur-layer--1" />
        <span className="header__blur-layer header__blur-layer--2" />
        <span className="header__blur-layer header__blur-layer--3" />
        <span className="header__blur-layer header__blur-layer--4" />
        <span className="header__blur-layer header__blur-layer--5" />
      </div>

      <div className="relative z-10 w-full h-full px-5 sm:px-8 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="text-neutral-900 transition-transform group-hover:scale-105">
            <FlaskConical className="w-5 h-5 text-neutral-900 stroke-[2.2]" />
          </div>
          <span className="font-medium text-lg tracking-tight text-neutral-900">
            {brandName || 'Muhammad Nurrudin Praseptyo'}
          </span>
        </div>

        {/* Center: Clean Text Navigation (desktop/tablet) */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-9 text-sm font-medium text-neutral-800">
          <button
            onClick={onOpenAbout}
            className="hover:text-black transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            className="text-black font-semibold cursor-default"
          >
            Experiments
          </button>
          <button
            onClick={onOpenConnect}
            className="hover:text-black transition-colors cursor-pointer"
          >
            Stay connected
          </button>
        </nav>

        {/* Right: Circular Icon Buttons */}
        <div className="flex items-center gap-2">
          {/* Mobile Quick About Pill */}
          <button
            onClick={onOpenAbout}
            className="md:hidden text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-300/80 bg-white/40 text-neutral-800"
          >
            About
          </button>
          {socialLinks.discord && (
            <a
              href={socialLinks.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex w-9 h-9 rounded-full border border-neutral-300/80 bg-white/40 hover:bg-white/80 text-neutral-800 items-center justify-center transition-all shadow-xs"
              aria-label="Discord"
            >
              <DiscordIcon className="w-4 h-4" />
            </a>
          )}
          {socialLinks.reddit && (
            <a
              href={socialLinks.reddit}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex w-9 h-9 rounded-full border border-neutral-300/80 bg-white/40 hover:bg-white/80 text-neutral-800 items-center justify-center transition-all shadow-xs"
              aria-label="Reddit"
            >
              <RedditIcon className="w-4 h-4" />
            </a>
          )}
          {socialLinks.twitter && (
            <a
              href={socialLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex w-9 h-9 rounded-full border border-neutral-300/80 bg-white/40 hover:bg-white/80 text-neutral-800 items-center justify-center transition-all shadow-xs"
              aria-label="X / Twitter"
            >
              <TwitterIcon className="w-3.5 h-3.5" />
            </a>
          )}
          {socialLinks.github && (
            <a
              href={socialLinks.github}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-neutral-300/80 bg-white/40 hover:bg-white/80 text-neutral-800 flex items-center justify-center transition-all shadow-xs"
              aria-label="GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
          )}
          {socialLinks.linkedin && (
            <a
              href={socialLinks.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-neutral-300/80 bg-white/40 hover:bg-white/80 text-neutral-800 flex items-center justify-center transition-all shadow-xs"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>
          )}
          {socialLinks.instagram && (
            <a
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full border border-neutral-300/80 bg-white/40 hover:bg-white/80 text-neutral-800 flex items-center justify-center transition-all shadow-xs"
              aria-label="Instagram"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
};
