import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Briefcase as BriefcaseBusiness, Check, CheckCircle2, ChevronRight, UploadCloud as CloudUpload, ExternalLink, FileText, Github, Layers3, Link2, Loader2, LogOut, Plus, RefreshCw, Save, Sparkles, Trash2, UserRound, X } from 'lucide-react';
import { COMPANIES, makeChanges, mergeContent, parseContent, type ApiResult, type Company, type Content, type Deployment, type Draft, type Locale, type Snapshot, type State } from '../shared/model';
import { RichText } from './RichText';
import { DocumentPage } from './DocumentPage';

type Page = 'profile' | 'career' | 'projects' | 'skills' | 'links' | 'documents';
const pages = [
  { id: 'profile', title: '소개', caption: '나를 소개하는 이야기', icon: UserRound },
  { id: 'career', title: '경력', caption: '함께 만든 경험', icon: BriefcaseBusiness },
  { id: 'projects', title: '프로젝트', caption: '보여주고 싶은 작업', icon: Layers3 },
  { id: 'skills', title: '기술 스택', caption: '나의 도구들', icon: Sparkles },
  { id: 'links', title: '링크', caption: '연결되는 곳', icon: Link2 },
  { id: 'documents', title: '문서 만들기', caption: '이력서와 경력기술서', icon: FileText },
] as const;
async function unwrap<T>(result: Promise<ApiResult<T>>): Promise<T> { const response = await result; if (!response.ok) throw new Error(response.error); return response.value; }
export function Field({ label, value, onChange, placeholder, wide = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; wide?: boolean }) {
  return <label className={`field ${wide ? 'wide' : ''}`}><span>{label}</span><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>;
}
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return <div className="modal-shade"><section role="dialog" aria-modal="true" aria-label={title} className="modal"><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="닫기" onClick={onClose}><X size={18} /></button></div>{children}</section></div>;
}

