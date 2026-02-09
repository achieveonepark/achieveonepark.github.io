import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, FolderOpen, X } from 'lucide-react';
import { OSContext } from '../context';
import { getFileInfo, withBasePath } from '../constants';
import type { FileObject } from '../types';
import unityLogo from '../../images/unity.png';
import csharpLogo from '../../images/csharp.png';
import githubLogo from '../../images/github-logo.png';
import docsLogo from '../../images/docs-logo.png';
import profileImage from '../../images/profile.png';
import logo111percent from '../../images/111percent.png';
import logoSnowpipe from '../../images/snowpipe.png';
import logoGridinc from '../../images/gridinc.png';
import logoSnowballs from '../../images/snowballs.png';
import logoDalcomsoft from '../../images/dalcomsoft.png';

const SKILLS_PATH = withBasePath('parkachieveone/portfolio/skills.md');
const ABOUT_PATH = withBasePath('parkachieveone/portfolio/about.md');
const PROJECTS_PATH = withBasePath('parkachieveone/portfolio/projects.md');
const FILES_JSON_PATH = withBasePath('parkachieveone/files.json');
const WIDGET_FOCUS_EVENT = 'desktop-widget-focus';

type ExperienceItem = {
  path: string;
  title: string;
  period: string;
};

type ProjectItem = {
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
};

interface WidgetProps {
  title: string;
  x: number;
  y: number;
  width?: number;
  contentMaxHeight?: string;
  expanded: boolean;
  onToggle: () => void;
  emphasized: boolean;
  children: React.ReactNode;
}

interface IOSWidgetCardProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  emphasized: boolean;
  children: React.ReactNode;
}

