export type Language = 'en' | 'ko';
export const LANGUAGE_KEY = 'achieveone-language';
export const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'ko';
export const languageForCountry = (country: unknown): Language => country === 'KR' ? 'ko' : 'en';

export function readSavedLanguage(): Language | null {
    try {
        const value = localStorage.getItem(LANGUAGE_KEY);
        return isLanguage(value) ? value : null;
    } catch { return null; }
}

// Country only: no location permission or coordinates are requested.
export async function detectLanguage(signal: AbortSignal, request: typeof fetch = fetch): Promise<Language> {
    try {
        const response = await request('https://api.country.is/', {
            signal, credentials: 'omit', referrerPolicy: 'no-referrer',
        });
        if (!response.ok) return 'en';
        const result: unknown = await response.json();
        return languageForCountry(result && typeof result === 'object' && 'country' in result ? result.country : null);
    } catch { return 'en'; }
}
