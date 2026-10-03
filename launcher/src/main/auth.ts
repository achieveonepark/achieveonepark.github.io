import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ACCOUNT } from '../shared/model';

const gitPath = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'cmd', 'git.exe');
export function runGit(args: string[], input?: string, interactive = false): Promise<string> {
  const env: NodeJS.ProcessEnv = { ...process.env, GCM_INTERACTIVE: interactive ? 'always' : 'never' };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  return new Promise((resolve, reject) => {
    const child = execFile(existsSync(gitPath) ? gitPath : 'git', args, { windowsHide: true, env, timeout: interactive ? 180_000 : 15_000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) reject(new Error('GitHub 로그인에 연결하지 못했어요. Windows용 Git 설치와 네트워크를 확인해 주세요.'));
      else resolve(stdout);
    });
    if (input) child.stdin?.end(input);
    else child.stdin?.end();
  });
}
export async function loginToken(interactive: boolean): Promise<string> {
  const read = async () => {
    const credential = await runGit(['credential-manager', 'get', '--no-ui'], `protocol=https\nhost=github.com\nusername=${ACCOUNT}\n\n`);
    const lines = Object.fromEntries(credential.trim().split(/\r?\n/).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
    if (lines.username?.toLowerCase() !== ACCOUNT || !lines.password) throw new Error('achieveonepark 계정의 로그인이 필요해요.');
    return lines.password as string;
  };
  try { return await read(); }
  catch (error) {
    if (!interactive) throw error;
    await runGit(['credential-manager', 'github', 'login', '--username', ACCOUNT, '--browser'], undefined, true);
    return read();
  }
}
