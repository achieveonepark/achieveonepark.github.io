import { useSyncExternalStore } from 'react';

// Header (64px) and chapter navigation (52px) share this reading offset.
export const CHAPTER_SCROLL_OFFSET = 116;
const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribe = (notify: () => void) => {
    const query = window.matchMedia(DESKTOP_QUERY);
    query.addEventListener('change', notify);
    return () => query.removeEventListener('change', notify);
};
export const useDesktopLayout = () => useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
);
