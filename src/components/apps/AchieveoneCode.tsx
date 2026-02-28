import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode2,
  FileText,
  Files,
  Folder,
  FolderPlus,
  GitBranch,
  Info,
  Loader2,
  Maximize2,
  Menu,
  Minus,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  Square,
  Terminal,
  User,
  Wand2,
  Wrench,
  X,
} from 'lucide-react';
import { OSContext } from '../../context';

type BootPhase = 'booting' | 'fading' | 'ready';
type PanelTab = 'terminal' | 'problems' | 'output';
type ActivityTab = 'explorer' | 'search' | 'sourceControl' | 'run' | 'settings';
type MenuId = 'file' | 'edit' | 'selection' | 'view' | 'go' | 'run' | 'terminal' | 'help';
type ProjectTemplate = 'react-ts' | 'vanilla-ts' | 'node-ts' | 'unity-csharp';
type PackageManager = 'npm' | 'pnpm' | 'yarn';

type IdeFile = {
  id: string;
  name: string;
  path: string;
  kind: 'code' | 'json' | 'text' | 'markdown' | 'csharp';
  content: string;
  cursorLine: number;
  cursorCol: number;
};

type ProjectWorkspace = {
  id: string;
  name: string;
  template: ProjectTemplate;
  packageManager: PackageManager;
  includeGit: boolean;
  createdAt: number;
  updatedAt: number;
  path: string;
  branch: string;
  files: IdeFile[];
};

type ProjectMeta = Omit<ProjectWorkspace, 'files'>;

type NewProjectDraft = {
  name: string;
  template: ProjectTemplate;
  packageManager: PackageManager;
  includeGit: boolean;
};

type PersistedWorkspaceState = {
  recentProjects: ProjectWorkspace[];
  lastProjectId?: string;
};

type MenuEntry =
  | { type: 'item'; id: string; label: string; shortcut?: string; danger?: boolean; disabled?: boolean }
  | { type: 'separator'; id: string };

type SearchHit = {
  fileId: string;
  path: string;
  line: number;
  preview: string;
};

type ProblemEntry = {
  severity: 'warning' | 'info';
  label: string;
  file?: string;
  line?: number;
  column?: number;
};

const STORAGE_KEY = 'achieveone-code-workspace-v1';
const editorFont = '"JetBrains Mono", "D2Coding", ui-monospace, SFMono-Regular, Menlo, monospace';

const menuOrder: Array<{ id: MenuId; label: string }> = [
  { id: 'file', label: 'File' },
  { id: 'edit', label: 'Edit' },
  { id: 'selection', label: 'Selection' },
  { id: 'view', label: 'View' },
  { id: 'go', label: 'Go' },
  { id: 'run', label: 'Run' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'help', label: 'Help' },
];

const templateLabels: Record<ProjectTemplate, string> = {
  'react-ts': 'React + TypeScript',
  'vanilla-ts': 'Vanilla TypeScript',
  'node-ts': 'Node + TypeScript',
  'unity-csharp': 'Unity (C#)',
};

const packageManagerLabels: Record<PackageManager, string> = {
  npm: 'npm',
  pnpm: 'pnpm',
  yarn: 'yarn',
};

const defaultDraft: NewProjectDraft = {
  name: 'achieveone-unity-prototype',
  template: 'unity-csharp',
  packageManager: 'npm',
  includeGit: true,
};

const DEFAULT_TERMINAL_LINES = [
  '[Achieveone Code] Ready',
  'Tip: Unity (C#) 템플릿으로 새 프로젝트를 생성해보세요.',
];

const DEFAULT_OUTPUT_LINES = [
  'Workbench initialized.',
  'Theme: Dark+ (VS Code style)',
  'Startup mode: New Project workflow (Unity/C# optimized)',
];

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatTime = (value: number) =>
  new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const formatDate = (value: number) =>
  new Date(value).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'new-project';

const inferKind = (path: string): IdeFile['kind'] => {
  const lower = path.toLowerCase();
  if (lower.endsWith('.cs')) return 'csharp';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md')) return 'markdown';
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.css') ||
    lower.endsWith('.html') ||
    lower.endsWith('.gitignore') ||
    lower.endsWith('.sln') ||
    lower.endsWith('.csproj') ||
    lower.endsWith('.meta') ||
    lower.endsWith('.unity') ||
    lower.endsWith('.asset') ||
    lower.endsWith('.yaml')
  ) return 'text';
  return 'code';
};

const createFile = (path: string, content: string, cursorLine = 1, cursorCol = 1): IdeFile => ({
  id: createId('file'),
  name: path.split('/').pop() || path,
  path,
  kind: inferKind(path),
  content,
  cursorLine,
  cursorCol,
});

const cloneFiles = (files: IdeFile[]): IdeFile[] => files.map(file => ({ ...file }));

const snapshotFromFiles = (files: IdeFile[]) =>
  files.reduce<Record<string, string>>((acc, file) => {
    acc[file.path] = file.content;
    return acc;
  }, {});

const createScaffold = (draft: NewProjectDraft): ProjectWorkspace => {
  const projectName = draft.name.trim() || defaultDraft.name;
  const slug = slugify(projectName);
  const basePath = `/workspace/${slug}`;
  const branch = draft.includeGit ? 'main' : 'no-git';
  const now = Date.now();

  let files: IdeFile[] = [];

  if (draft.template === 'react-ts') {
    files = [
      createFile(
        'package.json',
        `{
  "name": "${slug}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.1"
  }
}`,
        9,
        18,
      ),
      createFile(
        'index.html',
        `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
        8,
        5,
      ),
      createFile(
        'src/main.tsx',
        `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`,
        6,
        1,
      ),
      createFile(
        'src/App.tsx',
        `export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Achieveone Code</p>
        <h1>${projectName}</h1>
        <p className="description">
          새 프로젝트가 생성되었습니다. 이제 UI/로직을 추가해보세요.
        </p>
        <button type="button">Start Building</button>
      </section>
    </main>
  );
}`,
        4,
        5,
      ),
      createFile(
        'src/styles.css',
        `:root {
  color-scheme: dark;
  font-family: Inter, system-ui, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.35), transparent 55%),
    radial-gradient(circle at 80% 10%, rgba(16, 185, 129, 0.2), transparent 50%),
    #020617;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.hero {
  width: min(680px, 100%);
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.78);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.35);
}

.eyebrow {
  margin: 0;
  color: #93c5fd;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 10px 0 8px;
  font-size: clamp(28px, 4vw, 44px);
}

.description {
  margin: 0 0 18px;
  color: #cbd5e1;
  line-height: 1.6;
}

