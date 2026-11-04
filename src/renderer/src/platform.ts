/** Kısayol yazısı: Mac'te ⌘K, Windows/Linux'ta Ctrl+K */
export const isMac = /Mac/i.test(navigator.platform || navigator.userAgent)
export const kbd = (key: string, opts: { alt?: boolean; shift?: boolean } = {}): string =>
  isMac ? `${opts.alt ? '⌥' : ''}${opts.shift ? '⇧' : ''}⌘${key}` : `Ctrl+${opts.alt ? 'Alt+' : ''}${opts.shift ? 'Shift+' : ''}${key}`
