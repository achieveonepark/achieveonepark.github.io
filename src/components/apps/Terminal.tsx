import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { OSContext } from '../../context';
import { getFileInfo, withBasePath } from '../../constants';
import type { FileObject } from '../../types';

const FILES_JSON_PATH = withBasePath('parkachieveone/files.json');
const ROOT = 'parkachieveone';
const WIDGET_FOCUS_EVENT = 'desktop-widget-focus';

type ManifestEntry = { path: string };

const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

const splitPath = (value: string) => normalizePath(value).split('/').filter(Boolean);

const joinPath = (parts: string[]) => parts.filter(Boolean).join('/');

const resolveDirPath = (currentDir: string, target: string) => {
  if (!target || target === '.') return currentDir;

  const baseParts = splitPath(target.startsWith('/') ? '' : currentDir);
  const targetParts = splitPath(target.startsWith('/') ? target.slice(1) : target);

  const stack = [...baseParts];
  for (const part of targetParts) {
    if (part === '.') continue;
    if (part === '..') {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return joinPath(stack);
};

const getParentDir = (filePath: string) => {
  const parts = splitPath(filePath);
  parts.pop();
  return joinPath(parts);
};

const getBaseName = (path: string) => {
  const parts = splitPath(path);
  return parts[parts.length - 1] || '';
};

const formatPromptPath = (currentDir: string) => `${ROOT}${currentDir ? `/${currentDir}` : ''}`;

export const Terminal: React.FC = () => {
  const { openFile } = useContext(OSContext);
  const [history, setHistory] = useState<string[]>([
    'Welcome to AchieveOne OS Terminal',
    'Commands: /profile, /experience, /skills, ls, cd {path}, ..',
    'Tip: type a markdown filename in the current folder to open it.',
    'Mock mode enabled for git/codex/gemini/claude/opencode/npm/brew/pod.',
  ]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [draftInput, setDraftInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentDir, setCurrentDir] = useState('');
  const [manifestFiles, setManifestFiles] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadManifest = async () => {
      try {
        const response = await fetch(FILES_JSON_PATH);
        if (!response.ok) return;

        const manifest = await response.json();
        const raw: unknown[] = Array.isArray(manifest?.files) ? manifest.files : [];
        const paths = raw
          .map((entry: unknown) => (typeof entry === 'string' ? entry : (entry as ManifestEntry)?.path))
          .filter((filePath: string | undefined): filePath is string => typeof filePath === 'string')
          .map((filePath: string) => normalizePath(filePath));

        setManifestFiles(paths);
      } catch (error) {
        console.error('Failed to load files.json in terminal:', error);
      }
    };

    loadManifest();
  }, []);

  const directories = useMemo(() => {
    const set = new Set<string>(['']);
    for (const filePath of manifestFiles) {
      const parts = splitPath(filePath);
      let acc = '';
      for (let i = 0; i < parts.length - 1; i += 1) {
        acc = joinPath([acc, parts[i]]);
        set.add(acc);
      }
    }
    return set;
  }, [manifestFiles]);

  const listDir = (dirPath: string) => {
    const directDirs = new Set<string>();
    const directFiles = new Set<string>();

    for (const filePath of manifestFiles) {
      const parent = getParentDir(filePath);
      if (parent === dirPath) {
        directFiles.add(getBaseName(filePath));
        continue;
      }

      if (!dirPath) {
        const parts = splitPath(filePath);
        if (parts.length > 1) directDirs.add(parts[0]);
      } else if (parent.startsWith(`${dirPath}/`)) {
        const rest = parent.slice(dirPath.length + 1);
        const first = rest.split('/')[0];
        if (first) directDirs.add(first);
      }
    }

    return {
      dirs: Array.from(directDirs).sort((a, b) => a.localeCompare(b, 'en')),
      files: Array.from(directFiles).sort((a, b) => a.localeCompare(b, 'en')),
    };
  };

  const slashCommands = [
    { cmd: '/profile', desc: 'Focus profile widget' },
    { cmd: '/experience', desc: 'Focus experience widget' },
    { cmd: '/skills', desc: 'Focus skills widget' },
  ];

  const filteredCommands = slashCommands.filter(c => c.cmd.startsWith(input));

  const appendHistory = (lines: string[]) => {
    setHistory(prev => [...prev, ...lines]);
  };

  const emitWidgetFocus = (section: 'profile' | 'experience' | 'skills') => {
    window.dispatchEvent(new CustomEvent(WIDGET_FOCUS_EVENT, { detail: { section } }));
  };

  const openMarkdownFile = (relativePath: string) => {
    const fileName = getBaseName(relativePath);
    const info = getFileInfo(fileName);

    const file: FileObject = {
      name: fileName,
      type: info.type,
      icon: info.icon,
      color: info.color,
      content: withBasePath(`parkachieveone/${relativePath}`),
    };
    openFile(file);
  };

  const executeCommand = (cmdString: string) => {
    const trimmed = cmdString.trim();
    if (!trimmed) return;

    setCommandHistory(prev => [...prev, trimmed]);

    const nextHistory = [`${formatPromptPath(currentDir)} $ ${trimmed}`];

    const parts = trimmed.split(' ').filter(Boolean);
    const primary = parts[0]?.toLowerCase() || '';

    const runMockCommand = (): string[] | null => {
      const args = parts.slice(1);

      if (primary === 'git') {
        const sub = (args[0] || '').toLowerCase();
        if (!sub) return ['usage: git <command> [<args>]', 'hint: try git status'];
        if (sub === 'status') {
          return [
            'On branch mock/main',
            'Your branch is up to date with "origin/mock/main".',
            '',
            'nothing to commit, working tree clean',
          ];
        }
        if (sub === 'log') {
          return [
            'commit 3f6a4c1 (HEAD -> mock/main)',
            'Author: OpenCode <mock@terminal.local>',
            'Date:   Mon Feb 09 2026',
            '',
            '    chore: keep mock terminal responsive',
          ];
        }
        if (sub === 'diff') return ['(mock) no visible diff'];
        if (sub === 'branch') return ['* mock/main', '  feature/widget-focus', '  release/v1.0.0'];
        if (sub === 'checkout' || sub === 'switch') {
          const branch = args[1] || 'mock/main';
          return [`Switched to branch '${branch}' (mock)`];
        }
        if (sub === 'pull') return ['Already up to date. (mock)'];
        if (sub === 'push') return ['Everything up-to-date (mock)'];
        if (sub === 'add') return ['(mock) staged selected files'];
        if (sub === 'commit') return ['[mock/main 9a1b2c3] mock commit created', ' 1 file changed, 0 insertions(+), 0 deletions(-)'];
        return [`git: '${sub}' is not a mock-supported command yet`];
      }

      if (['codex', 'gemini', 'claude', 'opencode'].includes(primary)) {
        const tail = args.join(' ');
        return [
          `[${primary}] mock session started`,
          tail ? `[${primary}] prompt accepted: ${tail}` : `[${primary}] ready for input`,
          `[${primary}] completed in 0.42s (simulated)`,
        ];
      }

      if (primary === 'npm') {
        const sub = (args[0] || '').toLowerCase();
        if (!sub) return ['npm <command>', 'usage: npm install | npm run <script>'];
        if (sub === 'install' || sub === 'i') return ['added 147 packages in 1.2s (mock)', 'found 0 vulnerabilities'];
        if (sub === 'run') {
          const script = args[1] || 'dev';
          return [`> npm run ${script}`, `> ${script} task started (mock)`, `[${script}] completed successfully (mock)`];
        }
        if (sub === '-v' || sub === '--version') return ['10.9.0-mock'];
        return [`npm: unsupported mock command '${sub}'`];
      }

      if (primary === 'brew') {
        const sub = (args[0] || '').toLowerCase();
        if (!sub) return ['Homebrew 4.x (mock)', 'usage: brew install <formula>'];
        if (sub === 'install') return [`Installing ${args[1] || 'formula'}... done (mock)`];
        if (sub === 'update') return ['Already up-to-date. (mock)'];
        if (sub === 'list') return ['git', 'node', 'python', 'cocoapods (mock list)'];
        return [`brew: '${sub}' executed (mock)`];
      }

      if (primary === 'pod' || primary === 'cocoapods') {
        const sub = (args[0] || '').toLowerCase();
        if (!sub) return ['CocoaPods 1.15.x (mock)', 'usage: pod install | pod update'];
        if (sub === 'install') return ['Analyzing dependencies (mock)', 'Downloading dependencies (mock)', 'Pod installation complete! (mock)'];
        if (sub === 'update') return ['Updating local specs repositories (mock)', 'Pod update complete! (mock)'];
        return [`pod: '${sub}' completed (mock)`];
      }

      return null;
    };

    if (trimmed === '/profile') {
      emitWidgetFocus('profile');
      nextHistory.push('Focused: Profile widget');
    } else if (trimmed === '/experience') {
      emitWidgetFocus('experience');
      nextHistory.push('Focused: Experience widget');
    } else if (trimmed === '/skills') {
      emitWidgetFocus('skills');
      nextHistory.push('Focused: Skills widget');
    } else if (trimmed === 'ls' || trimmed === '/ls') {
      const result = listDir(currentDir);
      if (result.dirs.length === 0 && result.files.length === 0) {
        nextHistory.push('[empty]');
      } else {
        nextHistory.push(...result.dirs.map(dir => `${dir}/`), ...result.files);
      }
    } else if (trimmed === '..') {
      const resolved = resolveDirPath(currentDir, '..');
      setCurrentDir(resolved);
      nextHistory.push(`/${resolved}`);
    } else if (trimmed.startsWith('cd')) {
      const parts = trimmed.split(' ').filter(Boolean);
      const target = parts[1];

      if (!target) {
        setCurrentDir('');
        nextHistory.push('/');
      } else {
        const resolved = resolveDirPath(currentDir, target);
        if (directories.has(resolved)) {
          setCurrentDir(resolved);
          nextHistory.push(`/${resolved}`);
        } else {
          nextHistory.push(`cd: no such directory: ${target}`);
        }
      }
    } else {
      const mockOutput = runMockCommand();
      if (mockOutput) {
        nextHistory.push(...mockOutput);
        appendHistory(nextHistory);
        setInput('');
        setShowHelp(false);
        setSelectedIndex(0);
        return;
      }

      const maybeFilePath = normalizePath(joinPath([currentDir, trimmed]));
      const isMarkdown = trimmed.toLowerCase().endsWith('.md');
      const exists = manifestFiles.includes(maybeFilePath);

      if (isMarkdown && exists) {
        openMarkdownFile(maybeFilePath);
        nextHistory.push(`Opened: ${trimmed}`);
      } else {
        nextHistory.push(`Unknown command: ${trimmed}`);
      }
    }

    appendHistory(nextHistory);
    setInput('');
    setHistoryCursor(-1);
    setDraftInput('');
    setShowHelp(false);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showHelp && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setInput(`${filteredCommands[selectedIndex].cmd} `);
        setShowHelp(false);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        executeCommand(filteredCommands[selectedIndex].cmd);
        return;
      }
    }

    if (e.key === 'ArrowUp' && commandHistory.length > 0) {
      e.preventDefault();

      if (historyCursor === -1) {
        setDraftInput(input);
        const nextCursor = commandHistory.length - 1;
        setHistoryCursor(nextCursor);
        setInput(commandHistory[nextCursor]);
        return;
      }

      const nextCursor = Math.max(0, historyCursor - 1);
      setHistoryCursor(nextCursor);
      setInput(commandHistory[nextCursor]);
      return;
    }

    if (e.key === 'ArrowDown' && commandHistory.length > 0 && historyCursor !== -1) {
      e.preventDefault();

      if (historyCursor >= commandHistory.length - 1) {
        setHistoryCursor(-1);
        setInput(draftInput);
        return;
      }

      const nextCursor = historyCursor + 1;
      setHistoryCursor(nextCursor);
      setInput(commandHistory[nextCursor]);
      return;
    }

    if (e.key === 'Enter') {
      executeCommand(input);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setShowHelp(value.startsWith('/'));
    setSelectedIndex(0);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div
      className="w-full h-full bg-[#1e1e1e] text-[#33ff00] font-mono p-4 text-sm overflow-hidden flex flex-col"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="text-[11px] text-cyan-300/80 mb-2">PATH: /{ROOT}{currentDir ? `/${currentDir}` : ''}</div>

      <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
        {history.map((line, index) => (
          <div key={`${line}-${index}`} className="whitespace-pre-wrap break-all leading-snug">{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 relative">
        <div className="flex items-center">
          <span className="mr-2 text-blue-400">$</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-[#33ff00] placeholder-gray-600"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck={false}
          />
        </div>

        {showHelp && (
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-gray-800 border border-gray-700 rounded-md shadow-lg overflow-hidden z-10">
            <div className="px-3 py-1 bg-gray-700 text-xs text-gray-300 font-bold border-b border-gray-600">
              Keywords
            </div>
            {filteredCommands.length > 0 ? (
              filteredCommands.map((command, index) => (
                <div
                  key={command.cmd}
                  className={`px-3 py-2 cursor-pointer flex justify-between items-center ${index === selectedIndex ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-200'}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setInput(`${command.cmd} `);
                    setShowHelp(false);
                    inputRef.current?.focus();
                  }}
                >
                  <span className="font-bold">{command.cmd}</span>
                  <span className="text-xs opacity-80">{command.desc}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 italic text-xs">No matching keywords</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
