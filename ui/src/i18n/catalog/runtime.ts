/**
 * Pure helpers behind the DOM localizer. OURS — see BRAND.md §6.
 *
 * Upstream screens are hard-coded English. Rather than patch hundreds of
 * upstream files (and lose it on every upgrade), the localizer translates the
 * rendered text with a catalog extracted from the source:
 *   scripts/i18n/extract-ui-strings.cjs → catalog/source.json → catalog/<locale>.json
 */

export type Catalog = {
  strings: Record<string, string>;
  patterns: Record<string, string>;
};

type CompiledPattern = { re: RegExp; order: number[]; out: string };

export type CompiledCatalog = {
  strings: Map<string, string>;
  patterns: CompiledPattern[];
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function compileCatalog(c: Catalog): CompiledCatalog {
  const patterns: CompiledPattern[] = [];
  for (const [src, out] of Object.entries(c.patterns)) {
    const order: number[] = [];
    const body = src
      .split(/(\{\d+\})/)
      .map((part) => {
        const m = /^\{(\d+)\}$/.exec(part);
        if (m) {
          order.push(Number(m[1]));
          return "(.+?)";
        }
        return escapeRe(part);
      })
      .join("");
    // Longest static text first, so "Delete {0} agents" beats "Delete {0}".
    patterns.push({ re: new RegExp(`^${body}$`, "s"), order, out });
  }
  patterns.sort((a, b) => b.re.source.length - a.re.source.length);
  return { strings: new Map(Object.entries(c.strings)), patterns };
}

/** Upstream product name → ours. Applied in every language, English included. */
export function rebrand(text: string): string {
  return text.indexOf("Dograh") === -1 ? text : text.replace(/\bDograh\b/g, "AiLunaPro");
}

/**
 * Translate one rendered text, keeping its surrounding whitespace. Unknown
 * text comes back rebranded but otherwise untouched.
 */
export function localizeText(text: string, cat: CompiledCatalog | null): string {
  const branded = rebrand(text);
  if (!cat) return branded;
  const core = branded.replace(/\s+/g, " ").trim();
  if (!core || core.length > 600 || !/[A-Za-z]/.test(core)) return branded;

  let out = cat.strings.get(core);
  if (out === undefined && core.length < 400) {
    for (const p of cat.patterns) {
      const m = p.re.exec(core);
      if (!m) continue;
      // A placeholder stands for a name, a number or a short value — never for
      // a whole sentence. Without this, "Add {0}" would swallow any unknown
      // sentence starting with "Add" and print half-translated text.
      const values_ = m.slice(1);
      if (values_.some((v) => v.length > 60 || v.split(" ").length > 6 || /[.!?]\s/.test(v))) continue;
      const values: Record<number, string> = {};
      p.order.forEach((n, i) => {
        values[n] = m[i + 1];
      });
      out = p.out.replace(/\{(\d+)\}/g, (_, n) => values[Number(n)] ?? "");
      break;
    }
  }
  if (out === undefined) return branded;
  const lead = /^\s*/.exec(branded)?.[0] ?? "";
  const trail = /\s*$/.exec(branded)?.[0] ?? "";
  return lead + out + trail;
}

const UPSTREAM_LINK = /^https?:\/\/([a-z0-9-]+\.)*dograh\.com(\/|$)/i;
const UPSTREAM_DOCS = /^https?:\/\/docs\.dograh\.com/i;

/**
 * Where a link to the upstream company should go instead. Docs links follow
 * NEXT_PUBLIC_DOCS_URL when we publish our own docs; anything else pointing at
 * dograh.com is dropped (null → the link is hidden).
 */
export function rewriteHref(href: string, docsBase: string): string | null | undefined {
  if (!UPSTREAM_LINK.test(href)) return undefined; // not ours to touch
  if (docsBase && UPSTREAM_DOCS.test(href)) {
    return href.replace(UPSTREAM_DOCS, docsBase.replace(/\/+$/, ""));
  }
  return null;
}
