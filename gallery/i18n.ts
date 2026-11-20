// The reference screens are written in both languages the plugins ship, so long pt-BR labels are tested too.
export type Lang = 'en' | 'pt-BR';
const query = new URLSearchParams(location.search);
export const lang: Lang = query.get('lang') === 'pt-BR' ? 'pt-BR' : 'en';
export const t = (en: string, pt: string): string => (lang === 'en' ? en : pt);
export const param = (name: string, fallback: string): string => query.get(name) ?? fallback;
export const grams = (n: number | null | undefined): string => (n == null ? '—' : Math.round(n).toLocaleString(lang) + ' g');