const DesktopWidget: React.FC<WidgetProps> = ({
  title,
  x,
  y,
  width = 380,
  contentMaxHeight = '44vh',
  expanded,
  onToggle,
  emphasized,
  children,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, x, y }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{ width, maxWidth: 'calc(100vw - 28px)' }}
      className={`absolute rounded-xl border bg-black/65 backdrop-blur-md shadow-[0_0_24px_rgba(6,182,212,0.14)] pointer-events-auto ${
        emphasized ? 'border-cyan-300/70' : 'border-cyan-500/30'
      }`}
    >
      <div
        className="h-9 rounded-t-xl border-b border-cyan-500/20 flex items-center justify-between px-3"
      >
        <span className="text-xs tracking-[0.18em] uppercase text-cyan-200 font-semibold">{title}</span>
        <button type="button" onClick={onToggle} className="text-cyan-300 hover:text-white transition-colors">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 overflow-y-auto" style={{ maxHeight: contentMaxHeight }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const IOSWidgetCard: React.FC<IOSWidgetCardProps> = ({ title, expanded, onToggle, emphasized, children }) => {
  return (
    <div
      className={`rounded-[24px] border backdrop-blur-2xl overflow-hidden ${
        emphasized
          ? 'border-cyan-200/70 bg-cyan-900/25 shadow-[0_10px_35px_rgba(34,211,238,0.2)]'
          : 'border-white/25 bg-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.35)]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full h-11 px-4 flex items-center justify-between text-cyan-50"
      >
        <span className="text-[11px] tracking-[0.16em] uppercase font-semibold">{title}</span>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="ios-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 max-h-[38vh] overflow-y-auto">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DesktopSkillsWidget: React.FC = () => {
  const { openFile, windows } = useContext(OSContext);

  const [skills, setSkills] = useState<string[]>([]);
  const [aboutName, setAboutName] = useState('');
  const [aboutCareer, setAboutCareer] = useState('');
  const [aboutSummary, setAboutSummary] = useState<string[]>([]);
  const [experienceItems, setExperienceItems] = useState<ExperienceItem[]>([]);
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([]);
  const [isProfileZoomed, setIsProfileZoomed] = useState(false);
  const [expanded, setExpanded] = useState({ profile: true, experience: true, projects: true, skills: true });
  const [focusedWidget, setFocusedWidget] = useState<'profile' | 'experience' | 'projects' | 'skills' | null>(null);
  const [profileWidgetHeight, setProfileWidgetHeight] = useState(0);
  const [experienceWidgetHeight, setExperienceWidgetHeight] = useState(0);
  const [skillsWidgetHeight, setSkillsWidgetHeight] = useState(0);
  const widgetVerticalGap = 460;
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  );

  const clearFocusTimer = useRef<number | null>(null);
  const profileWidgetRef = useRef<HTMLDivElement>(null);
  const experienceWidgetRef = useRef<HTMLDivElement>(null);
  const skillsWidgetRef = useRef<HTMLDivElement>(null);

  const isMobile = viewportWidth < 1024;

  const PROFILE_X = isMobile ? 12 : 20;
  const PROFILE_Y = 24;
  const COLLAPSED_WIDGET_HEIGHT = 36;
  const SECONDARY_WIDGET_CONTENT_HEIGHT = '44vh';
  const PROJECTS_BOTTOM_TRIM = 190;
  const RIGHT_X = isMobile ? 12 : 420;
  const RIGHT_Y = 24;

  const profileAnchorHeight = expanded.profile
    ? profileWidgetHeight
    : COLLAPSED_WIDGET_HEIGHT;

  const experienceAnchorHeight = expanded.experience
    ? experienceWidgetHeight
    : COLLAPSED_WIDGET_HEIGHT;

  const skillsY = PROFILE_Y + profileAnchorHeight + widgetVerticalGap;

  const skillsAnchorHeight = expanded.skills
    ? skillsWidgetHeight
    : COLLAPSED_WIDGET_HEIGHT;

  const experienceY = isMobile
    ? skillsY + skillsAnchorHeight + widgetVerticalGap
    : RIGHT_Y;

  const projectsY = isMobile
    ? experienceY + experienceAnchorHeight + widgetVerticalGap
    : RIGHT_Y + experienceAnchorHeight + widgetVerticalGap;

  const widgetWidth = isMobile ? Math.max(300, viewportWidth - 24) : 380;

  const iconMap = useMemo<Record<string, string>>(
    () => ({
      unity: unityLogo,
      'c#': csharpLogo,
      github: githubLogo,
      markdown: docsLogo,
    }),
    [],
  );

  const experienceLogoBySlug = useMemo<Record<string, string>>(
    () => ({
      '111percent': logo111percent,
      snowpipe: logoSnowpipe,
      gridinc: logoGridinc,
      snowballs: logoSnowballs,
      dalcomsoft: logoDalcomsoft,
    }),
    [],
  );

  const openMarkdownPath = (relativePath: string) => {
    const fileName = relativePath.split('/').pop();
    if (!fileName) return;

    const info = getFileInfo(fileName);
    const file: FileObject = {
      name: fileName,
      icon: info.icon,
      color: info.color,
      type: info.type,
      content: withBasePath(`parkachieveone/${relativePath}`),
    };

    openFile(file);
  };

  const extractYoutubeVideoId = (url: string) => {
    const embedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/i);
    if (embedMatch?.[1]) return embedMatch[1];

    const watchMatch = url.match(/[?&]v=([^?&/]+)/i);
    if (watchMatch?.[1]) return watchMatch[1];

    const shortMatch = url.match(/youtu\.be\/([^?&/]+)/i);
    if (shortMatch?.[1]) return shortMatch[1];

    return '';
  };

  const toEmbedUrl = (url: string) => {
    if (url.includes('/embed/')) return url;
    const id = extractYoutubeVideoId(url);
    return id ? `https://www.youtube.com/embed/${id}` : url;
  };

  const openVideoInBrowser = (project: ProjectItem) => {
    const projectsDocPath = withBasePath('parkachieveone/portfolio/projects.md');
    const existingProjectsWindow = windows.find(
      (windowState) => windowState.appId === 'docreader' && windowState.content === projectsDocPath,
    );

    if (!existingProjectsWindow) {
      const info = getFileInfo('projects.md');
      const projectsFile: FileObject = {
        name: 'projects.md',
        icon: info.icon,
        color: info.color,
        type: info.type,
        content: projectsDocPath,
        preferredWindowSide: 'right',
      };

      openFile(projectsFile);
    }

    const file: FileObject = {
      name: `${project.title}.youtube`,
      icon: FolderOpen,
      color: 'text-red-400',
      type: 'pdf',
      content: project.videoUrl,
      preferredWindowSide: 'left',
    };

    openFile(file);
  };

  useEffect(() => {
    const loadSkills = async () => {
      try {
        const response = await fetch(SKILLS_PATH);
        if (!response.ok) return;

        const markdown = await response.text();
        const parsed = markdown
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('- '))
          .map(line => line.replace('- ', '').trim())
          .filter(Boolean);

        setSkills(parsed);
      } catch (error) {
        console.error('Failed to load skills widget data:', error);
      }
    };

    loadSkills();
  }, []);

  useEffect(() => {
    const loadAbout = async () => {
      try {
        const response = await fetch(ABOUT_PATH);
        if (!response.ok) return;

        const markdown = await response.text();
        const lines = markdown.split('\n').map(line => line.trim()).filter(Boolean);

        const profileLines = lines.filter(line => line.startsWith('- '));
        const nameLine = profileLines.find(line => line.startsWith('- 이름:'));
        const careerLine = profileLines.find(line => line.startsWith('- 경력:'));

        if (nameLine) setAboutName(nameLine.replace('- 이름:', '').trim());
        if (careerLine) setAboutCareer(careerLine.replace('- 경력:', '').trim());

        const summaryLines = lines
          .filter(line => !line.startsWith('#') && !line.startsWith('- '))
          .filter(Boolean);

        setAboutSummary(summaryLines);
      } catch (error) {
        console.error('Failed to load about widget data:', error);
      }
    };

    loadAbout();
  }, []);

  useEffect(() => {
    const loadExperience = async () => {
      try {
        const filesResponse = await fetch(FILES_JSON_PATH);
        if (!filesResponse.ok) return;

        const manifest = await filesResponse.json();
        const rawFiles = Array.isArray(manifest?.files) ? manifest.files : [];
        const candidatePaths: Array<string | undefined> = rawFiles.map((entry: unknown) =>
          typeof entry === 'string' ? entry : (entry as { path?: string })?.path,
        );

        const paths: string[] = candidatePaths.filter((filePath): filePath is string =>
          typeof filePath === 'string' && filePath.startsWith('portfolio/experience/') && filePath.endsWith('.md'),
        );

        const docs = await Promise.all(
          paths.map(async (filePath: string) => {
            try {
              const response = await fetch(withBasePath(`parkachieveone/${filePath}`));
              if (!response.ok) return null;

              const markdown = await response.text();
              const lines = markdown.split('\n').map(line => line.trim()).filter(Boolean);
              const title = lines.find(line => line.startsWith('# '))?.replace('# ', '') || filePath.split('/').pop()?.replace('.md', '') || filePath;
              const period = lines.find(line => line.startsWith('- 기간:'))?.replace('- 기간:', '').trim() || '-';

              return { path: filePath, title, period };
            } catch {
              return null;
            }
          }),
        );

        const desiredOrder = ['111percent', 'snowpipe', 'gridinc', 'snowballs', 'dalcomsoft'];
        const getOrderIndex = (path: string) => {
          const fileName = path.split('/').pop()?.replace('.md', '') || '';
          const index = desiredOrder.indexOf(fileName);
          return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        };

        const sorted = docs
          .filter((item): item is ExperienceItem => item !== null)
          .sort((a, b) => {
            const aIndex = getOrderIndex(a.path);
            const bIndex = getOrderIndex(b.path);
            if (aIndex !== bIndex) return aIndex - bIndex;
            return a.title.localeCompare(b.title, 'en');
          });

        setExperienceItems(sorted);
      } catch (error) {
        console.error('Failed to load experience widget data:', error);
      }
    };

    loadExperience();
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(PROJECTS_PATH);
        if (!response.ok) return;

        const markdown = await response.text();
        const lines = markdown.split('\n').map(line => line.trim());

        const items: ProjectItem[] = [];
        let currentTitle = '';

        for (const line of lines) {
          if (line.startsWith('## ')) {
            currentTitle = line.replace('## ', '').trim();
            continue;
          }

          if (line.startsWith('- 영상:') && currentTitle) {
            const rawUrl = line.replace('- 영상:', '').trim();
            const embedUrl = toEmbedUrl(rawUrl);
            const id = extractYoutubeVideoId(embedUrl);

            items.push({
              title: currentTitle,
              videoUrl: embedUrl,
              thumbnailUrl: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
            });
          }
        }

        setProjectItems(items);
      } catch (error) {
        console.error('Failed to load project widget data:', error);
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!profileWidgetRef.current) return;

    const updateHeight = () => {
      if (profileWidgetRef.current) {
        setProfileWidgetHeight(profileWidgetRef.current.getBoundingClientRect().height);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(profileWidgetRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (profileWidgetRef.current) {
      setProfileWidgetHeight(profileWidgetRef.current.getBoundingClientRect().height);
    }
  }, [expanded.profile]);

  useEffect(() => {
    if (!skillsWidgetRef.current) return;

    const updateHeight = () => {
      if (skillsWidgetRef.current) {
        setSkillsWidgetHeight(skillsWidgetRef.current.getBoundingClientRect().height);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(skillsWidgetRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (skillsWidgetRef.current) {
      setSkillsWidgetHeight(skillsWidgetRef.current.getBoundingClientRect().height);
    }
  }, [expanded.skills]);

  useEffect(() => {
    if (!experienceWidgetRef.current) return;

    const updateHeight = () => {
      if (experienceWidgetRef.current) {
        setExperienceWidgetHeight(experienceWidgetRef.current.getBoundingClientRect().height);
      }
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(experienceWidgetRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (experienceWidgetRef.current) {
      setExperienceWidgetHeight(experienceWidgetRef.current.getBoundingClientRect().height);
    }
  }, [expanded.experience]);

  useEffect(() => {
    const handleFocus = (event: Event) => {
      const section = (event as CustomEvent<{ section?: 'profile' | 'experience' | 'projects' | 'skills' }>).detail?.section;
      if (!section) return;

      setExpanded(prev => ({ ...prev, [section]: true }));
      setFocusedWidget(section);

      if (clearFocusTimer.current) {
        window.clearTimeout(clearFocusTimer.current);
      }

      clearFocusTimer.current = window.setTimeout(() => {
        setFocusedWidget(null);
      }, 1400);
    };

    window.addEventListener(WIDGET_FOCUS_EVENT, handleFocus as EventListener);
    return () => {
      window.removeEventListener(WIDGET_FOCUS_EVENT, handleFocus as EventListener);
      if (clearFocusTimer.current) window.clearTimeout(clearFocusTimer.current);
    };
  }, []);

  if (skills.length === 0 && aboutSummary.length === 0 && experienceItems.length === 0 && projectItems.length === 0) return null;

  const profileContent = (
    <>
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => setIsProfileZoomed(true)}
          className="rounded-lg border border-cyan-500/40 overflow-hidden"
        >
          <img src={profileImage} alt="Profile" className="w-16 h-16 object-cover" draggable={false} loading="eager" />
        </button>
        <div>
          <div className="text-cyan-100 font-bold text-base">{aboutName || 'Profile'}</div>
          <div className="text-sm text-cyan-300/90">{aboutCareer || 'Unity Developer'}</div>
        </div>
      </div>

      <div className="space-y-2.5">
        {aboutSummary.map((line, index) => (
          <p key={`${line}-${index}`} className="text-sm leading-relaxed text-gray-200">
            {line}
          </p>
        ))}
      </div>
    </>
  );

  const experienceContent = (
    <div className="space-y-2.5">
      {experienceItems.map((item) => (
        <button
          key={item.path}
          type="button"
          onClick={() => openMarkdownPath(item.path)}
          className="w-full text-left rounded-lg border border-white/10 bg-black/50 px-3 py-3 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors"
        >
          <div className="flex items-start gap-3">
            {(() => {
              const slug = item.path.split('/').pop()?.replace('.md', '') || '';
              const logo = experienceLogoBySlug[slug];

              return logo ? (
                <img
                  src={logo}
                  alt={item.title}
                  className="h-12 w-auto max-w-[88px] object-contain rounded-sm border border-white/10 bg-black/40 shrink-0"
                  draggable={false}
                />
              ) : (
                <div className="h-12 min-w-12 px-2 rounded-sm border border-white/10 bg-black/40 shrink-0 flex items-center justify-center text-[10px] text-cyan-200">ETC</div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-cyan-100 font-semibold leading-snug">{item.title}</div>
              <div className="text-xs text-cyan-300/75 mt-1">{item.period}</div>
            </div>
            <FolderOpen size={14} className="text-cyan-400/80 shrink-0" />
          </div>
        </button>
      ))}
    </div>
  );

  const skillsContent = (
    <div className="grid grid-cols-2 gap-2.5">
      {skills.map((skill) => {
        const image = iconMap[skill.toLowerCase()];
        return (
          <div key={skill} className="h-12 rounded-lg border border-white/10 bg-black/50 flex items-center gap-2.5 px-2.5">
            {image ? (
              <img src={image} alt={skill} className="w-6 h-6 object-contain" draggable={false} />
            ) : (
              <div className="w-6 h-6 rounded-md bg-cyan-900/30 text-cyan-200 text-[10px] font-bold flex items-center justify-center">
                {skill.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-100 font-semibold truncate">{skill}</span>
          </div>
        );
      })}
    </div>
  );

  const projectsContent = (
    <div className="space-y-3">
      {projectItems.map((project) => (
        <button
          key={project.title}
          type="button"
          onClick={() => openVideoInBrowser(project)}
          className="w-full text-left rounded-lg border border-white/10 bg-black/50 p-2.5 hover:bg-red-500/10 hover:border-red-400/40 transition-colors"
        >
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.title}
              className="w-full h-32 object-cover rounded-md border border-white/10"
              draggable={false}
              loading="eager"
            />
          ) : (
            <div className="w-full h-32 rounded-md border border-white/10 bg-black/60 flex items-center justify-center text-sm text-gray-400">
              NO THUMBNAIL
            </div>
          )}
          <div className="text-sm text-cyan-100 font-semibold mt-2 line-clamp-2">{project.title}</div>
        </button>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div className="absolute top-16 left-0 right-0 bottom-24 pointer-events-none z-[1]">
        <div className="absolute inset-0 px-3 pb-6 overflow-y-auto pointer-events-auto">
          <div className="w-14 h-1.5 rounded-full bg-white/30 mx-auto mb-3 mt-1" />
          <div className="space-y-3">
            <IOSWidgetCard
              title="Profile"
              expanded={expanded.profile}
              onToggle={() => setExpanded(prev => ({ ...prev, profile: !prev.profile }))}
              emphasized={focusedWidget === 'profile'}
            >
              {profileContent}
            </IOSWidgetCard>

            <IOSWidgetCard
              title="Skills"
              expanded={expanded.skills}
              onToggle={() => setExpanded(prev => ({ ...prev, skills: !prev.skills }))}
              emphasized={focusedWidget === 'skills'}
            >
              {skillsContent}
            </IOSWidgetCard>

            <IOSWidgetCard
              title="Experience"
              expanded={expanded.experience}
              onToggle={() => setExpanded(prev => ({ ...prev, experience: !prev.experience }))}
              emphasized={focusedWidget === 'experience'}
            >
              {experienceContent}
            </IOSWidgetCard>

            <IOSWidgetCard
              title="Projects"
              expanded={expanded.projects}
              onToggle={() => setExpanded(prev => ({ ...prev, projects: !prev.projects }))}
              emphasized={focusedWidget === 'projects'}
            >
              {projectsContent}
            </IOSWidgetCard>
          </div>
        </div>

        {isProfileZoomed && (
          <div
            className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setIsProfileZoomed(false)}
          >
            <button
              type="button"
              className="absolute top-6 right-6 w-9 h-9 rounded-full border border-white/20 bg-black/60 text-cyan-200 hover:text-white hover:border-cyan-300 transition-colors flex items-center justify-center"
              onClick={() => setIsProfileZoomed(false)}
            >
              <X size={16} />
            </button>
            <img
              src={profileImage}
              alt="Profile enlarged"
              className="max-w-[min(90vw,720px)] max-h-[86vh] object-contain rounded-xl border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.22)]"
              draggable={false}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-16 left-0 right-0 bottom-24 pointer-events-none z-[1]">
      <div ref={profileWidgetRef} className="absolute" style={{ left: PROFILE_X, top: PROFILE_Y }}>
      <DesktopWidget
        title="Profile"
        x={0}
        y={0}
        width={widgetWidth}
        expanded={expanded.profile}
        onToggle={() => setExpanded(prev => ({ ...prev, profile: !prev.profile }))}
        emphasized={focusedWidget === 'profile'}
      >
        {profileContent}
      </DesktopWidget>
      </div>

      <div ref={experienceWidgetRef} className="absolute" style={{ left: RIGHT_X, top: experienceY }}>
      <DesktopWidget
        title="Experience"
        x={0}
        y={0}
        width={widgetWidth}
        expanded={expanded.experience}
        onToggle={() => setExpanded(prev => ({ ...prev, experience: !prev.experience }))}
        emphasized={focusedWidget === 'experience'}
      >
        {experienceContent}
      </DesktopWidget>
      </div>

      <div ref={skillsWidgetRef} className="absolute" style={{ left: PROFILE_X, top: skillsY }}>
      <DesktopWidget
        title="Skills"
        x={0}
        y={0}
        width={widgetWidth}
        contentMaxHeight={SECONDARY_WIDGET_CONTENT_HEIGHT}
        expanded={expanded.skills}
        onToggle={() => setExpanded(prev => ({ ...prev, skills: !prev.skills }))}
        emphasized={focusedWidget === 'skills'}
      >
        {skillsContent}
      </DesktopWidget>
      </div>

      <DesktopWidget
        title="Projects"
        x={RIGHT_X}
        y={projectsY}
        width={widgetWidth}
        contentMaxHeight={`calc(${SECONDARY_WIDGET_CONTENT_HEIGHT} - ${PROJECTS_BOTTOM_TRIM}px)`}
        expanded={expanded.projects}
        onToggle={() => setExpanded(prev => ({ ...prev, projects: !prev.projects }))}
        emphasized={focusedWidget === 'projects'}
      >
        {projectsContent}
      </DesktopWidget>

      {isProfileZoomed && (
        <div
          className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          onClick={() => setIsProfileZoomed(false)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 w-9 h-9 rounded-full border border-white/20 bg-black/60 text-cyan-200 hover:text-white hover:border-cyan-300 transition-colors flex items-center justify-center"
            onClick={() => setIsProfileZoomed(false)}
          >
            <X size={16} />
          </button>
          <img
            src={profileImage}
            alt="Profile enlarged"
            className="max-w-[min(90vw,720px)] max-h-[86vh] object-contain rounded-xl border border-cyan-500/40 shadow-[0_0_35px_rgba(6,182,212,0.22)]"
            draggable={false}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
