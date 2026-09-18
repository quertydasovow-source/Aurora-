export type CatalogLink =
  | { kind: 'url'; href: string; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'empty' };

/** Кликабельная ссылка только для корректного HTTP/HTTPS URL. Остальное — примечание. */
export function parseCatalogLink(value: string | null | undefined): CatalogLink {
  const text = (value || '').trim();
  if (!text) return { kind: 'empty' };
  if (/^https?:\/\/\S+$/i.test(text)) {
    return { kind: 'url', href: text, text };
  }
  const extracted = text.match(/https?:\/\/[^\s)]+/i);
  if (extracted && /^https?:\/\/\S+$/i.test(extracted[0])) {
    return { kind: 'url', href: extracted[0], text };
  }
  return { kind: 'note', text };
}

export function isHttpUrl(value: string | null | undefined): boolean {
  return parseCatalogLink(value).kind === 'url';
}
