export * from './helpers';

export const isBrowser = typeof window !== 'undefined';

export const isMobile = isBrowser && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const isIOS = isBrowser && /iPad|iPhone|iPod/.test(navigator.userAgent);

export const isAndroid = isBrowser && /Android/.test(navigator.userAgent);

export function getOS(): 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown' {
  if (!isBrowser) return 'unknown';
  if (isIOS) return 'ios';
  if (isAndroid) return 'android';
  if (/Windows/.test(navigator.userAgent)) return 'windows';
  if (/Mac/.test(navigator.userAgent)) return 'mac';
  if (/Linux/.test(navigator.userAgent)) return 'linux';
  return 'unknown';
}

export function getBrowser(): 'chrome' | 'firefox' | 'safari' | 'edge' | 'unknown' {
  if (!isBrowser) return 'unknown';
  if (/Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent)) return 'chrome';
  if (/Firefox/.test(navigator.userAgent)) return 'firefox';
  if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) return 'safari';
  if (/Edg/.test(navigator.userAgent)) return 'edge';
  return 'unknown';
}

export function prefersReducedMotion(): boolean {
  return isBrowser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function prefersDarkMode(): boolean {
  return isBrowser && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getViewport(): { width: number; height: number } {
  if (!isBrowser) return { width: 0, height: 0 };
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0),
  };
}

export function scrollY(): number {
  if (!isBrowser) return 0;
  return window.scrollY || document.documentElement.scrollTop;
}

export function scrollToTop(smooth = true): void {
  if (!isBrowser) return;
  window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
}

export function scrollToElement(element: HTMLElement | null, offset = 0): void {
  if (!element) return;
  const top = element.getBoundingClientRect().top + scrollY() - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

export function copyToClipboard(text: string): Promise<void> {
  if (!isBrowser) return Promise.reject('Not in browser');
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve();
}

export function downloadFile(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function openUrl(url: string, target: '_blank' | '_self' = '_blank'): void {
  window.open(url, target, 'noopener,noreferrer');
}
