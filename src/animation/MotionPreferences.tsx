import React, { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore } from 'react';

export type MotionPreference = 'system' | 'full' | 'reduced';
const STORAGE_KEY = 'achieveone-motion';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (notify: () => void) => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    query.addEventListener('change', notify);
    return () => query.removeEventListener('change', notify);
};

const readSavedPreference = (): MotionPreference => {
    try {
        const value = localStorage.getItem(STORAGE_KEY);
        if (value === 'full' || value === 'reduced') return value;
    } catch { /* System preferences still work when storage is unavailable. */ }
    return 'system';
};

const Context = createContext<{
    preference: MotionPreference;
    selectPreference: (preference: MotionPreference) => void;
    reducedMotion: boolean;
} | null>(null);

export const MotionPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [preference, setPreference] = useState(readSavedPreference);
    const systemReducedMotion = useSyncExternalStore(
        subscribe,
        () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
        () => false,
    );
    const reducedMotion = preference === 'system' ? systemReducedMotion : preference === 'reduced';

    // CSS typing and JavaScript scroll effects must use the same effective setting.
    useLayoutEffect(() => {
        document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
        return () => { delete document.documentElement.dataset.motion; };
    }, [reducedMotion]);

    const selectPreference = (next: MotionPreference) => {
        setPreference(next);
        try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Keep the session selection. */ }
    };

    return <Context.Provider value={{ preference, selectPreference, reducedMotion }}>{children}</Context.Provider>;
};

export function useMotionPreferences() {
    const context = useContext(Context);
    if (!context) throw new Error('useMotionPreferences requires MotionPreferencesProvider');
    return context;
}

export const useReducedMotionPreference = () => useMotionPreferences().reducedMotion;