button {
  border: 0;
  border-radius: 10px;
  background: #2563eb;
  color: white;
  padding: 10px 14px;
  font-weight: 600;
}`,
        50,
        1,
      ),
      createFile(
        'vite.config.ts',
        `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
        4,
        3,
      ),
      createFile(
        'README.md',
        `# ${projectName}

생성 템플릿: React + TypeScript

## Scripts
- ${draft.packageManager} run dev
- ${draft.packageManager} run build
`,
        4,
        1,
      ),
    ];
  }

  if (draft.template === 'vanilla-ts') {
    files = [
      createFile(
        'package.json',
        `{
  "name": "${slug}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "vite": "^5.2.0"
  }
}`,
      ),
      createFile(
        'index.html',
        `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`,
      ),
      createFile(
        'src/main.ts',
        `import './style.css';

const root = document.getElementById('app');

if (root) {
  root.innerHTML = ` + "`" + `
    <main class="card">
      <p class="eyebrow">Achieveone Code</p>
      <h1>${projectName}</h1>
      <p>Vanilla TypeScript 템플릿이 생성되었습니다.</p>
    </main>
  ` + "`" + `;
}`,
        5,
        3,
      ),
      createFile(
        'src/style.css',
        `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #0f172a;
  color: #e2e8f0;
  font-family: system-ui, sans-serif;
}

.card {
  width: min(560px, calc(100% - 32px));
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.8);
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #93c5fd;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}`,
      ),
      createFile('tsconfig.json', `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noEmit": true
  },
  "include": ["src"]
}`),
      createFile('README.md', `# ${projectName}

생성 템플릿: Vanilla TypeScript
`),
    ];
  }

  if (draft.template === 'node-ts') {
    files = [
      createFile(
        'package.json',
        `{
  "name": "${slug}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc -p tsconfig.json"
  },
  "devDependencies": {
    "typescript": "^5.2.2",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0"
  }
}`,
      ),
      createFile(
        'src/index.ts',
        `const port = 3000;

console.log('Achieveone Code Node starter');
console.log('Project: ${projectName}');
console.log('Listening on port', port);
`,
        3,
        1,
      ),
      createFile('tsconfig.json', `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}`),
      createFile('.gitignore', `node_modules
.env
dist
`),
      createFile('README.md', `# ${projectName}

생성 템플릿: Node + TypeScript
`),
    ];
  }

  if (draft.template === 'unity-csharp') {
    files = [
      createFile(
        'Assets/Scripts/GameBootstrap.cs',
        `using UnityEngine;

public class GameBootstrap : MonoBehaviour
{
    [SerializeField] private string projectName = "${projectName}";

    private void Awake()
    {
        DontDestroyOnLoad(gameObject);
        Debug.Log($"[Achieveone Code] Bootstrapping {projectName}");
    }

    private void Start()
    {
        Debug.Log("Unity + C# starter scene is ready.");
    }
}
`,
        5,
        5,
      ),
      createFile(
        'Assets/Scripts/PlayerController.cs',
        `using UnityEngine;

public class PlayerController : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;

    private void Update()
    {
        var input = new Vector3(
            Input.GetAxisRaw("Horizontal"),
            0f,
            Input.GetAxisRaw("Vertical")
        );

        transform.position += input.normalized * (moveSpeed * Time.deltaTime);
    }
}
`,
        7,
        9,
      ),
      createFile(
        'Assets/Scenes/Main.unity',
        `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!29 &1
OcclusionCullingSettings:
  m_ObjectHideFlags: 0
--- !u!104 &2
RenderSettings:
  m_ObjectHideFlags: 0
--- !u!1 &1000
GameObject:
  m_ObjectHideFlags: 0
  m_Name: Main Camera
--- !u!20 &1001
Camera:
  m_ObjectHideFlags: 0
  m_BackGroundColor: {r: 0.12, g: 0.16, b: 0.23, a: 0}
`,
        10,
        3,
      ),
      createFile(
        'Assets/Scenes/Main.unity.meta',
        `fileFormatVersion: 2
guid: ${slug.replace(/-/g, '').slice(0, 16).padEnd(16, '0')}
DefaultImporter:
  externalObjects: {}
  userData:
  assetBundleName:
  assetBundleVariant:
`,
      ),
      createFile(
        'Packages/manifest.json',
        `{
  "dependencies": {
    "com.unity.collab-proxy": "2.5.2",
    "com.unity.ide.rider": "3.0.31",
    "com.unity.ide.visualstudio": "2.0.22",
    "com.unity.inputsystem": "1.7.0",
    "com.unity.test-framework": "1.1.33",
    "com.unity.timeline": "1.7.6",
    "com.unity.ugui": "1.0.0",
    "com.unity.modules.physics": "1.0.0",
    "com.unity.modules.ai": "1.0.0"
  }
}`,
        4,
        5,
      ),
      createFile(
        'ProjectSettings/ProjectVersion.txt',
        `m_EditorVersion: 2022.3.45f1
m_EditorVersionWithRevision: 2022.3.45f1 (achieveone-build)
`,
      ),
      createFile(
        'ProjectSettings/TagManager.asset',
        `%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!78 &1
TagManager:
  tags:
  - Player
  - Enemy
  layers:
  - Default
  - TransparentFX
`,
      ),
      createFile(
        'Assembly-CSharp.csproj',
        `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.1</TargetFramework>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
  </PropertyGroup>
  <ItemGroup>
    <Compile Include="Assets\\\\Scripts\\\\**\\\\*.cs" />
  </ItemGroup>
</Project>
`,
      ),
      createFile(
        `${projectName}.sln`,
        `Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
Project("{FAE04EC0-301F-11D3-BF4B-00C04F79EFBC}") = "Assembly-CSharp", "Assembly-CSharp.csproj", "{ACHIEVEONE-UNITY-CSPROJ}"
EndProject
Global
  GlobalSection(SolutionConfigurationPlatforms) = preSolution
    Debug|Any CPU = Debug|Any CPU
    Release|Any CPU = Release|Any CPU
  EndGlobalSection
EndGlobal
`,
      ),
      createFile(
        'README.md',
        `# ${projectName}

생성 템플릿: Unity (C#)

## 추천 워크플로우
- Unity Hub로 프로젝트 열기
- Scripts는 Achieveone Code 또는 Rider/VS에서 편집
- Play Mode/Test/Build는 Unity Editor에서 실행

## 포함 샘플
- Assets/Scripts/GameBootstrap.cs
- Assets/Scripts/PlayerController.cs
- Packages/manifest.json
- ProjectSettings/ProjectVersion.txt
`,
        7,
        1,
      ),
    ];
  }

  if (draft.includeGit && !files.some(file => file.path === '.gitignore')) {
    files = [...files, createFile('.gitignore', `node_modules
dist
.env
.DS_Store
Library/
Temp/
Obj/
Build/
Logs/
UserSettings/
*.csproj
*.sln
`)];
  }

  return {
    id: createId('project'),
    name: projectName,
    template: draft.template,
    packageManager: draft.packageManager,
    includeGit: draft.includeGit,
    createdAt: now,
    updatedAt: now,
    path: basePath,
    branch,
    files,
  };
};

const getBootHeadline = (progress: number) => {
  if (progress < 30) return 'Loading renderer process';
  if (progress < 60) return 'Starting extension host';
  if (progress < 85) return 'Preparing project workflow';
  return 'Mounting workbench';
};

const getFileIcon = (kind: IdeFile['kind']) => {
  if (kind === 'csharp') return FileCode2;
  if (kind === 'json') return FileText;
  if (kind === 'markdown') return FileText;
  if (kind === 'text') return FileText;
  return FileCode2;
};

const getFileIconColor = (kind: IdeFile['kind']) => {
  if (kind === 'csharp') return 'text-green-300';
  if (kind === 'json') return 'text-yellow-300';
  if (kind === 'markdown') return 'text-emerald-300';
  if (kind === 'text') return 'text-blue-300';
  return 'text-sky-300';
};