export function Studio() {
  const [state, setState] = useState<State>({ user: null, snapshot: null, draft: null, lastPublished: null });
  const [base, setBase] = useState<Snapshot | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [profilePhoto, setProfilePhoto] = useState('');
  const [page, setPage] = useState<Page>('profile');
  const [locale, setLocale] = useState<Locale>('ko');
  const [company, setCompany] = useState<Company>('111percent');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [edited, setEdited] = useState(false);
  const [review, setReview] = useState(false);
  const [message, setMessage] = useState('content: 포트폴리오 콘텐츠 업데이트');
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [incoming, setIncoming] = useState<{ snapshot: Snapshot; conflicts: string[] } | null>(null);
  const latest = useRef({ content, base, edited });
  latest.current = { content, base, edited };
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  let changes: ReturnType<typeof makeChanges> = [];
  let validation = '';
  if (content && base) { try { changes = makeChanges(base, content); } catch (error) { validation = error instanceof Error ? error.message : '입력 내용을 확인해 주세요.'; } }
  const createDraft = (source: Content, snapshot: Snapshot): Draft => ({ version: 1, base: snapshot, content: source, savedAt: new Date().toISOString() });
  const install = (next: State) => {
    setState(next); setBase(next.draft?.base || next.snapshot);
    setContent(next.draft?.content || (next.snapshot ? parseContent(next.snapshot) : null));
    setEdited(false); setSaved(next.draft?.savedAt || '');
  };
  useEffect(() => { unwrap(window.studio.state()).then(install).catch(error => setError(error.message)); }, []);
  useEffect(() => {
    let active = true;
    if (!state.user) { setProfilePhoto(''); return; }
    void unwrap(window.studio.profileImage()).then(value => { if (active) setProfilePhoto(value || ''); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, [state.user?.login, base?.profileSha]);
  const save = (nextContent: Content, nextBase: Snapshot) => {
    const pending = saveQueue.current.then(() => unwrap(window.studio.saveDraft(createDraft(nextContent, nextBase))));
    saveQueue.current = pending.catch(() => undefined);
    return pending;
  };
  useEffect(() => {
    if (!content || !base || !edited || busy) return;
    const timeout = setTimeout(() => { save(content, base).then(setSaved).catch(error => setError(error.message)); }, 550);
    return () => clearTimeout(timeout);
  }, [content, base, edited, busy]);
  useEffect(() => window.studio.onCloseRequested(async () => {
    try {
      const current = latest.current;
      if (current.edited && current.content && current.base) await save(current.content, current.base);
      await saveQueue.current;
      await unwrap(window.studio.close());
    } catch (error) { setError(error instanceof Error ? error.message : '초안을 저장하지 못했어요.'); }
  }), []);
  useEffect(() => {
    if (!state.lastPublished || !state.user) return;
    let active = true;
    const check = () => unwrap(window.studio.deployment(state.lastPublished!)).then(result => { if (active) setDeployment(result); }).catch(() => undefined);
    void check(); const timer = setInterval(check, 10_000);
    return () => { active = false; clearInterval(timer); };
  }, [state.lastPublished, state.user]);
  const act = async (label: string, operation: () => Promise<void>) => { setBusy(label); setError(''); try { await operation(); } catch (error) { setError(error instanceof Error ? error.message : '작업에 실패했어요.'); } finally { setBusy(''); } };
  const update = (mutate: (draft: Content) => void) => { if (busy) return; setContent(previous => { const next = structuredClone(previous!); mutate(next); return next; }); setEdited(true); };
  const updateLocale = (mutate: (draft: Content['languages']['en']) => void) => update(draft => mutate(draft.languages[locale]));
  const refresh = () => act('최신 내용을 불러오는 중', async () => {
    if (content && base && edited) await save(content, base);
    const next = await unwrap(window.studio.refresh()); setState(next);
    if (!next.snapshot) return;
    if (content && base && changes.length) {
      const merged = mergeContent(parseContent(base), content, parseContent(next.snapshot));
      if (merged.conflicts.length) { setIncoming({ snapshot: next.snapshot, conflicts: merged.conflicts }); return; }
      setBase(next.snapshot); setContent(merged.content); setEdited(true);
      setSaved(await save(merged.content, next.snapshot));
    } else {
      const fresh = parseContent(next.snapshot);
      setBase(next.snapshot); setContent(fresh); setEdited(false);
      setSaved(await save(fresh, next.snapshot));
    }
  });
  const resolveConflict = (prefer: 'local' | 'remote') => {
    if (!incoming || !base || !content) return;
    const merged = mergeContent(parseContent(base), content, parseContent(incoming.snapshot), prefer);
    setBase(incoming.snapshot); setContent(merged.content); setEdited(true); setIncoming(null);
  };
  const publish = () => act('GitHub에 게시하는 중', async () => {
    if (!content || !base) return;
    await saveQueue.current;
    const result = await unwrap(window.studio.publish(createDraft(content, base), message));
    setState(previous => ({ ...previous, snapshot: result.snapshot, draft: null, lastPublished: result.sha }));
    setBase(result.snapshot); setContent(parseContent(result.snapshot)); setEdited(false); setSaved(''); setReview(false); setDeployment(null);
  });
  const imageUrl = content?.profileImage ? `data:image/png;base64,${content.profileImage}` : profilePhoto;
  const selectedPage = pages.find(item => item.id === page)!;
  const localized = content?.languages[locale];

  return <div className="studio">
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol">a<span>.</span></span><div>Achieveone<span>STUDIO</span></div></div>
      <div className="workspace-label">MY PORTFOLIO</div>
      <nav aria-label="콘텐츠 메뉴">{pages.map(item => <button key={item.id} className={page === item.id ? 'selected' : ''} onClick={() => setPage(item.id)} disabled={!content}><item.icon size={19} /><span>{item.title}</span>{page === item.id && <ChevronRight size={15} />}</button>)}</nav>
      <div className="sidebar-bottom"><div className="site-card"><span className="status-dot" /> somiri.dev<button className="icon-button" aria-label="사이트 열기" onClick={() => void unwrap(window.studio.openSite()).catch(error => setError(error.message))}><ExternalLink size={15} /></button></div><p>이야기를 정리하고,<br />다음 기회를 준비하세요.</p>
        {state.user && <div className="account"><img src={state.user.avatar} alt="" /><span>{state.user.login}<small>GitHub 연결됨</small></span><button className="icon-button" title="런처에서 로그아웃" onClick={() => void act('연결을 해제하는 중', async () => { if (content && base && edited) await save(content, base); await unwrap(window.studio.logout()); setState(previous => ({ ...previous, user: null })); })}><LogOut size={15} /></button></div>}
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">포트폴리오 <ChevronRight size={14} /> <strong>{selectedPage.title}</strong></div><div className="top-actions">
        {content && <span className="saved-state">{busy ? <Loader2 size={14} className="spin" /> : <Check size={14} />}{busy || (saved ? `초안 저장됨 · ${new Date(saved).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '최신 콘텐츠')}</span>}
        {!state.user ? <button className="primary" disabled={!!busy} onClick={() => void act('GitHub에 연결하는 중', async () => install(await unwrap(window.studio.login())))}><Github size={17} /> GitHub 로그인</button> : <><button className="secondary icon-text" disabled={!!busy} onClick={() => void refresh()}><RefreshCw size={16} /> 최신 내용</button><button className="primary" disabled={!!busy || !changes.length || !!validation} onClick={() => setReview(true)}><CloudUpload size={17} /> 게시하기{changes.length > 0 && <span className="count">{changes.length}</span>}</button></>}
      </div></header>
      {error && <div className="notice error" role="alert">{error}<button aria-label="알림 닫기" className="icon-button" onClick={() => setError('')}><X size={15} /></button></div>}
      {validation && <div className="notice" role="status">{validation}</div>}
      {state.lastPublished && <div className="notice success"><CheckCircle2 size={17} />{deployment?.conclusion === 'success' ? '사이트 배포가 완료됐어요.' : deployment?.conclusion && deployment.conclusion !== 'success' ? '배포 결과를 확인해 주세요. 콘텐츠는 GitHub에 저장됐어요.' : 'GitHub에 저장됐어요. 사이트 배포를 진행하고 있어요.'}<button className="text-button" onClick={() => void unwrap(window.studio.openDeployment(state.lastPublished!))}>배포 확인 <ExternalLink size={13} /></button></div>}
      {!content || !localized ? <main className="welcome"><div className="welcome-graphic"><span>a.</span><div className="welcome-pill"><Github size={16} /> YOUR STORY, CONNECTED</div></div><div className="eyebrow">YOUR PORTFOLIO WORKSPACE</div><h1>당신의 이야기를,<br /><em>한곳에서.</em></h1><p>소개부터 경력과 프로젝트까지.<br />파일을 찾지 않고 바로 편집하고 게시하세요.</p><button className="primary large" disabled={!!busy} onClick={() => void act('GitHub에 연결하는 중', async () => install(await unwrap(window.studio.login())))}>{busy ? <Loader2 size={19} className="spin" /> : <Github size={19} />} {busy || 'GitHub로 시작하기'}</button><small>achieveonepark 계정 · somiri.dev</small></main> : <main className="editor-area">
        <div className="page-heading"><div><div className="eyebrow">{selectedPage.caption}</div><h1>{selectedPage.title}<span>.</span></h1></div><div className="language-switch" role="group" aria-label="편집 언어"><button className={locale === 'ko' ? 'active' : ''} onClick={() => setLocale('ko')}>한국어</button><button className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>English</button></div></div>
        {page === 'documents' ? <DocumentPage key={locale} content={content} locale={locale} imageUrl={imageUrl} onError={setError} /> : <div className="editor-columns"><section className="form-column"><fieldset disabled={!!busy}>
          {page === 'profile' && <>
            <div className="panel"><div className="panel-title"><h2>기본 정보</h2><span>프로필 카드에 표시돼요</span></div><div className="photo-row"><img className="profile-photo" src={imageUrl} alt="프로필 사진" /><div><button className="secondary" onClick={() => void act('사진을 불러오는 중', async () => { const image = await unwrap(window.studio.chooseImage()); if (image) update(draft => { draft.profileImage = image; }); })}>사진 변경</button><small>PNG · 최대 5MB</small></div></div><div className="field-grid"><Field label="이름" value={localized.profile.name} onChange={value => updateLocale(draft => { draft.profile.name = value; })} /><Field label="직무 / 경력" value={localized.profile.career} onChange={value => updateLocale(draft => { draft.profile.career = value; })} /><Field label="섹션 제목" value={localized.profile.title} onChange={value => updateLocale(draft => { draft.profile.title = value; })} /><Field label="프로필 부제" value={localized.profile.subtitle} onChange={value => updateLocale(draft => { draft.profile.subtitle = value; })} /></div></div>
            <div className="panel"><div className="panel-title"><h2>소개글</h2><span>경험과 강점을 이야기해 주세요</span></div><RichText key={`profile-${locale}`} readOnly={!!busy} content={localized.profile.body} onChange={value => updateLocale(draft => { draft.profile.body = value; })} /></div>
            <div className="panel"><div className="panel-title"><h2>공통 표시 이름</h2><span>링크 카드에 표시돼요</span></div><div className="field-grid"><Field label="표시 이름" value={content.branding.name} onChange={value => update(draft => { draft.branding.name = value; })} /><Field label="직무" value={content.branding.role} onChange={value => update(draft => { draft.branding.role = value; })} /></div></div>
          </>}
          {page === 'career' && <>
            <div className="company-tabs" role="group" aria-label="편집할 회사">{COMPANIES.map(id => <button key={id} className={company === id ? 'active' : ''} onClick={() => setCompany(id)}>{localized.companies[id].title}</button>)}</div>
            <div className="panel"><div className="panel-title"><h2>근무 정보</h2><span>회사별 이력을 정리하세요</span></div><div className="field-grid"><Field label="회사명" value={localized.companies[company].title} onChange={value => updateLocale(draft => { draft.companies[company].title = value; })} /><Field label="근무 기간" value={localized.companies[company].period} onChange={value => updateLocale(draft => { draft.companies[company].period = value; })} /><Field label="회사 웹사이트" value={localized.companies[company].website} onChange={value => updateLocale(draft => { draft.companies[company].website = value; })} /><Field label="사용 기술" value={localized.companies[company].technologies} onChange={value => updateLocale(draft => { draft.companies[company].technologies = value; })} /></div></div>
            <div className="panel"><div className="panel-title"><h2>주요 업무와 성과</h2><span>제목과 목록으로 구조를 잡아 주세요</span></div><RichText key={`career-${locale}-${company}`} readOnly={!!busy} content={localized.companies[company].body} onChange={value => updateLocale(draft => { draft.companies[company].body = value; })} /></div>
            <div className="panel"><Field label="경력 섹션 제목" value={localized.experienceTitle} onChange={value => updateLocale(draft => { draft.experienceTitle = value; })} /></div>
          </>}
          {page === 'projects' && <>
            <div className="panel"><Field label="프로젝트 섹션 제목" value={localized.projectsTitle} onChange={value => updateLocale(draft => { draft.projectsTitle = value; })} /></div>
            {localized.projects.map((project, index) => <div className="panel" key={`${locale}-${project.id}`}><div className="panel-title"><h2><span className="number">{String(index + 1).padStart(2, '0')}</span> {project.title || '새 프로젝트'}</h2><div className="reorder"><button className="icon-button" aria-label="프로젝트 위로" disabled={index === 0} onClick={() => updateLocale(draft => { [draft.projects[index - 1], draft.projects[index]] = [draft.projects[index], draft.projects[index - 1]]; })}><ArrowUp size={15} /></button><button className="icon-button" aria-label="프로젝트 아래로" disabled={index === localized.projects.length - 1} onClick={() => updateLocale(draft => { [draft.projects[index + 1], draft.projects[index]] = [draft.projects[index], draft.projects[index + 1]]; })}><ArrowDown size={15} /></button><button className="icon-button danger" aria-label="프로젝트 삭제" onClick={() => updateLocale(draft => { draft.projects.splice(index, 1); })}><Trash2 size={15} /></button></div></div><div className="field-grid"><Field label="프로젝트 이름" value={project.title} onChange={value => updateLocale(draft => { draft.projects[index].title = value; })} wide /><Field label="진행 기간" value={project.period} onChange={value => updateLocale(draft => { draft.projects[index].period = value; })} /><Field label="사용 기술" value={project.technologies} onChange={value => updateLocale(draft => { draft.projects[index].technologies = value; })} /><Field label="YouTube 영상 주소" value={project.video} onChange={value => updateLocale(draft => { draft.projects[index].video = value; })} wide /></div><label className="field"><span>프로젝트 설명 / 성과</span><RichText readOnly={!!busy} content={project.body} onChange={value => updateLocale(draft => { draft.projects[index].body = value; })} /></label></div>)}
            <button className="add-button" onClick={() => updateLocale(draft => { draft.projects.push({ id: crypto.randomUUID(), title: '', period: '', technologies: '', video: '', body: '' }); })}><Plus size={18} /> 프로젝트 추가</button>
          </>}
          {page === 'skills' && <>
            <div className="panel"><Field label="기술 스택 섹션 제목" value={localized.skillsTitle} onChange={value => updateLocale(draft => { draft.skillsTitle = value; })} /></div>
            <div className="panel"><div className="panel-title"><h2>사용 기술</h2><span>한글·영문에 함께 적용돼요</span></div>{content.techStack.map((group, index) => <div className="stack-group" key={index}><div className="field-grid"><Field label="분류" value={group.key} onChange={value => update(draft => { draft.techStack[index].key = value; })} /><label className="field"><span>기술 목록</span><input value={group.values.join(', ')} onChange={event => update(draft => { draft.techStack[index].values = event.target.value.split(',').map(value => value.trim()); })} placeholder="Unity, C#, .NET" /></label></div><button className="icon-button danger" aria-label="기술 분류 삭제" onClick={() => update(draft => { draft.techStack.splice(index, 1); })}><Trash2 size={15} /></button></div>)}<button className="text-button" onClick={() => update(draft => { draft.techStack.push({ key: 'tools', values: [] }); })}><Plus size={15} /> 분류 추가</button></div>
          </>}
          {page === 'links' && <>
            <div className="panel"><Field label="링크 섹션 제목" value={localized.links.title} onChange={value => updateLocale(draft => { draft.links.title = value; })} /></div><div className="panel"><div className="panel-title"><h2>연락과 연결</h2><span>Email 항목에는 이메일 주소를 입력해 주세요</span></div>{localized.links.items.map((link, index) => <div className="stack-group" key={index}><div className="field-grid"><Field label="링크 이름" value={link.label} onChange={value => updateLocale(draft => { draft.links.items[index].label = value; })} /><Field label={link.label === 'Email' ? '이메일' : 'https 주소'} value={link.value} onChange={value => updateLocale(draft => { draft.links.items[index].value = value; })} /></div><button className="icon-button danger" aria-label="링크 삭제" onClick={() => updateLocale(draft => { draft.links.items.splice(index, 1); })}><Trash2 size={15} /></button></div>)}<button className="text-button" onClick={() => updateLocale(draft => { draft.links.items.push({ label: 'Website', value: '' }); })}><Plus size={15} /> 링크 추가</button></div>
          </>}
        </fieldset></section><aside className="preview-column"><div className="preview-heading"><span className="status-dot" /> 콘텐츠 미리보기<span>{locale === 'ko' ? 'KO' : 'EN'}</span></div><div className="content-preview">
          {page === 'profile' && <><img className="preview-photo" src={imageUrl} alt="" /><div className="eyebrow">{localized.profile.subtitle}</div><h2>{localized.profile.name}</h2><p className="preview-role">{localized.profile.career}</p><RichText content={localized.profile.body} readOnly /></>}
          {page === 'career' && <><div className="eyebrow">EXPERIENCE</div><h2>{localized.companies[company].title}</h2><p className="preview-role">{localized.companies[company].period}</p><p className="tag-list">{localized.companies[company].technologies.split(',').map(value => <span key={value}>{value.trim()}</span>)}</p><RichText content={localized.companies[company].body} readOnly /></>}
          {page === 'projects' && <><div className="eyebrow">SELECTED WORK</div><h2>{localized.projectsTitle}</h2>{localized.projects.map(project => <div className="preview-project" key={project.id}><span>{project.period}</span><h3>{project.title || '새 프로젝트'}</h3><p>{project.technologies}</p><RichText content={project.body} readOnly /></div>)}</>}
          {page === 'skills' && <><div className="eyebrow">MY TOOLKIT</div><h2>{localized.skillsTitle}</h2>{content.techStack.map((group, index) => <div className="preview-project" key={index}><h3>{group.key}</h3><div className="tag-list">{group.values.map((value, index) => <span key={index}>{value}</span>)}</div></div>)}</>}
          {page === 'links' && <><div className="eyebrow">STAY CONNECTED</div><h2>{content.branding.name}</h2><p className="preview-role">{content.branding.role}</p>{localized.links.items.map((link, index) => <div className="preview-link" key={index}><span>{link.label}</span><p>{link.value}</p><ExternalLink size={15} /></div>)}</>}
        </div><div className="preview-footnote">작성 중인 콘텐츠 미리보기예요.<br />실제 사이트 디자인은 게시 후 확인할 수 있어요.</div></aside></div>}
      </main>}
      {content && <footer className="workspace-footer"><span><Save size={13} /> 초안은 이 PC에 저장돼요</span><span>{changes.length ? `${changes.length}개 항목 변경` : '게시한 내용과 동일해요'}{page !== 'documents' && <button className="text-button" onClick={() => void act('초안을 저장하는 중', async () => { if (content && base) setSaved(await save(content, base)); })} disabled={!!busy}>지금 저장</button>}</span></footer>}
    </div>
    {review && <Modal title="변경사항 게시" onClose={() => !busy && setReview(false)}><p className="modal-description">아래 항목을 GitHub에 저장하고 사이트 배포를 시작해요.</p><div className="change-list">{changes.map(change => <div key={change.path}><CheckCircle2 size={17} /><span>{change.label}</span></div>)}</div><Field label="변경 기록" value={message} onChange={setMessage} /><div className="modal-note"><Github size={16} /> achieveonepark · main</div><div className="modal-actions"><button className="secondary" disabled={!!busy} onClick={() => setReview(false)}>계속 편집</button><button className="primary" disabled={!!busy || !!validation} onClick={() => void publish()}>{busy ? <Loader2 className="spin" size={17} /> : <CloudUpload size={17} />}{busy || '게시하기'}</button></div></Modal>}
    {incoming && <Modal title="두 곳에서 수정한 내용이 있어요" onClose={() => setIncoming(null)}><p className="modal-description">서로 다른 항목은 자동으로 합쳤어요. 겹친 {incoming.conflicts.length}개 항목은 어떤 내용을 사용할지 선택해 주세요.</p><div className="modal-actions"><button className="secondary" onClick={() => resolveConflict('remote')}>겹친 항목은 GitHub 내용 사용</button><button className="primary" onClick={() => resolveConflict('local')}>겹친 항목은 내 초안 사용</button></div></Modal>}
  </div>;
}
