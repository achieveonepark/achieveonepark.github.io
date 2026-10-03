import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { detectLanguage, LANGUAGE_KEY, readSavedLanguage, type Language } from './language';

const messages = {
    sections: ['Portfolio sections', '포트폴리오 섹션'],
    exploreOS: ['Explore OS', 'OS 구경하기'],
    exploreOSMode: ['Explore OS mode', 'OS 모드로 구경하기'],
    loadingOS: ['Loading OS…', 'OS 불러오는 중…'],
    photo: ['profile photo', '프로필 사진'],
    exploreProfile: ['Explore my profile', '소개 펼치기'],
    scrollExplore: ['Scroll to explore', '아래로 스크롤해서 펼쳐보기'],
    company: ['Select a company', '회사 선택'],
    companyHint: ['Tap a company to explore my work', '탭해서 회사별 이야기 보기'],
    video: ['project video', '프로젝트 영상'],
    youtube: ['Watch on YouTube', 'YouTube에서 보기'],
    project: ['Select a project', '프로젝트 선택'],
    projectHint: ['Select a project and play its video on the TV.', '프로젝트를 선택하고 TV에서 영상을 재생해 보세요.'],
    linksTagline: ['Code, writing, and new conversations.', '코드와 기록, 그리고 새로운 대화.'],
} as const;
type MessageKey = keyof typeof messages;
const Context = createContext<{
    language: Language;
    selectLanguage: (language: Language) => void;
    t: (key: MessageKey) => string;
} | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<Language>(() => readSavedLanguage() ?? 'en');
    const manuallySelected = useRef(readSavedLanguage() !== null);
    useEffect(() => {
        if (manuallySelected.current) return;
        const controller = new AbortController();
        let active = true;
        const timeout = window.setTimeout(() => controller.abort(), 3000);
        void detectLanguage(controller.signal).then(detected => {
            if (active && !manuallySelected.current) setLanguage(detected);
            window.clearTimeout(timeout);
        });
        return () => { active = false; controller.abort(); window.clearTimeout(timeout); };
    }, []);
    useEffect(() => { document.documentElement.lang = language; }, [language]);
    const selectLanguage = (next: Language) => {
        manuallySelected.current = true;
        setLanguage(next);
        try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Keep the current selection when storage is unavailable. */ }
    };
    return <Context.Provider value={{ language, selectLanguage, t: key => messages[key][language === 'ko' ? 1 : 0] }}>{children}</Context.Provider>;
};

export function useLanguage() {
    const context = useContext(Context);
    if (!context) throw new Error('useLanguage requires LanguageProvider');
    return context;
}
