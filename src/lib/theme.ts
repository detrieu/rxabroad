export type ThemePref = 'system' | 'light' | 'dark';

export const THEME_KEY = 'pt-theme';
export const SOURCES_KEY = 'pt-show-sources';

/**
 * Runs inline in <head> before first paint so a saved theme or "show sources"
 * choice never flashes the wrong state. Keep it tiny and dependency-free.
 */
export const headInitScript =
  `try{var d=document.documentElement,t=localStorage.getItem('${THEME_KEY}');` +
  `if(t==='light'||t==='dark')d.setAttribute('data-theme',t);` +
  `if(localStorage.getItem('${SOURCES_KEY}')==='1')d.setAttribute('data-sources','')}catch(e){}`;

export function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

export function applySources(on: boolean) {
  document.documentElement.toggleAttribute('data-sources', on);
}