export const AchieveoneCode: React.FC = () => {
  const { windows, minimizeWindow, maximizeWindow, closeWindow } = useContext(OSContext);
  const ideWindow = windows.find(win => win.appId === 'achieveonecode');

  const [bootPhase, setBootPhase] = useState<BootPhase>('booting');
  const [progress, setProgress] = useState(8);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [explorerExpanded, setExplorerExpanded] = useState(true);
  const [activityTab, setActivityTab] = useState<ActivityTab>('explorer');
  const [panelTab, setPanelTab] = useState<PanelTab>('terminal');
  const [panelVisible, setPanelVisible] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editorSearchQuery, setEditorSearchQuery] = useState('');
  const [recentProjects, setRecentProjects] = useState<ProjectWorkspace[]>([]);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [workspaceFiles, setWorkspaceFiles] = useState<IdeFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, string>>({});
  const [terminalLines, setTerminalLines] = useState<string[]>(DEFAULT_TERMINAL_LINES);
  const [outputLines, setOutputLines] = useState<string[]>(DEFAULT_OUTPUT_LINES);
  const [draft, setDraft] = useState<NewProjectDraft>(defaultDraft);
  const [showProjectCreator, setShowProjectCreator] = useState(true);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.max(2, Math.round((100 - prev) / 9));
        return Math.min(next, 94);
      });
    }, 120);

    const fadeTimer = window.setTimeout(() => {
      setProgress(100);
      setBootPhase('fading');
    }, 1850);

    const readyTimer = window.setTimeout(() => {
      setBootPhase('ready');
    }, 2050);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedWorkspaceState;
      if (Array.isArray(parsed.recentProjects)) {
        setRecentProjects(parsed.recentProjects.map(project => ({ ...project, files: cloneFiles(project.files || []) })));
      }
    } catch {
      // Ignore invalid persistence data.
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1700);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setShowAbout(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeFile = useMemo(
    () => workspaceFiles.find(file => file.id === activeFileId) || workspaceFiles[0] || null,
    [workspaceFiles, activeFileId],
  );

  const openTabs = useMemo(() => {
    if (!activeFile) return workspaceFiles.slice(0, 4);

    const selected = workspaceFiles.filter(file => file.id === activeFile.id);
    const others = workspaceFiles.filter(file => file.id !== activeFile.id).slice(0, 3);
    return [...selected, ...others];
  }, [workspaceFiles, activeFile]);

  const codeLines = useMemo(() => activeFile?.content.split('\n') || [], [activeFile]);

  const searchResults = useMemo<SearchHit[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const hits: SearchHit[] = [];
    for (const file of workspaceFiles) {
      file.content.split('\n').forEach((line, index) => {
        if (line.toLowerCase().includes(q)) {
          hits.push({
            fileId: file.id,
            path: file.path,
            line: index + 1,
            preview: line.trim() || '(blank line)',
          });
        }
      });
    }

    return hits.slice(0, 60);
  }, [searchQuery, workspaceFiles]);

  const filteredExplorerFiles = useMemo(() => {
    const q = editorSearchQuery.trim().toLowerCase();
    if (!q) return workspaceFiles;
    return workspaceFiles.filter(file => file.path.toLowerCase().includes(q) || file.name.toLowerCase().includes(q));
  }, [editorSearchQuery, workspaceFiles]);

  const scmChanges = useMemo(() => {
    return workspaceFiles
      .map(file => {
        const baseline = savedSnapshot[file.path];
        if (baseline === undefined) {
          return { path: file.path, status: 'U' as const, label: 'Untracked' };
        }
        if (baseline !== file.content) {
          return { path: file.path, status: 'M' as const, label: 'Modified' };
        }
        return null;
      })
      .filter((value): value is { path: string; status: 'U' | 'M'; label: string } => value !== null);
  }, [savedSnapshot, workspaceFiles]);

  const problemEntries = useMemo<ProblemEntry[]>(() => {
    if (!projectMeta) {
      return [{ severity: 'info', label: '프로젝트가 열려 있지 않습니다. New Project를 생성하세요.' }];
    }

    const entries: ProblemEntry[] = [
      {
        severity: 'info',
        label: 'Achieveone Code 모드에서 동작 중입니다.',
        file: activeFile?.path,
        line: activeFile?.cursorLine,
        column: activeFile?.cursorCol,
      },
    ];

    if (scmChanges.length > 0) {
      entries.unshift({
        severity: 'warning',
        label: `저장되지 않은 변경사항 ${scmChanges.length}개`,
        file: scmChanges[0]?.path,
        line: 1,
        column: 1,
      });
    }

    return entries;
  }, [projectMeta, activeFile, scmChanges]);

  const pushTerminal = (lineOrLines: string | string[]) => {
    const lines = Array.isArray(lineOrLines) ? lineOrLines : [lineOrLines];
    setTerminalLines(prev => [...prev, ...lines]);
  };

  const pushOutput = (lineOrLines: string | string[]) => {
    const lines = Array.isArray(lineOrLines) ? lineOrLines : [lineOrLines];
    setOutputLines(prev => [...prev, ...lines]);
  };

  const showToastMessage = (message: string) => {
    setToast(message);
  };

  const persistRecentProjects = (projects: ProjectWorkspace[], lastProjectId?: string) => {
    try {
      const payload: PersistedWorkspaceState = {
        recentProjects: projects,
        lastProjectId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore localStorage failures.
    }
  };

  const upsertRecentProject = (project: ProjectWorkspace, markAsLast = true) => {
    setRecentProjects(prev => {
      const deduped = [project, ...prev.filter(item => item.id !== project.id)].slice(0, 6);
      persistRecentProjects(deduped, markAsLast ? project.id : prev[0]?.id);
      return deduped;
    });
  };

  const composeCurrentProject = (): ProjectWorkspace | null => {
    if (!projectMeta) return null;
    return {
      ...projectMeta,
      files: cloneFiles(workspaceFiles),
      updatedAt: Date.now(),
    };
  };

  const openWorkspace = (workspace: ProjectWorkspace, source: 'created' | 'recent') => {
    const clonedFiles = cloneFiles(workspace.files);
    setProjectMeta({
      ...workspace,
      updatedAt: Date.now(),
    });
    setWorkspaceFiles(clonedFiles);
    setActiveFileId(clonedFiles[0]?.id ?? null);
    setSavedSnapshot(snapshotFromFiles(clonedFiles));
    setSidebarOpen(true);
    setActivityTab('explorer');
    setPanelVisible(true);
    setPanelTab('terminal');
    setShowProjectCreator(false);
    setOpenMenu(null);
    setEditorSearchQuery('');
    setSearchQuery('');

    const stamp = formatTime(Date.now());
    pushTerminal([
      `[${stamp}] ${source === 'created' ? 'Project scaffold created' : 'Recent project opened'}: ${workspace.name}`,
      `[${stamp}] Workspace mounted at ${workspace.path}`,
    ]);
    pushOutput(`Project ready: ${workspace.name} (${templateLabels[workspace.template]})`);
    showToastMessage(source === 'created' ? '새 프로젝트가 생성되었습니다.' : '최근 프로젝트를 열었습니다.');
  };

  const createProjectFromDraft = () => {
    const workspace = createScaffold(draft);
    openWorkspace(workspace, 'created');
    upsertRecentProject(workspace, true);
  };

  const openRecentProject = (project: ProjectWorkspace) => {
    openWorkspace(project, 'recent');
    upsertRecentProject({ ...project, files: cloneFiles(project.files) }, true);
  };

  const closeProject = () => {
    setProjectMeta(null);
    setWorkspaceFiles([]);
    setActiveFileId(null);
    setSavedSnapshot({});
    setShowProjectCreator(true);
    setOpenMenu(null);
    setSearchQuery('');
    setEditorSearchQuery('');
    pushOutput('Project closed. New Project screen opened.');
    showToastMessage('프로젝트를 닫았습니다.');
  };

  const setActiveFile = (fileId: string) => {
    setActiveFileId(fileId);
    const file = workspaceFiles.find(item => item.id === fileId);
    if (!file) return;

    setWorkspaceFiles(prev => prev.map(item => (
      item.id === fileId
        ? { ...item, cursorLine: Math.min(item.cursorLine || 1, Math.max(1, item.content.split('\n').length)), cursorCol: Math.max(1, item.cursorCol || 1) }
        : item
    )));
  };

  const touchActiveFile = (mutator: (file: IdeFile) => IdeFile) => {
    if (!activeFile) {
      showToastMessage('열린 파일이 없습니다.');
      return;
    }

    setWorkspaceFiles(prev => prev.map(file => (file.id === activeFile.id ? mutator(file) : file)));
  };

  const addUntitledFile = () => {
    if (!projectMeta) {
      setShowProjectCreator(true);
      showToastMessage('먼저 프로젝트를 생성하세요.');
      return;
    }

    const isUnity = projectMeta.template === 'unity-csharp';
    let index = 1;
    let candidatePath = isUnity ? `Assets/Scripts/NewBehaviour${index}.cs` : `src/new-file-${index}.ts`;
    const existingPaths = new Set(workspaceFiles.map(file => file.path));
    while (existingPaths.has(candidatePath)) {
      index += 1;
      candidatePath = isUnity ? `Assets/Scripts/NewBehaviour${index}.cs` : `src/new-file-${index}.ts`;
    }

    const newFile = createFile(
      candidatePath,
      isUnity
        ? `using UnityEngine;\n\npublic class NewBehaviour${index} : MonoBehaviour\n{\n    private void Start()\n    {\n        Debug.Log(\"NewBehaviour${index} initialized\");\n    }\n}\n`
        : `export function newFile${index}() {\n  return 'Created in Achieveone Code';\n}\n`,
      1,
      1,
    );

    setWorkspaceFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setActivityTab('explorer');
    setSidebarOpen(true);
    pushOutput(`File created: ${candidatePath}`);
    showToastMessage('새 파일이 생성되었습니다.');
  };

  const insertTodoInActiveFile = () => {
    touchActiveFile(file => {
      const nextContent = `${file.content.trimEnd()}\n\n// TODO: Implement next step\n`;
      return {
        ...file,
        content: nextContent,
        cursorLine: nextContent.split('\n').length,
        cursorCol: 1,
      };
    });
    showToastMessage('TODO 주석을 추가했습니다.');
  };

  const formatActiveFile = () => {
    touchActiveFile(file => {
      const normalized = file.content
        .split('\n')
        .map(line => line.replace(/\s+$/g, ''))
        .join('\n')
        .replace(/\n{4,}/g, '\n\n\n');
      return { ...file, content: normalized };
    });
    showToastMessage('문서를 정리했습니다.');
  };

  const saveWorkspace = () => {
    const current = composeCurrentProject();
    if (!current) {
      showToastMessage('저장할 프로젝트가 없습니다.');
      return;
    }

    setProjectMeta(meta => (meta ? { ...meta, updatedAt: current.updatedAt } : meta));
    setSavedSnapshot(snapshotFromFiles(current.files));
    upsertRecentProject(current, true);

    const stamp = formatTime(Date.now());
    pushTerminal(`[${stamp}] Saved workspace locally: ${current.name}`);
    pushOutput(`Workspace persisted to localStorage (${current.files.length} files)`);
    showToastMessage('워크스페이스를 로컬에 저장했습니다.');
  };

  const runProject = () => {
    if (!projectMeta) {
      setShowProjectCreator(true);
      showToastMessage('먼저 프로젝트를 생성하세요.');
      return;
    }

    setActivityTab('run');
    setSidebarOpen(true);
    setPanelVisible(true);
    setPanelTab('terminal');

    const stamp = formatTime(Date.now());
    const isNode = projectMeta.template === 'node-ts';
    const isUnity = projectMeta.template === 'unity-csharp';
    const script = isUnity
      ? 'Unity Editor (Play Mode / Build pipeline)'
      : isNode
        ? 'dev (tsx watch)'
        : 'dev (vite)';
    pushTerminal([
      isUnity
        ? `[${stamp}] > Unity -projectPath "${projectMeta.path}" -batchmode -quit -executeMethod BuildPipeline.BuildPlayer`
        : `[${stamp}] > ${projectMeta.packageManager} run dev`,
      `[${stamp}] Launching ${script} for ${projectMeta.name}...`,
      isUnity
        ? 'Unity Editor connected - Assets/Scripts compiled successfully'
        : isNode
          ? 'Server ready on http://localhost:3000'
          : 'VITE ready in 380 ms',
    ]);
    pushOutput(`Run task executed for ${projectMeta.name}`);
    showToastMessage('실행 패널에 로그를 출력했습니다.');
  };

  const clearTerminal = () => {
    setTerminalLines([]);
    showToastMessage('터미널을 비웠습니다.');
  };

  const newTerminal = () => {
    const stamp = formatTime(Date.now());
    pushTerminal([`[${stamp}] --- New Terminal Session ---`, `${projectMeta ? projectMeta.path : '/workspace'}$`]);
    setPanelVisible(true);
    setPanelTab('terminal');
    showToastMessage('새 터미널 세션을 열었습니다.');
  };

  const cycleFile = () => {
    if (workspaceFiles.length === 0) {
      showToastMessage('이동할 파일이 없습니다.');
      return;
    }

    const currentIndex = workspaceFiles.findIndex(file => file.id === activeFileId);
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % workspaceFiles.length;
    setActiveFileId(workspaceFiles[nextIndex].id);
    showToastMessage(`열기: ${workspaceFiles[nextIndex].name}`);
  };

  const revealActiveFile = () => {
    if (!activeFile) {
      showToastMessage('활성 파일이 없습니다.');
      return;
    }
    setSidebarOpen(true);
    setActivityTab('explorer');
    setExplorerExpanded(true);
    showToastMessage('Explorer에서 활성 파일을 표시합니다.');
  };

  const toggleActivity = (tab: ActivityTab) => {
    setOpenMenu(null);
    setActivityTab(current => {
      if (current === tab && sidebarOpen) {
        setSidebarOpen(false);
        return current;
      }
      setSidebarOpen(true);
      return tab;
    });
  };

  const closeMenusIfOutside = (target: HTMLElement | null) => {
    if (!target) return;
    if (!target.closest('[data-ac-menu-root="true"]')) {
      setOpenMenu(null);
    }
  };

  const executeMenuAction = (actionId: string) => {
    setOpenMenu(null);

    switch (actionId) {
      case 'file:new-project':
        setShowProjectCreator(true);
        showToastMessage('새 프로젝트 화면을 열었습니다.');
        return;
      case 'file:new-file':
        addUntitledFile();
        return;
      case 'file:save':
        saveWorkspace();
        return;
      case 'file:close-project':
        closeProject();
        return;
      case 'edit:todo':
        insertTodoInActiveFile();
        return;
      case 'edit:format':
        formatActiveFile();
        return;
      case 'edit:rename-project':
        if (!projectMeta) {
          showToastMessage('프로젝트가 없습니다.');
          return;
        }
        setDraft(prev => ({ ...prev, name: `${projectMeta.name}-v2` }));
        showToastMessage('프로젝트 이름 샘플을 갱신했습니다.');
        return;
      case 'selection:next-file':
        cycleFile();
        return;
      case 'selection:reveal':
        revealActiveFile();
        return;
      case 'view:toggle-sidebar':
        setSidebarOpen(prev => !prev);
        showToastMessage('사이드바 표시를 전환했습니다.');
        return;
      case 'view:toggle-panel':
        setPanelVisible(prev => !prev);
        showToastMessage('하단 패널 표시를 전환했습니다.');
        return;
      case 'view:toggle-minimap':
        setShowMinimap(prev => !prev);
        showToastMessage('미니맵 표시를 전환했습니다.');
        return;
      case 'go:welcome':
        setShowProjectCreator(true);
        showToastMessage('Welcome 화면으로 이동했습니다.');
        return;
      case 'go:quick-open':
        cycleFile();
        return;
      case 'go:last-recent':
        if (recentProjects[0]) {
          openRecentProject(recentProjects[0]);
        } else {
          showToastMessage('최근 프로젝트가 없습니다.');
        }
        return;
      case 'run:run-project':
      case 'run:start-debug':
        runProject();
        return;
      case 'terminal:new':
        newTerminal();
        return;
      case 'terminal:clear':
        clearTerminal();
        return;
      case 'help:welcome':
        setShowProjectCreator(true);
        return;
      case 'help:about':
        setShowAbout(true);
        return;
      default:
        showToastMessage('아직 연결되지 않은 메뉴입니다.');
    }
  };

  const getMenuEntries = (menuId: MenuId): MenuEntry[] => {
    const hasProject = Boolean(projectMeta);

    switch (menuId) {
      case 'file':
        return [
          { type: 'item', id: 'file:new-project', label: 'New Project...' },
          {
            type: 'item',
            id: 'file:new-file',
            label: projectMeta?.template === 'unity-csharp' ? 'New C# Script' : 'New File',
            shortcut: 'Ctrl+N',
            disabled: !hasProject,
          },
          { type: 'separator', id: 'file-sep-1' },
          { type: 'item', id: 'file:save', label: 'Save Workspace', shortcut: 'Ctrl+S', disabled: !hasProject },
          { type: 'item', id: 'file:close-project', label: 'Close Project', danger: true, disabled: !hasProject },
        ];
      case 'edit':
        return [
          { type: 'item', id: 'edit:todo', label: 'Insert TODO Comment', disabled: !hasProject || !activeFile },
          { type: 'item', id: 'edit:format', label: 'Format Document', shortcut: 'Shift+Alt+F', disabled: !hasProject || !activeFile },
          { type: 'separator', id: 'edit-sep-1' },
          { type: 'item', id: 'edit:rename-project', label: 'Prepare Rename Draft', disabled: !hasProject },
        ];
      case 'selection':
        return [
          { type: 'item', id: 'selection:next-file', label: 'Next Open File', shortcut: 'Ctrl+Tab', disabled: !hasProject },
          { type: 'item', id: 'selection:reveal', label: 'Reveal in Explorer', disabled: !hasProject || !activeFile },
        ];
      case 'view':
        return [
          { type: 'item', id: 'view:toggle-sidebar', label: sidebarOpen ? 'Hide Side Bar' : 'Show Side Bar' },
          { type: 'item', id: 'view:toggle-panel', label: panelVisible ? 'Hide Panel' : 'Show Panel' },
          { type: 'item', id: 'view:toggle-minimap', label: showMinimap ? 'Hide Minimap' : 'Show Minimap' },
        ];
      case 'go':
        return [
          { type: 'item', id: 'go:quick-open', label: 'Quick Open (Next File)', shortcut: 'Ctrl+P', disabled: !hasProject },
          { type: 'item', id: 'go:last-recent', label: 'Open Last Recent', disabled: recentProjects.length === 0 },
          { type: 'separator', id: 'go-sep-1' },
          { type: 'item', id: 'go:welcome', label: 'Go to Welcome' },
        ];
      case 'run':
        return [
          { type: 'item', id: 'run:run-project', label: 'Run Project', shortcut: 'F5', disabled: !hasProject },
          { type: 'item', id: 'run:start-debug', label: 'Start Debugging', disabled: !hasProject },
        ];
      case 'terminal':
        return [
          { type: 'item', id: 'terminal:new', label: 'New Terminal' },
          { type: 'item', id: 'terminal:clear', label: 'Clear Terminal' },
        ];
      case 'help':
        return [
          { type: 'item', id: 'help:welcome', label: 'Welcome' },
          { type: 'item', id: 'help:about', label: 'About Achieveone Code' },
        ];
      default:
        return [];
    }
  };

  const renderSidebarContent = () => {
    if (activityTab === 'explorer') {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b border-[#2a2d2e] p-2">
            <div className="mb-2 flex items-center justify-between text-[11px] tracking-[0.12em] text-[#bbbbbb]">
              <span>EXPLORER</span>
              <button
                type="button"
                data-os-window-control="true"
                onClick={addUntitledFile}
                className="rounded p-1 text-[#9da1a6] hover:bg-[#2a2d2e] hover:text-white"
                aria-label="Create file"
              >
                <Plus size={12} />
              </button>
            </div>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                data-os-window-control="true"
                type="text"
                value={editorSearchQuery}
                onChange={event => setEditorSearchQuery(event.target.value)}
                placeholder="파일명 필터"
                className="h-8 w-full rounded border border-[#2a2d2e] bg-[#1f1f1f] pl-7 pr-2 text-xs text-[#d4d4d4] outline-none focus:border-[#007acc]"
              />
            </div>
          </div>

          {!projectMeta ? (
            <div className="p-3 text-xs text-[#9da1a6]">
              <div className="mb-2 text-[#d4d4d4]">열린 폴더가 없습니다.</div>
              <button
                type="button"
                data-os-window-control="true"
                onClick={() => setShowProjectCreator(true)}
                className="rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-1 text-[#cfd3d7] hover:bg-[#2a2a2a]"
              >
                New Project 열기
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                data-os-window-control="true"
                onClick={() => setExplorerExpanded(prev => !prev)}
                className="flex h-8 items-center gap-1 px-2 text-left text-xs text-[#cccccc] hover:bg-[#2a2d2e]"
              >
                {explorerExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} className="text-[#dcb67a]" />
                <span className="truncate font-medium tracking-[0.06em] uppercase">{projectMeta.name}</span>
              </button>

              {explorerExpanded ? (
                <div className="flex-1 overflow-auto px-1 pb-2">
                  {filteredExplorerFiles.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-[#777]">검색 결과가 없습니다.</div>
                  ) : (
                    filteredExplorerFiles.map(file => {
                      const Icon = getFileIcon(file.kind);
                      const isActive = activeFile?.id === file.id;

                      return (
                        <button
                          key={file.id}
                          type="button"
                          data-os-window-control="true"
                          onClick={() => setActiveFile(file.id)}
                          className={`flex h-7 w-full items-center gap-2 rounded px-2 text-left text-xs transition-colors ${
                            isActive ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e]'
                          }`}
                        >
                          <Icon size={14} className={getFileIconColor(file.kind)} />
                          <span className="truncate">{file.path}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      );
    }

    if (activityTab === 'search') {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b border-[#2a2d2e] p-2">
            <div className="mb-2 text-[11px] tracking-[0.12em] text-[#bbbbbb]">SEARCH</div>
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#777]" />
              <input
                data-os-window-control="true"
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="전체 파일 검색"
                className="h-8 w-full rounded border border-[#2a2d2e] bg-[#1f1f1f] pl-7 pr-2 text-xs text-[#d4d4d4] outline-none focus:border-[#007acc]"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {!projectMeta ? (
              <div className="text-xs text-[#888]">프로젝트 생성 후 검색할 수 있습니다.</div>
            ) : !searchQuery.trim() ? (
              <div className="text-xs text-[#888]">검색어를 입력하세요.</div>
            ) : searchResults.length === 0 ? (
              <div className="text-xs text-[#888]">검색 결과가 없습니다.</div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((hit, index) => (
                  <button
                    key={`${hit.fileId}-${hit.line}-${index}`}
                    type="button"
                    data-os-window-control="true"
                    onClick={() => {
                      setActiveFileId(hit.fileId);
                      setActivityTab('explorer');
                    }}
                    className="block w-full rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-2 text-left hover:bg-[#252525]"
                  >
                    <div className="truncate text-[11px] text-[#cfd3d7]">{hit.path}</div>
                    <div className="text-[10px] text-[#7f8790]">Line {hit.line}</div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-[#9fa6ad]">{hit.preview}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activityTab === 'sourceControl') {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b border-[#2a2d2e] p-2">
            <div className="mb-2 text-[11px] tracking-[0.12em] text-[#bbbbbb]">SOURCE CONTROL</div>
            <div className="rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-2 text-xs text-[#cfd3d7]">
              <div className="flex items-center gap-2">
                <GitBranch size={12} className="text-[#8cc8ff]" />
                <span>{projectMeta?.branch || 'no-branch'}</span>
              </div>
              <div className="mt-1 text-[11px] text-[#7f8790]">{projectMeta ? projectMeta.path : 'No workspace opened'}</div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {!projectMeta ? (
              <div className="text-xs text-[#888]">프로젝트 생성 후 변경사항이 표시됩니다.</div>
            ) : scmChanges.length === 0 ? (
              <div className="text-xs text-[#888]">변경사항 없음 (clean working tree)</div>
            ) : (
              <div className="space-y-1">
                {scmChanges.map(change => (
                  <div key={change.path} className="flex items-center gap-2 rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-2 text-xs">
                    <span className={`inline-flex w-5 justify-center font-semibold ${change.status === 'M' ? 'text-[#eab308]' : 'text-[#34d399]'}`}>
                      {change.status}
                    </span>
                    <span className="truncate text-[#d4d4d4]">{change.path}</span>
                    <span className="ml-auto text-[10px] text-[#7f8790]">{change.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-[#2a2d2e] p-2">
            <button
              type="button"
              data-os-window-control="true"
              onClick={saveWorkspace}
              disabled={!projectMeta}
              className="h-8 w-full rounded bg-[#0e639c] text-xs font-semibold text-white hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:bg-[#2a2d2e] disabled:text-[#666]"
            >
              Save Workspace (Stage/Commit)
            </button>
          </div>
        </div>
      );
    }

    if (activityTab === 'run') {
      return (
        <div className="flex h-full flex-col">
          <div className="border-b border-[#2a2d2e] p-2">
            <div className="mb-2 text-[11px] tracking-[0.12em] text-[#bbbbbb]">RUN AND DEBUG</div>
            <div className="rounded border border-[#2a2d2e] bg-[#1f1f1f] p-2 text-xs text-[#cfd3d7]">
              <div>{projectMeta ? templateLabels[projectMeta.template] : 'No project'}</div>
              <div className="mt-1 text-[11px] text-[#7f8790]">
                {projectMeta
                  ? projectMeta.template === 'unity-csharp'
                    ? 'Unity Editor + C# compile pipeline'
                    : `${projectMeta.packageManager} scripts ready`
                  : 'Create a project first'}
              </div>
            </div>
          </div>
          <div className="p-2 space-y-2">
            <button
              type="button"
              data-os-window-control="true"
              onClick={runProject}
              disabled={!projectMeta}
              className="flex h-8 w-full items-center justify-center gap-2 rounded bg-[#0e639c] text-xs font-semibold text-white hover:bg-[#1177bb] disabled:cursor-not-allowed disabled:bg-[#2a2d2e] disabled:text-[#666]"
            >
              <Play size={12} />
              {projectMeta?.template === 'unity-csharp' ? 'Run Unity Build' : 'Run Project'}
            </button>
            <button
              type="button"
              data-os-window-control="true"
              onClick={() => {
                setPanelVisible(true);
                setPanelTab('output');
                pushOutput('Debug configuration checked.');
                showToastMessage('디버그 패널을 열었습니다.');
              }}
              disabled={!projectMeta}
              className="flex h-8 w-full items-center justify-center gap-2 rounded border border-[#2a2d2e] bg-[#1f1f1f] text-xs text-[#d4d4d4] hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:text-[#666]"
            >
              <Wand2 size={12} />
              Start Debugging
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-[#2a2d2e] p-2">
          <div className="mb-2 text-[11px] tracking-[0.12em] text-[#bbbbbb]">SETTINGS</div>
          <div className="space-y-2 text-xs text-[#cfd3d7]">
            <label className="flex items-center justify-between rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-2">
              <span>Show Minimap</span>
              <input data-os-window-control="true" type="checkbox" checked={showMinimap} onChange={() => setShowMinimap(prev => !prev)} />
            </label>
            <label className="flex items-center justify-between rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-2">
              <span>Show Panel</span>
              <input data-os-window-control="true" type="checkbox" checked={panelVisible} onChange={() => setPanelVisible(prev => !prev)} />
            </label>
            <label className="flex items-center justify-between rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-2">
              <span>Project Creator on Launch</span>
              <input data-os-window-control="true" type="checkbox" checked={showProjectCreator} onChange={() => setShowProjectCreator(prev => !prev)} />
            </label>
          </div>
        </div>
        <div className="p-2 text-xs text-[#7f8790]">
          이 설정들은 IDE UI 상태를 제어합니다.
        </div>
      </div>
    );
  };

  const recentProject = recentProjects[0] || null;

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#1e1e1e] text-[#cccccc]"
      onPointerDownCapture={event => closeMenusIfOutside(event.target as HTMLElement | null)}
    >
      <div className={`flex h-full flex-col transition-all duration-300 ${bootPhase !== 'ready' ? 'scale-[1.01] blur-[1px]' : 'scale-100 blur-0'}`}>
        <div
          data-os-window-drag-handle="true"
          className="h-9 shrink-0 border-b border-[#2a2d2e] bg-[#181818] px-3"
        >
          <div className="flex h-full items-center justify-between gap-2 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                data-os-window-control="true"
                onClick={() => setSidebarOpen(prev => !prev)}
                className="rounded p-1 text-[#c5c5c5] hover:bg-[#2a2d2e] md:hidden"
                aria-label="Toggle sidebar"
              >
                <Menu size={15} />
              </button>

              <Code2 size={15} className="shrink-0 text-[#007acc]" />
              <span className="truncate text-[#dddddd]">Achieveone Code</span>
              <span className="hidden truncate text-[#8a8a8a] sm:inline">
                {projectMeta ? `- ${projectMeta.name}` : '- New Project'}
              </span>
            </div>

            <div className="hidden items-center gap-1 lg:flex" data-ac-menu-root="true" data-os-window-control="true">
              {menuOrder.map(menu => (
                <div key={menu.id} className="relative" data-ac-menu-root="true">
                  <button
                    type="button"
                    data-os-window-control="true"
                    onClick={() => setOpenMenu(prev => (prev === menu.id ? null : menu.id))}
                    className={`rounded px-2 py-1 text-xs ${openMenu === menu.id ? 'bg-[#2a2d2e] text-white' : 'text-[#c5c5c5] hover:bg-[#2a2d2e]'}`}
                  >
                    {menu.label}
                  </button>

                  {openMenu === menu.id ? (
                    <div className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded border border-[#2a2d2e] bg-[#252526] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.35)]" data-ac-menu-root="true">
                      {getMenuEntries(menu.id).map(entry => {
                        if (entry.type === 'separator') {
                          return <div key={entry.id} className="my-1 h-px bg-[#2a2d2e]" />;
                        }

                        return (
                          <button
                            key={entry.id}
                            type="button"
                            data-os-window-control="true"
                            disabled={entry.disabled}
                            onClick={() => executeMenuAction(entry.id)}
                            className={`flex h-8 w-full items-center justify-between rounded px-2 text-left text-xs ${
                              entry.disabled
                                ? 'cursor-not-allowed text-[#666]'
                                : entry.danger
                                  ? 'text-[#fca5a5] hover:bg-[#3a1f25]'
                                  : 'text-[#d4d4d4] hover:bg-[#2a2d2e]'
                            }`}
                          >
                            <span>{entry.label}</span>
                            {entry.shortcut ? <span className="ml-4 text-[10px] text-[#7f8790]">{entry.shortcut}</span> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[#8a8a8a]" data-os-window-control="true">
              <Bell size={14} />
              <Settings size={14} />
              <User size={14} />
              <div className="ml-1 flex items-center overflow-hidden rounded border border-[#2a2d2e] bg-[#1f1f1f]" data-os-window-control="true">
                <button
                  type="button"
                  data-os-window-control="true"
                  aria-label="Minimize window"
                  onClick={event => {
                    event.stopPropagation();
                    if (ideWindow) minimizeWindow(ideWindow.id);
                  }}
                  className="flex h-7 w-8 items-center justify-center text-[#c5c5c5] hover:bg-[#2a2d2e] hover:text-white"
                >
                  <Minus size={13} />
                </button>
                <button
                  type="button"
                  data-os-window-control="true"
                  aria-label={ideWindow?.isMaximized ? 'Restore window' : 'Maximize window'}
                  onClick={event => {
                    event.stopPropagation();
                    if (ideWindow) maximizeWindow(ideWindow.id);
                  }}
                  className="flex h-7 w-8 items-center justify-center border-l border-[#2a2d2e] text-[#c5c5c5] hover:bg-[#2a2d2e] hover:text-white"
                >
                  {ideWindow?.isMaximized ? <Square size={11} /> : <Maximize2 size={13} />}
                </button>
                <button
                  type="button"
                  data-os-window-control="true"
                  aria-label="Close window"
                  onClick={event => {
                    event.stopPropagation();
                    if (ideWindow) closeWindow(ideWindow.id);
                  }}
                  className="flex h-7 w-8 items-center justify-center border-l border-[#2a2d2e] text-[#c5c5c5] hover:bg-[#e81123] hover:text-white"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-12 shrink-0 border-r border-[#2a2d2e] bg-[#181818] md:flex md:flex-col md:items-center md:py-2">
            {[
              { id: 'explorer' as const, icon: Files, label: 'Explorer' },
              { id: 'search' as const, icon: Search, label: 'Search' },
              { id: 'sourceControl' as const, icon: GitBranch, label: 'Source Control' },
              { id: 'run' as const, icon: Play, label: 'Run and Debug' },
            ].map(item => {
              const Icon = item.icon;
              const selected = activityTab === item.id && sidebarOpen;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-os-window-control="true"
                  onClick={() => toggleActivity(item.id)}
                  aria-label={item.label}
                  className={`mb-1 flex h-10 w-full items-center justify-center border-l-2 ${
                    selected ? 'border-[#007acc] text-white' : 'border-transparent text-[#858585] hover:text-[#d4d4d4]'
                  }`}
                >
                  <Icon size={18} />
                </button>
              );
            })}

            <button
              type="button"
              data-os-window-control="true"
              onClick={() => toggleActivity('settings')}
              aria-label="Settings"
              className={`mt-auto flex h-10 w-full items-center justify-center border-l-2 ${
                activityTab === 'settings' && sidebarOpen ? 'border-[#007acc] text-white' : 'border-transparent text-[#858585] hover:text-[#d4d4d4]'
              }`}
            >
              <Settings size={18} />
            </button>
          </aside>

          <aside className={`${sidebarOpen ? 'flex' : 'hidden'} w-[290px] shrink-0 flex-col border-r border-[#2a2d2e] bg-[#252526]`}>
            {renderSidebarContent()}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col bg-[#1e1e1e]">
            <div className="h-9 shrink-0 border-b border-[#2a2d2e] bg-[#252526]">
              <div className="flex h-full items-center overflow-x-auto">
                {showProjectCreator || openTabs.length === 0 ? (
                  <div className="flex h-full min-w-[180px] items-center gap-2 border-r border-[#2a2d2e] bg-[#1e1e1e] px-3 text-xs text-[#d4d4d4]">
                    <FolderPlus size={13} className="text-[#9cdcfe]" />
                    Welcome / New Project
                  </div>
                ) : (
                  openTabs.map(file => {
                    const Icon = getFileIcon(file.kind);
                    const isActive = file.id === activeFile?.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        data-os-window-control="true"
                        onClick={() => setActiveFile(file.id)}
                        className={`flex h-full min-w-[150px] items-center gap-2 border-r border-[#2a2d2e] px-3 text-xs ${
                          isActive ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-[#c2c2c2] hover:bg-[#323233]'
                        }`}
                      >
                        <Icon size={13} className={getFileIconColor(file.kind)} />
                        <span className="truncate">{file.name}</span>
                        {savedSnapshot[file.path] !== undefined && savedSnapshot[file.path] !== file.content ? (
                          <span className="ml-auto text-[#eab308]">●</span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="h-7 shrink-0 border-b border-[#2a2d2e] bg-[#1f1f1f] px-3 text-[11px] text-[#9da1a6] flex items-center gap-2">
              {projectMeta ? (
                <>
                  <span className="truncate">{projectMeta.name}</span>
                  <ChevronRight size={12} />
                  <span className="truncate">{activeFile?.path || 'No file selected'}</span>
                </>
              ) : (
                <span>Start | Create a new project to begin</span>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1">
                <div className="min-w-0 flex-1 overflow-auto bg-[#1e1e1e]">
                  {showProjectCreator ? (
                    <div className="flex h-full items-center justify-center p-5">
                      <div className="w-full max-w-3xl rounded-2xl border border-[#2a2d2e] bg-gradient-to-br from-[#171717] via-[#151515] to-[#101720] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="mb-1 flex items-center gap-2 text-[#9cdcfe]">
                              <Code2 size={16} />
                              <span className="text-sm font-semibold">Create New Project</span>
                            </div>
                            <p className="text-xs text-[#9da1a6]">
                              샘플 화면 대신 새 프로젝트 생성 인터페이스가 먼저 표시됩니다. 생성 결과는 Achieveone Code 내부 워크스페이스와 로컬 저장소에 보관됩니다.
                            </p>
                          </div>
                          {recentProject ? (
                            <button
                              type="button"
                              data-os-window-control="true"
                              onClick={() => openRecentProject(recentProject)}
                              className="rounded-lg border border-[#2a2d2e] bg-[#1f1f1f] px-3 py-2 text-xs text-[#d4d4d4] hover:bg-[#2a2a2a]"
                            >
                              최근 프로젝트 열기
                            </button>
                          ) : null}
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                          <div className="space-y-4">
                            <label className="block text-xs text-[#cfd3d7]">
                              <span className="mb-1 block text-[11px] uppercase tracking-[0.12em] text-[#9da1a6]">Project Name</span>
                              <input
                                data-os-window-control="true"
                                type="text"
                                value={draft.name}
                                onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))}
                                className="h-10 w-full rounded-lg border border-[#2a2d2e] bg-[#1f1f1f] px-3 text-sm text-white outline-none focus:border-[#007acc]"
                              />
                            </label>

                            <div>
                              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[#9da1a6]">Template</div>
                              <div className="grid gap-2">
                                {(['unity-csharp', 'react-ts', 'vanilla-ts', 'node-ts'] as const).map(template => (
                                  <button
                                    key={template}
                                    type="button"
                                    data-os-window-control="true"
                                    onClick={() => setDraft(prev => ({ ...prev, template }))}
                                    className={`rounded-lg border px-3 py-3 text-left ${
                                      draft.template === template
                                        ? 'border-[#007acc] bg-[#0b2538]'
                                        : 'border-[#2a2d2e] bg-[#1f1f1f] hover:bg-[#252525]'
                                    }`}
                                  >
                                    <div className="text-sm text-white">{templateLabels[template]}</div>
                                    <div className="mt-1 text-xs text-[#9da1a6]">
                                      {template === 'react-ts'
                                        ? 'Vite + React + TS starter'
                                        : template === 'vanilla-ts'
                                          ? '브라우저 기반 TS starter'
                                          : template === 'node-ts'
                                            ? 'Node.js CLI/server starter'
                                            : 'Unity project structure + C# scripts + ProjectSettings'}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4 rounded-xl border border-[#2a2d2e] bg-[#141414] p-4">
                            <div>
                              <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[#9da1a6]">
                                {draft.template === 'unity-csharp' ? 'Tooling Package Manager' : 'Package Manager'}
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {(['npm', 'pnpm', 'yarn'] as const).map(manager => (
                                  <button
                                    key={manager}
                                    type="button"
                                    data-os-window-control="true"
                                    onClick={() => setDraft(prev => ({ ...prev, packageManager: manager }))}
                                    className={`h-9 rounded border text-xs ${
                                      draft.packageManager === manager
                                        ? 'border-[#007acc] bg-[#0b2538] text-white'
                                        : 'border-[#2a2d2e] bg-[#1f1f1f] text-[#cfd3d7] hover:bg-[#252525]'
                                    }`}
                                  >
                                    {packageManagerLabels[manager]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <label className="flex items-center justify-between rounded-lg border border-[#2a2d2e] bg-[#1f1f1f] px-3 py-2 text-xs text-[#d4d4d4]">
                              <span>Initialize Git (.gitignore 포함)</span>
                              <input
                                data-os-window-control="true"
                                type="checkbox"
                                checked={draft.includeGit}
                                onChange={() => setDraft(prev => ({ ...prev, includeGit: !prev.includeGit }))}
                              />
                            </label>

                            <div className="rounded-lg border border-[#2a2d2e] bg-[#11161c] p-3 text-xs text-[#9da1a6]">
                              <div className="mb-1 text-[#cfd3d7]">생성 경로 (워크스페이스)</div>
                              <div className="font-mono text-[11px] text-[#8cc8ff]">/workspace/{slugify(draft.name)}</div>
                              <div className="mt-2">생성 후 Explorer, Search, Run, Source Control 패널이 모두 실제 상태로 갱신됩니다.</div>
                            </div>

                            <button
                              type="button"
                              data-os-window-control="true"
                              onClick={createProjectFromDraft}
                              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#0e639c] text-sm font-semibold text-white hover:bg-[#1177bb]"
                            >
                              <FolderPlus size={15} />
                              Create Project
                            </button>
                          </div>
                        </div>

                        {recentProjects.length > 0 ? (
                          <div className="mt-5 border-t border-[#2a2d2e] pt-4">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[#9da1a6]">Recent Projects</div>
                            <div className="grid gap-2 md:grid-cols-2">
                              {recentProjects.slice(0, 4).map(project => (
                                <button
                                  key={project.id}
                                  type="button"
                                  data-os-window-control="true"
                                  onClick={() => openRecentProject(project)}
                                  className="rounded-lg border border-[#2a2d2e] bg-[#1a1a1a] px-3 py-3 text-left hover:bg-[#232323]"
                                >
                                  <div className="truncate text-sm text-white">{project.name}</div>
                                  <div className="mt-1 text-[11px] text-[#9da1a6]">{templateLabels[project.template]}</div>
                                  <div className="mt-1 truncate text-[11px] text-[#7f8790]">{project.path}</div>
                                  <div className="mt-2 text-[10px] text-[#7f8790]">Updated {formatDate(project.updatedAt)}</div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : activeFile ? (
                    <div className="flex min-h-0 h-full">
                      <div className="min-h-0 flex-1 overflow-auto">
                        <div className="min-w-max py-2" style={{ fontFamily: editorFont }}>
                          {codeLines.map((line, index) => {
                            const lineNo = index + 1;
                            const isCursorLine = lineNo === activeFile.cursorLine;
                            const highlight = searchQuery.trim() && line.toLowerCase().includes(searchQuery.trim().toLowerCase());

                            return (
                              <div
                                key={`${activeFile.id}-${lineNo}`}
                                className={`group flex text-[13px] leading-6 ${
                                  isCursorLine ? 'bg-[#2a2d2e]' : highlight ? 'bg-[#263445]/60' : 'hover:bg-[#2a2d2e]/50'
                                }`}
                              >
                                <button
                                  type="button"
                                  data-os-window-control="true"
                                  onClick={() => {
                                    setWorkspaceFiles(prev => prev.map(file => (
                                      file.id === activeFile.id ? { ...file, cursorLine: lineNo, cursorCol: 1 } : file
                                    )));
                                  }}
                                  className="w-14 shrink-0 select-none pr-3 text-right text-[#6e7681] hover:text-[#9da1a6]"
                                >
                                  {lineNo}
                                </button>
                                <pre className="m-0 min-w-0 flex-1 whitespace-pre pr-10 text-[#d4d4d4]">{line || ' '}</pre>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {showMinimap ? (
                        <div className="hidden w-24 shrink-0 border-l border-[#2a2d2e] bg-[#1b1b1b] px-2 py-2 xl:block">
                          <div className="space-y-1 opacity-70">
                            {Array.from({ length: Math.max(18, Math.min(48, codeLines.length)) }).map((_, index) => (
                              <div
                                key={`minimap-${index}`}
                                className="h-1.5 rounded"
                                style={{
                                  width: `${36 + ((index * 19) % 48)}px`,
                                  backgroundColor: index + 1 === activeFile.cursorLine ? '#3f9cff' : index % 6 === 0 ? '#4ec9b0' : '#5b5b5b',
                                  opacity: index + 1 === activeFile.cursorLine ? 0.85 : 0.35,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#7f8790]">파일을 선택하세요.</div>
                  )}
                </div>
              </div>

              {panelVisible ? (
                <div className="h-48 shrink-0 border-t border-[#2a2d2e] bg-[#181818] md:h-56">
                  <div className="flex h-8 items-center border-b border-[#2a2d2e] px-2 text-xs">
                    <button
                      type="button"
                      data-os-window-control="true"
                      onClick={() => setPanelTab('terminal')}
                      className={`mr-1 rounded px-2 py-1 ${panelTab === 'terminal' ? 'bg-[#2a2d2e] text-white' : 'text-[#9f9f9f] hover:text-white'}`}
                    >
                      TERMINAL
                    </button>
                    <button
                      type="button"
                      data-os-window-control="true"
                      onClick={() => setPanelTab('problems')}
                      className={`mr-1 rounded px-2 py-1 ${panelTab === 'problems' ? 'bg-[#2a2d2e] text-white' : 'text-[#9f9f9f] hover:text-white'}`}
                    >
                      PROBLEMS
                    </button>
                    <button
                      type="button"
                      data-os-window-control="true"
                      onClick={() => setPanelTab('output')}
                      className={`rounded px-2 py-1 ${panelTab === 'output' ? 'bg-[#2a2d2e] text-white' : 'text-[#9f9f9f] hover:text-white'}`}
                    >
                      OUTPUT
                    </button>
                    <button
                      type="button"
                      data-os-window-control="true"
                      onClick={() => setPanelVisible(false)}
                      className="ml-auto rounded px-2 py-1 text-[#9f9f9f] hover:bg-[#2a2d2e] hover:text-white"
                    >
                      Hide Panel
                    </button>
                  </div>

                  <div className="h-[calc(100%-2rem)] overflow-auto px-3 py-2 text-xs" style={{ fontFamily: editorFont }}>
                    {panelTab === 'terminal' ? (
                      <div className="space-y-1 text-[#d4d4d4]">
                        {terminalLines.length === 0 ? <div className="text-[#7f8790]">Terminal cleared.</div> : null}
                        {terminalLines.map((line, index) => (
                          <div
                            key={`terminal-${index}`}
                            className={line.startsWith('[') ? 'text-[#d4d4d4]' : line.startsWith('>') ? 'text-[#4ec9b0]' : line.includes('ready') ? 'text-[#9cdcfe]' : 'text-[#d4d4d4]'}
                          >
                            {line || '\u00A0'}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {panelTab === 'output' ? (
                      <div className="space-y-2 text-[#c5c5c5]">
                        {outputLines.map((line, index) => (
                          <div key={`output-${index}`} className="flex items-start gap-2">
                            <Sparkles size={12} className="mt-[2px] shrink-0 text-[#9cdcfe]" />
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {panelTab === 'problems' ? (
                      <div className="space-y-2">
                        {problemEntries.map((problem, index) => (
                          <div key={`problem-${index}`} className="flex items-start gap-2 rounded border border-[#2a2d2e] bg-[#1f1f1f] px-2 py-2">
                            {problem.severity === 'warning' ? (
                              <AlertTriangle size={14} className="mt-[1px] shrink-0 text-[#cca700]" />
                            ) : (
                              <Info size={14} className="mt-[1px] shrink-0 text-[#4ec9b0]" />
                            )}
                            <div className="min-w-0">
                              <div className="text-[#d4d4d4]">{problem.label}</div>
                              {problem.file ? (
                                <div className="truncate text-[#8a8a8a]">
                                  {problem.file}{problem.line ? `:${problem.line}` : ''}{problem.column ? `:${problem.column}` : ''}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="h-6 shrink-0 border-t border-[#007acc] bg-[#007acc] px-2 text-[11px] text-white">
          <div className="flex h-full items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="flex items-center gap-1 whitespace-nowrap">
                <GitBranch size={12} />
                {projectMeta?.branch || 'no-branch'}
              </span>
              <span className="hidden items-center gap-1 whitespace-nowrap sm:flex">
                <Wrench size={12} />
                {projectMeta ? templateLabels[projectMeta.template] : 'No Project'}
              </span>
              <span className="hidden items-center gap-1 whitespace-nowrap md:flex">
                <Terminal size={12} />
                {projectMeta
                  ? projectMeta.template === 'unity-csharp'
                    ? 'Unity Editor / C#'
                    : `${projectMeta.packageManager} scripts`
                  : 'Create project first'}
              </span>
            </div>
            <div className="flex items-center gap-3 overflow-hidden text-right">
              <span className="hidden whitespace-nowrap sm:inline">UTF-8</span>
              <span className="hidden whitespace-nowrap md:inline">LF</span>
              <span className="whitespace-nowrap">
                Ln {activeFile?.cursorLine || 1}, Col {activeFile?.cursorCol || 1}
              </span>
              <span className="hidden items-center gap-1 whitespace-nowrap lg:flex">
                <Sparkles size={12} />
                Dark+
              </span>
            </div>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="pointer-events-none absolute bottom-8 right-4 z-30 rounded border border-[#2a2d2e] bg-[#11161c]/95 px-3 py-2 text-xs text-[#d4d4d4] shadow-lg">
          {toast}
        </div>
      ) : null}

      {showAbout ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4" data-os-window-control="true">
          <div className="w-full max-w-md rounded-xl border border-[#2a2d2e] bg-[#1c1c1c] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Code2 size={16} className="text-[#3ea6ff]" />
                <span className="font-semibold">About Achieveone Code</span>
              </div>
              <button
                type="button"
                data-os-window-control="true"
                onClick={() => setShowAbout(false)}
                className="rounded p-1 text-[#9da1a6] hover:bg-[#2a2d2e] hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-2 text-xs text-[#cfd3d7]">
              <p>VS Code 스타일 인터페이스를 모사한 Achieveone 전용 IDE 앱입니다.</p>
              <p>기능: Unity(C#) 포함 새 프로젝트 생성, Explorer/Search/SCM/Run 패널, 메뉴 동작, 로컬 저장(localStorage) persistence.</p>
              <p className="text-[#8a8a8a]">실제 OS 파일 시스템 생성은 브라우저 보안 제약상 기본적으로 불가하며, 현재는 앱 내부 워크스페이스와 로컬 저장소에 생성됩니다.</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                data-os-window-control="true"
                onClick={() => setShowAbout(false)}
                className="rounded bg-[#0e639c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1177bb]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {bootPhase !== 'ready' ? (
        <div
          className={`absolute inset-0 z-40 flex items-center justify-center bg-[#111111] transition-opacity duration-200 ${
            bootPhase === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
          aria-live="polite"
        >
          <div className="relative w-[min(92%,560px)] overflow-hidden rounded-2xl border border-[#2a2d2e] bg-gradient-to-br from-[#171717] via-[#101214] to-[#0b1624] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#007acc]/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-[#4ec9b0]/15 blur-2xl" />

            <div className="mb-5 flex items-center gap-4">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-[#007acc]/20 ring-1 ring-[#007acc]/40">
                <Code2 size={28} className="text-[#3ea6ff]" />
                <div className="absolute -right-1 -top-1 rounded-full bg-[#111111] p-1 ring-1 ring-[#2a2d2e]">
                  <Loader2 size={10} className="animate-spin text-[#4ec9b0]" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-lg font-semibold tracking-tight text-white">Achieveone Code</div>
                <div className="text-sm text-[#9da1a6]">Booting IDE workbench</div>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 text-sm text-[#d4d4d4]">
              <Loader2 size={14} className="animate-spin text-[#4ec9b0]" />
              <span>{getBootHeadline(progress)}</span>
            </div>

            <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#1f1f1f] ring-1 ring-[#2a2d2e]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#007acc] via-[#3ea6ff] to-[#4ec9b0] transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid gap-2 text-xs text-[#a0a0a0] sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-[#4ec9b0]" />
                <span>Renderer process ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className={`${progress > 45 ? 'text-[#4ec9b0]' : 'text-[#555555]'}`} />
                <span>Extension host {progress > 45 ? 'connected' : 'pending'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className={`${progress > 70 ? 'text-[#4ec9b0]' : 'text-[#555555]'}`} />
                <span>Project workflow ready</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className={`${progress > 88 ? 'text-[#4ec9b0]' : 'text-[#555555]'}`} />
                <span>Workbench UI mounted</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#2a2d2e] pt-3 text-xs text-[#7f8790]">
              <span className="flex items-center gap-2">
                <Files size={12} />
                Workbench
              </span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
