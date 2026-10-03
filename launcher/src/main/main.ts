import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { readFile, writeFile, rename, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { GitHub, validatePng } from './github';
import { loginToken } from './auth';
import { SITE_URL, validateDraft, type Draft, type State, type ApiResult, type Snapshot, type User } from '../shared/model';
import { contentSchema } from '../shared/model';
import { documentOptionsSchema } from '../shared/document';
import { renderPdf } from './pdf';

app.setAppUserModelId('dev.somiri.achieveone.studio');
if (!app.isPackaged && process.env.STUDIO_TEST_USER_DATA) app.setPath('userData', process.env.STUDIO_TEST_USER_DATA);
if (!app.requestSingleInstanceLock()) app.quit();
let window: BrowserWindow;
let client: GitHub | null = null;
let user: User | null = null;
let snapshot: Snapshot | null = null;
let draft: Draft | null = null;
let lastPublished: string | null = null;
let publishing = false;
let closing = false;
let saving: Promise<unknown> = Promise.resolve();
let documentSaving: Promise<unknown> = Promise.resolve();
let lastDocument: string | null = null;
let exporting = false;
const rendererPath = path.join(__dirname, 'index.html');
const draftFile = () => path.join(app.getPath('userData'), 'draft.json');
const state = (): State => ({ user, snapshot, draft, lastPublished });
const shaSchema = z.string().regex(/^[a-f0-9]{40}$/);

async function saveDraft(value: Draft) {
  const saved = { ...validateDraft(value), savedAt: new Date().toISOString() };
  const write = async () => {
    await mkdir(app.getPath('userData'), { recursive: true });
    await writeFile(`${draftFile()}.tmp`, JSON.stringify(saved), { encoding: 'utf8', mode: 0o600 });
    await rename(`${draftFile()}.tmp`, draftFile());
    draft = saved;
    return saved.savedAt;
  };
  const pending = saving.then(write, write);
  saving = pending;
  return pending;
}

function handler(name: string, callback: (...args: unknown[]) => unknown) {
  ipcMain.handle(`studio:${name}`, async (event, ...args): Promise<ApiResult<unknown>> => {
    if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame || event.senderFrame.url !== pathToFileURL(rendererPath).href) return { ok: false, error: '허용하지 않는 요청이에요.' };
    try { return { ok: true, value: await callback(...args) }; }
    catch (error) { return { ok: false, error: error instanceof z.ZodError ? '입력 내용을 확인해 주세요.' : error instanceof Error ? error.message : '작업을 완료하지 못했어요.' }; }
  });
}

const connect = async (interactive: boolean) => {
  const next = new GitHub(await loginToken(interactive));
  const nextUser = await next.user();
  const nextSnapshot = await next.snapshot();
  client = next; user = nextUser; snapshot = nextSnapshot;
  return state();
};

