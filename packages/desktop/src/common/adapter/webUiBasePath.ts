declare global {
  interface Window {
    __aionuiWebBasePath?: string;
  }
}

declare const __AIONUI_WEB_BASE_PATH__: string | undefined;

export function normalizeWebUiBasePath(value: unknown): string {
  if (typeof value !== 'string') return '';
  const candidate = value.trim();
  if (!candidate || candidate === '/') return '';
  if (!candidate.startsWith('/') || candidate.startsWith('//') || /[?#]/.test(candidate)) return '';
  return candidate.replace(/\/+$/, '');
}

export function getWebUiBasePath(): string {
  if (typeof window !== 'undefined' && window.__aionuiWebBasePath !== undefined) {
    return normalizeWebUiBasePath(window.__aionuiWebBasePath);
  }
  return normalizeWebUiBasePath(typeof __AIONUI_WEB_BASE_PATH__ === 'undefined' ? '' : __AIONUI_WEB_BASE_PATH__);
}

export function resolveWebUiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getWebUiBasePath()}${normalizedPath}`;
}
