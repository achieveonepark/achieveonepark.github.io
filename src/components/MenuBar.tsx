import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Battery, Search, Activity } from 'lucide-react';
import { format } from 'date-fns';
import githubLogo from '../../images/github-logo.png';
import docsLogo from '../../images/docs-logo.png';
import instagramLogo from '../../images/Instagram-logo.png';
import emailLogo from '../../images/email-logo.png';

interface MenuStructure {
  [key: string]: (string | { type: 'separator' })[];
}

export const MenuBar: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [linkUrls, setLinkUrls] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const defaultLinks: Record<string, string> = {
    github: 'https://github.com/achieveonepark',
    'coding library': 'http://achieveonepark.github.io/cording-library',
    instagram: 'https://instagram.com/parkachieveone',
    email: 'mailto:park_achieveone@naver.com',
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const parseLinksMarkdown = (markdown: string): Record<string, string> => {
      const result: Record<string, string> = {};
      const lines = markdown.split('\n');

      for (const line of lines) {
        const match = line.match(/^\s*-\s*([^:]+):\s*(.+)\s*$/);
        if (!match) continue;

        const key = match[1].trim().toLowerCase();
        const value = match[2].trim();

        if (value.includes('@') && !value.startsWith('http') && !value.startsWith('mailto:')) {
          result[key] = `mailto:${value}`;
        } else {
          result[key] = value;
        }
      }

      return result;
    };

    const loadLinks = async () => {
      try {
        const linksPath = `${import.meta.env.BASE_URL}parkachieveone/portfolio/links.md`;
        const response = await fetch(linksPath);
        if (!response.ok) return;

        const markdown = await response.text();
        setLinkUrls(parseLinksMarkdown(markdown));
      } catch (error) {
        console.error('Failed to load links.md:', error);
      }
    };

    loadLinks();
  }, []);

  const menuItems: MenuStructure = {
    sys: ["System Info", "Network Status", { type: 'separator' }, "Sleep Mode", "Reboot System", "Terminate Session"],
    file: ["New Instance", "New Directory", { type: 'separator' }, "Terminate"],
    view: ["HUD Mode", "Data Grid", { type: 'separator' }, "Show Metrics"],
  };

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const renderDropdown = (items: (string | { type: 'separator' })[]) => (
    <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-black/80 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-sm py-1 z-[100] text-cyan-100">
      {items.map((item, idx) => (
        typeof item === 'string' ? (
          <div key={idx} className="px-4 py-2 hover:bg-cyan-500/20 hover:text-cyan-300 cursor-pointer text-xs uppercase tracking-wider transition-colors">
            {item}
          </div>
        ) : (
          <div key={idx} className="h-[1px] bg-cyan-500/20 my-1 mx-2" />
        )
      ))}
    </div>
  );

  const quickLinks = [
    {
      label: 'Github',
      href: linkUrls.github || defaultLinks.github,
      logo: githubLogo,
      hoverClass: 'hover:text-white',
    },
    {
      label: 'Coding Library',
      href: linkUrls['coding library'] || defaultLinks['coding library'],
      logo: docsLogo,
      hoverClass: 'hover:text-green-400',
    },
    {
      label: 'Instagram',
      href: linkUrls.instagram || defaultLinks.instagram,
      logo: instagramLogo,
      hoverClass: 'hover:text-purple-400',
    },
    {
      label: 'Email',
      href: linkUrls.email || defaultLinks.email,
      logo: emailLogo,
      hoverClass: 'hover:text-blue-400',
    },
  ];

  return (
    <div className="fixed top-4 left-4 right-4 h-10 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-between px-4 text-cyan-50 text-sm select-none z-[1000] shadow-lg relative">
      <div className="flex items-center space-x-2 h-full" ref={menuRef}>
        <div className="relative h-full flex items-center mr-4">
            <button 
                onClick={() => handleMenuClick('sys')} 
                className={`px-2 h-full flex items-center hover:text-cyan-400 transition-colors ${activeMenu === 'sys' ? 'text-cyan-400' : ''}`}
            >
                <Activity size={20} className="fill-current" />
            </button>
            {activeMenu === 'sys' && renderDropdown(menuItems.sys)}
        </div>

        {Object.entries(menuItems).filter(([key]) => key !== 'sys').map(([key, items]) => (
          <div key={key} className="relative h-full flex items-center">
            <button
              onClick={() => handleMenuClick(key)}
              className={`px-3 h-full flex items-center font-semibold uppercase text-xs tracking-widest hover:text-cyan-400 hover:bg-white/5 rounded ${activeMenu === key ? 'text-cyan-400 bg-white/5' : ''}`}
            >
              {key}
            </button>
            {activeMenu === key && renderDropdown(items)}
          </div>
        ))}
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 h-full items-center gap-3 hidden md:flex">
        {quickLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith('mailto:') || link.href === '#' ? undefined : '_blank'}
            rel={link.href.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
            className={`h-7 px-2 rounded-md border border-white/10 bg-black/30 text-cyan-100/80 flex items-center gap-1.5 transition-colors ${link.hoverClass}`}
            title={link.label}
          >
            <img src={link.logo} alt={link.label} className="w-4 h-4 object-contain" draggable={false} />
            <span className="text-[10px] uppercase tracking-wider font-semibold">{link.label}</span>
          </a>
        ))}
      </div>

      <div className="flex items-center space-x-6 text-cyan-200/80">
        <div className="flex items-center space-x-3">
             {/* Fake connection stats */}
            <div className="text-[10px] font-mono text-cyan-500/70 hidden sm:block">
                PING: 12ms | UP: 1.2GB
            </div>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <Battery size={16} className="opacity-80" />
            <Wifi size={16} className="opacity-80" />
            <Search size={16} className="opacity-80 hover:text-white cursor-pointer" />
        </div>
        <span className="font-mono text-xs tracking-widest text-cyan-400">
          {format(time, 'HH:mm:ss')}
        </span>
      </div>
    </div>
  );
};