app.whenReady().then(async () => {
  try { draft = validateDraft(JSON.parse(await readFile(draftFile(), 'utf8'))); } catch { /* First launch has no draft. */ }
  window = new BrowserWindow({ width: 1460, height: 980, minWidth: 1060, minHeight: 720, backgroundColor: '#f5f4f0', title: 'Achieveone Studio', icon: path.join(__dirname, 'icon.png'), show: false, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, spellcheck: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (url !== pathToFileURL(rendererPath).href) event.preventDefault(); });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.on('close', event => {
    if (closing) return;
    event.preventDefault();
    if (publishing || exporting) dialog.showMessageBoxSync(window, { type: 'info', message: '진행 중인 작업을 마친 뒤 창을 닫을 수 있어요.' });
    else window.webContents.send('studio:prepare-close');
  });
  handler('state', state);
  handler('login', () => connect(true));
  handler('logout', () => { client = null; user = null; snapshot = null; });
  handler('refresh', async () => { if (!client) return connect(false); snapshot = await client.snapshot(); return state(); });
  handler('save-draft', value => { if (publishing) throw new Error('게시가 끝날 때까지 기다려 주세요.'); return saveDraft(validateDraft(value)); });
  handler('discard-draft', async () => { if (publishing) throw new Error('게시 중에는 초안을 삭제할 수 없어요.'); await saving; await rm(draftFile(), { force: true }); draft = null; });
  handler('publish', async (value, message) => {
    if (!client) throw new Error('GitHub에 먼저 로그인해 주세요.');
    if (publishing) throw new Error('이미 게시 중이에요.');
    const parsed = validateDraft(value);
    const commitMessage = z.string().max(300).parse(message);
    publishing = true;
    try {
      await saveDraft(parsed);
      const result = await client.publish(parsed, commitMessage);
      snapshot = result.snapshot; lastPublished = result.sha;
      try { snapshot = await client.snapshot(); } catch { /* The commit is already published. */ }
      await saving;
      draft = null;
      await rm(draftFile(), { force: true }).catch(() => undefined);
      return { ...result, snapshot };
    } finally { publishing = false; }
  });
  handler('deployment', value => { if (!client) throw new Error('로그인이 필요해요.'); return client.deployment(shaSchema.parse(value)); });
  handler('choose-image', async () => {
    const result = await dialog.showOpenDialog(window, { title: '프로필 사진 선택', filters: [{ name: 'PNG 사진', extensions: ['png'] }], properties: ['openFile'] });
    if (result.canceled || !result.filePaths[0]) return null;
    const data = await readFile(result.filePaths[0]);
    const encoded = data.toString('base64'); validatePng(encoded); return encoded;
  });
  handler('open-site', () => shell.openExternal(SITE_URL));
  handler('profile-image', () => client && snapshot?.profileSha ? client.profileImage(snapshot.profileSha) : null);
  handler('open-deployment', async value => { const sha = shaSchema.parse(value); const deployment = await client?.deployment(sha); if (deployment) await shell.openExternal(deployment.url); });
  handler('close', async () => { await saving; await documentSaving; closing = true; window.close(); });
  const settingsFile = path.join(app.getPath('userData'), 'document-settings.json');
  const settingsSchema = z.object({ ko: documentOptionsSchema.optional(), en: documentOptionsSchema.optional() });
  const readSettings = async () => {
    try {
      const stored: unknown = JSON.parse(await readFile(settingsFile, 'utf8'));
      const legacy = documentOptionsSchema.safeParse(stored);
      return legacy.success ? { [legacy.data.locale]: legacy.data } : settingsSchema.parse(stored);
    } catch { return {}; }
  };
  handler('document-settings', async value => {
    const locale = z.enum(['ko', 'en']).parse(value);
    return (await readSettings())[locale] ?? null;
  });
  handler('save-document-settings', value => {
    const options = documentOptionsSchema.parse(value);
    const write = async () => {
      const settings = { ...await readSettings(), [options.locale]: options };
      await mkdir(app.getPath('userData'), { recursive: true });
      await writeFile(`${settingsFile}.tmp`, JSON.stringify(settings), { encoding: 'utf8', mode: 0o600 });
      await rename(`${settingsFile}.tmp`, settingsFile);
    };
    const pending = documentSaving.then(write, write); documentSaving = pending; return pending;
  });
  handler('export-document', async (rawContent, rawOptions) => {
    if (exporting) throw new Error('이미 문서를 만들고 있어요.');
    const content = contentSchema.parse(rawContent);
    const options = documentOptionsSchema.parse(rawOptions);
    if (!options.name.trim()) throw new Error('이름을 입력해 주세요.');
    const filename = `${options.name}_${options.title}.pdf`.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    const selected = await dialog.showSaveDialog(window, { title: 'PDF 저장', defaultPath: path.join(app.getPath('documents'), filename), filters: [{ name: 'PDF 문서', extensions: ['pdf'] }] });
    if (selected.canceled || !selected.filePath) return null;
    exporting = true;
    try {
      let image: string | undefined;
      if (options.includePhoto) {
        if (content.profileImage) { validatePng(content.profileImage); image = `data:image/png;base64,${content.profileImage}`; }
        else if (client && snapshot?.profileSha) image = await client.profileImage(snapshot.profileSha);
        else throw new Error('사진을 포함하려면 GitHub에 연결하거나 프로필 사진을 선택해 주세요.');
      }
      const output = await renderPdf(content, options, image);
      await writeFile(selected.filePath, output);
      lastDocument = selected.filePath;
      return selected.filePath;
    } finally { exporting = false; }
  });
  handler('reveal-document', () => { if (lastDocument) shell.showItemInFolder(lastDocument); });
  await window.loadFile(rendererPath);
  if (!process.env.STUDIO_TEST_USER_DATA) window.show();
  else { window.setOpacity(0); window.showInactive(); }
});
app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
app.on('window-all-closed', () => app.quit());
