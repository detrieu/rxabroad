export type ThemePref = 'system' | 'light' | 'dark';

export const THEME_KEY = 'pt-theme';
export const SOURCES_KEY = 'pt-show-sources';

/**
 * Runs inline in <head> before first paint so a saved theme or "show sources"
 * choice never flashes the wrong state. Keep it tiny and dependency-free.
 * Dark mode is the `.dark` class on <html> (shadcn convention).
 */
export const headInitScript =
  `try{var d=document.documentElement,t=localStorage.getItem('${THEME_KEY}');` +
  `if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark');` +
  `if(localStorage.getItem('${SOURCES_KEY}')==='1')d.setAttribute('data-sources','')}catch(e){}`;

export function resolveDark(pref: ThemePref) {
  return pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const dark = resolveDark(pref);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
}

export function applySources(on: boolean) {
  document.documentElement.toggleAttribute('data-sources', on);
}
