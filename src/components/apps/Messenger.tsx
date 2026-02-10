import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, MessageCircle, Phone, Search, Send, Video } from 'lucide-react';

type Contact = {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  color: string;
};

type ChatMessage = {
  id: string;
  contactId: string;
  sender: 'me' | 'contact';
  text: string;
  timestamp: number;
};

type PersistedState = {
  messages: ChatMessage[];
  unread: Record<string, number>;
};

const STORAGE_KEY = 'achieveone-messenger-v3';
const MESSENGER_FONT_FAMILY = "'Rajdhani', sans-serif";

const CONTACTS: Contact[] = [
  { id: 'career', name: '커리어 요약', role: '유니티 개발 8년차', status: 'online', color: 'from-emerald-400 to-cyan-500' },
  { id: 'percent111', name: '111퍼센트', role: '코어 모듈 · DevOps (2023.10-현재)', status: 'online', color: 'from-sky-400 to-blue-500' },
  { id: 'snowpipe', name: '스노우파이프', role: '신규 게임 프로젝트 (2023.06-2023.10)', status: 'away', color: 'from-teal-400 to-emerald-500' },
  { id: 'gridinc', name: '그리드', role: '메타버스 크로스플랫폼 (2022.05-2023.06)', status: 'away', color: 'from-amber-400 to-orange-500' },
  { id: 'snowballs', name: '스노우볼스', role: '데미갓 · 레벨에디터 (2021.09-2022.04)', status: 'offline', color: 'from-violet-400 to-fuchsia-500' },
  { id: 'dalcomsoft', name: '달콤소프트', role: '리듬게임 · SDK 연동 (2018.12-2021.08)', status: 'offline', color: 'from-indigo-400 to-purple-500' },
];

const now = Date.now();
const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 'c1', contactId: 'career', sender: 'contact', text: '이름은 박성일, 유니티 개발 경력은 8년차입니다.', timestamp: now - 1000 * 60 * 360 },
  { id: 'c2', contactId: 'career', sender: 'me', text: '주력 스택은 C#, Unity이고 필요 시 Java/Swift 네이티브 연동도 진행했습니다.', timestamp: now - 1000 * 60 * 355 },
  { id: 'c3', contactId: 'career', sender: 'me', text: '협업 중 불편한 지점을 찾아 Tool Development로 개선하는 걸 가장 좋아합니다.', timestamp: now - 1000 * 60 * 350 },

  { id: 'p1', contactId: 'percent111', sender: 'contact', text: 'Table, IAP, Login, Save/Load 등 핵심 모듈과 프레임워크를 구축했습니다.', timestamp: now - 1000 * 60 * 130 },
  { id: 'p2', contactId: 'percent111', sender: 'me', text: 'Code Generator를 포함한 개발 편의 툴과 빌드 대응 자동화를 맡아 생산성을 높였습니다.', timestamp: now - 1000 * 60 * 124 },
  { id: 'p3', contactId: 'percent111', sender: 'contact', text: 'Firebase Cloud Functions + Auth 기반 커스텀 인증, Firestore/Storage 연동도 완료했습니다.', timestamp: now - 1000 * 60 * 118 },
  { id: 'p4', contactId: 'percent111', sender: 'me', text: 'Photon Quantum3 매치메이킹/세션 관리 샘플까지 R&D로 정리해두었습니다.', timestamp: now - 1000 * 60 * 112 },

  { id: 'sp1', contactId: 'snowpipe', sender: 'contact', text: '2023.06~2023.10 동안 신규 게임 프로젝트를 C#/Unity/Git 기반으로 개발했습니다.', timestamp: now - 1000 * 60 * 170 },

  { id: 'g1', contactId: 'gridinc', sender: 'contact', text: '메타버스 앱을 Android/iOS/Win/Mac 크로스플랫폼으로 런칭하고 유지보수했습니다.', timestamp: now - 1000 * 60 * 230 },
  { id: 'g2', contactId: 'gridinc', sender: 'me', text: 'Desktop 3D WebView, AVPro Video 스트리밍, 캐릭터 동기화를 담당했습니다.', timestamp: now - 1000 * 60 * 224 },
  { id: 'g3', contactId: 'gridinc', sender: 'me', text: 'Deep-Link 기반 PC/Mac 로그인과 소셜 로그인 흐름을 구현했고, 아트팀 파이프라인 효율화도 진행했습니다.', timestamp: now - 1000 * 60 * 218 },

  { id: 's1', contactId: 'snowballs', sender: 'contact', text: "'기사 키우기 : 데미갓' 런칭 및 라이브 서비스를 담당했습니다.", timestamp: now - 1000 * 60 * 280 },
  { id: 's2', contactId: 'snowballs', sender: 'me', text: '퍼즐 프로젝트에서는 스테이지 제작 툴(Level Editor)을 개발했고 Android/iOS 빌드 파이프라인도 관리했습니다.', timestamp: now - 1000 * 60 * 274 },

  { id: 'd1', contactId: 'dalcomsoft', sender: 'contact', text: 'SuperStar YG, SuperStar KangDaniel 신규 런칭에 참여했습니다.', timestamp: now - 1000 * 60 * 320 },
  { id: 'd2', contactId: 'dalcomsoft', sender: 'me', text: 'SuperStar BTS/JYP 라이브 유지보수와 AdManager, Tapjoy, AudienceNetwork, Firebase 연동을 맡았습니다.', timestamp: now - 1000 * 60 * 314 },
  { id: 'd3', contactId: 'dalcomsoft', sender: 'me', text: '인게임 UI 폴리싱과 콘텐츠 구현 과정에서 Java/Obj-C 네이티브 작업도 수행했습니다.', timestamp: now - 1000 * 60 * 308 },
];

const INITIAL_UNREAD: Record<string, number> = { percent111: 1, career: 1 };

const formatTime = (value: number) =>
  new Date(value).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

const statusTone: Record<Contact['status'], string> = {
  online: 'bg-emerald-400',
  away: 'bg-amber-400',
  offline: 'bg-slate-500',
};

const statusLabel: Record<Contact['status'], string> = {
  online: '온라인',
  away: '자리 비움',
  offline: '오프라인',
};

const replyTemplates = [
  '좋습니다. 커리어 스토리 흐름에 맞게 정리해서 반영할게요.',
  '이 내용은 포트폴리오 핵심 강점으로 넣어도 좋겠습니다.',
  '기술 스택과 성과 중심으로 더 간결하게 다듬어볼게요.',
  '프로젝트 맥락과 기여도를 함께 보여주면 설득력이 더 높아집니다.',
  '협업/자동화 경험을 함께 강조하면 개발자 포지션에 강하게 어필됩니다.',
];

export const Messenger: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [unread, setUnread] = useState<Record<string, number>>(INITIAL_UNREAD);
  const [selectedContactId, setSelectedContactId] = useState(CONTACTS[0].id);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [typingContactId, setTypingContactId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedState;
      if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
      if (parsed.unread && typeof parsed.unread === 'object') setUnread(parsed.unread);
    } catch {
      // Ignore invalid persisted state.
    }
  }, []);

  useEffect(() => {
    const payload: PersistedState = { messages, unread };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [messages, unread]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CONTACTS;
    return CONTACTS.filter(contact =>
      contact.name.toLowerCase().includes(q) || contact.role.toLowerCase().includes(q),
    );
  }, [search]);

  const selectedContact = CONTACTS.find(contact => contact.id === selectedContactId) || CONTACTS[0];

  const conversation = useMemo(
    () => messages.filter(message => message.contactId === selectedContact.id).sort((a, b) => a.timestamp - b.timestamp),
    [messages, selectedContact.id],
  );

  useEffect(() => {
    if (unread[selectedContact.id]) {
      setUnread(prev => ({ ...prev, [selectedContact.id]: 0 }));
    }
  }, [selectedContact.id, unread]);

  useEffect(() => {
    viewportRef.current?.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
  }, [conversation.length, typingContactId]);

  const buildReply = (contact: Contact, text: string) => {
    const normalized = text.toLowerCase();
    if (normalized.includes('유니티') || normalized.includes('unity')) return '유니티 기반 PC/모바일 개발과 런칭 경험을 중심으로 정리해볼게요.';
    if (normalized.includes('툴') || normalized.includes('자동화') || normalized.includes('tool')) return 'Code Generator, Level Editor, 빌드 대응 자동화 경험을 강조하면 좋겠습니다.';
    if (normalized.includes('파이어베이스') || normalized.includes('firebase')) return 'Cloud Functions + Auth 커스텀 인증과 Firestore/Storage 연동 경험으로 연결해둘게요.';
    if (normalized.includes('메타버스') || normalized.includes('크로스플랫폼')) return '그리드 경력에서 Android/iOS/Win/Mac 멀티플랫폼 런칭 사례를 같이 넣겠습니다.';
    if (normalized.includes('sdk') || normalized.includes('광고')) return '달콤소프트에서 Tapjoy, AudienceNetwork 등 SDK 연동 경험이 잘 어울립니다.';
    if (normalized.includes('젠킨스') || normalized.includes('빌드')) return '111퍼센트·스노우볼스에서의 Android/iOS 빌드 파이프라인 운영 경험으로 정리하겠습니다.';
    if (normalized.includes('프로젝트') || normalized.includes('포트폴리오')) return 'WoW 카피 포트폴리오, Pokemon Tower Defense, KOCCA 게임잼 수상작 흐름으로 담아보죠.';
    return replyTemplates[(text.length + contact.name.length) % replyTemplates.length];
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;

    const outgoing: ChatMessage = {
      id: `msg-${Date.now()}`,
      contactId: selectedContact.id,
      sender: 'me',
      text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, outgoing]);
    setDraft('');
    setTypingContactId(selectedContact.id);

    window.setTimeout(() => {
      const response: ChatMessage = {
        id: `msg-${Date.now()}-reply`,
        contactId: selectedContact.id,
        sender: 'contact',
        text: buildReply(selectedContact, text),
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, response]);
      setTypingContactId(current => (current === selectedContact.id ? null : current));
    }, 1000 + Math.round(Math.random() * 800));
  };

  const selectContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setUnread(prev => ({ ...prev, [contactId]: 0 }));
    setMobileView('chat');
  };

  const latestByContact = useMemo(() => {
    const map: Record<string, ChatMessage | undefined> = {};
    for (const contact of CONTACTS) {
      map[contact.id] = messages
        .filter(message => message.contactId === contact.id)
        .sort((a, b) => b.timestamp - a.timestamp)[0];
    }
    return map;
  }, [messages]);

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 flex flex-col" style={{ fontFamily: MESSENGER_FONT_FAMILY }}>
      <div className="h-12 border-b border-cyan-500/20 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-cyan-300 text-sm tracking-[0.08em]">
          <MessageCircle size={16} />
          개발자 커리어 메신저
        </div>
        <div className="text-[11px] text-cyan-200/70">포트폴리오 데모 모드</div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <aside className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] border-r border-cyan-500/15 bg-slate-900/80 flex-col min-h-0`}>
          <div className="p-3 border-b border-cyan-500/10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300/60" />
              <input
                type="text"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="회사/기술 검색"
                className="w-full h-9 rounded-lg bg-slate-950/90 border border-cyan-500/20 pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredContacts.map(contact => {
              const last = latestByContact[contact.id];
              const isSelected = selectedContactId === contact.id;
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => selectContact(contact.id)}
                  className={`w-full text-left px-3 py-3 border-b border-cyan-500/10 hover:bg-cyan-500/10 transition-colors ${isSelected ? 'bg-cyan-500/15' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${contact.color} flex items-center justify-center text-[13px] font-bold text-slate-950`}>
                      {contact.name.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{contact.name}</span>
                        {last && <span className="text-[10px] text-slate-400">{formatTime(last.timestamp)}</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{last?.text || contact.role}</div>
                    </div>
                    {unread[contact.id] ? (
                      <span className="min-w-5 h-5 px-1 rounded-full bg-cyan-400 text-slate-950 text-[11px] font-bold flex items-center justify-center">
                        {unread[contact.id]}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 min-w-0 min-h-0 flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-cyan-950/30`}>
          <div className="h-14 px-4 border-b border-cyan-500/15 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                className="md:hidden p-1 text-cyan-300"
                onClick={() => setMobileView('list')}
                aria-label="대화 목록으로 돌아가기"
              >
                <ChevronLeft size={18} />
              </button>
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${selectedContact.color} flex items-center justify-center text-[12px] font-bold text-slate-950`}>
                {selectedContact.name.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{selectedContact.name}</div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusTone[selectedContact.status]}`} />
                  {statusLabel[selectedContact.status]}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-cyan-300/80">
              <button type="button" className="w-8 h-8 rounded-md border border-cyan-500/20 hover:bg-cyan-500/10 flex items-center justify-center"><Phone size={14} /></button>
              <button type="button" className="w-8 h-8 rounded-md border border-cyan-500/20 hover:bg-cyan-500/10 flex items-center justify-center"><Video size={14} /></button>
            </div>
          </div>

          <div ref={viewportRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {conversation.map(message => (
              <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] md:max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-[0_8px_20px_rgba(2,6,23,0.35)] ${
                    message.sender === 'me'
                      ? 'bg-cyan-400 text-slate-950 rounded-br-md'
                      : 'bg-slate-800 text-slate-100 rounded-bl-md border border-slate-700'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{message.text}</div>
                  <div className={`text-[10px] mt-1 ${message.sender === 'me' ? 'text-slate-800/80' : 'text-slate-400'}`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {typingContactId === selectedContact.id ? (
              <div className="flex items-center gap-2 text-xs text-cyan-200/80">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse [animation-delay:120ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse [animation-delay:240ms]" />
                </span>
                {selectedContact.name} 정리 중...
              </div>
            ) : null}
          </div>

          <div
            className="p-3 border-t border-cyan-500/15 bg-slate-900/80"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="커리어 관련 메시지를 입력하세요"
                className="flex-1 h-10 rounded-lg bg-slate-950/95 border border-cyan-500/25 px-3 text-sm outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="h-10 px-4 rounded-lg bg-cyan-400 text-slate-950 font-semibold text-sm hover:bg-cyan-300 transition-colors flex items-center gap-2"
              >
                <Send size={14} /> 전송
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
