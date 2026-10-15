"use client";

/**
 * Translates and rebrands the upstream screens after React renders them.
 * OURS — see BRAND.md §6.
 *
 * - Text nodes and prose attributes are looked up in the locale catalog.
 * - "Dograh" becomes "AiLunaPro" in every language.
 * - Links to dograh.com are rewritten to our docs (NEXT_PUBLIC_DOCS_URL) or hidden.
 *
 * Only `nodeValue` and attributes are changed — never the node structure — so
 * React keeps owning the tree: when it re-renders a text it overwrites ours
 * and the observer translates the new value.
 */
import { useEffect } from "react";

import { useI18n } from "@/i18n";
import {
  type Catalog,
  compileCatalog,
  type CompiledCatalog,
  localizeText,
  rewriteHref,
} from "@/i18n/catalog/runtime";
import type { Locale } from "@/i18n/config";

const LOADERS: Record<Exclude<Locale, "en">, () => Promise<unknown>> = {
  fr: () => import("@/i18n/catalog/fr.json"),
  es: () => import("@/i18n/catalog/es.json"),
  de: () => import("@/i18n/catalog/de.json"),
  it: () => import("@/i18n/catalog/it.json"),
  pt: () => import("@/i18n/catalog/pt.json"),
  ru: () => import("@/i18n/catalog/ru.json"),
  zh: () => import("@/i18n/catalog/zh.json"),
};

const cache = new Map<Locale, CompiledCatalog>();

async function loadCatalog(locale: Locale): Promise<CompiledCatalog | null> {
  if (locale === "en") return null;
  const hit = cache.get(locale);
  if (hit) return hit;
  const mod = (await LOADERS[locale]()) as { default?: Catalog } & Catalog;
  const compiled = compileCatalog(mod.default ?? mod);
  cache.set(locale, compiled);
  return compiled;
}

const DOCS_BASE = (process.env.NEXT_PUBLIC_DOCS_URL || "").trim();
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP =
  "script,style,code,pre,textarea,kbd,samp,[contenteditable=''],[contenteditable='true'],[data-no-translate],.notranslate,.cm-editor,.monaco-editor";

type TextRec = { src: string; out: string };

// Module-level so the English source survives a remount of the component.
const textRecs = new WeakMap<Text, TextRec>();
const attrRecs = new WeakMap<Element, Map<string, TextRec>>();

export function DomLocalizer() {
  const { locale } = useI18n();

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    void loadCatalog(locale)
      .catch(() => null)
      .then((cat) => {
        if (cancelled) return;
        const texts = textRecs;
        const attrs = attrRecs;

        const skipped = (el: Element | null) => !!el?.closest(SKIP);

        const doText = (node: Text) => {
          const cur = node.nodeValue ?? "";
          const rec = texts.get(node);
          const src = rec && cur === rec.out ? rec.src : cur;
          if (!src.trim()) return;
          if (skipped(node.parentElement)) return;
          const out = localizeText(src, cat);
          texts.set(node, { src, out });
          if (cur !== out) node.nodeValue = out;
        };

        const doAttrs = (el: Element) => {
          if (el.tagName === "A") {
            const href = el.getAttribute("href");
            if (href) {
              const next = rewriteHref(href, DOCS_BASE);
              if (next === null) (el as HTMLElement).style.display = "none";
              else if (next && next !== href) el.setAttribute("href", next);
            }
          }
          for (const name of ATTRS) {
            const cur = el.getAttribute(name);
            if (cur == null || !cur.trim()) continue;
            let map = attrs.get(el);
            const rec = map?.get(name);
            const src = rec && cur === rec.out ? rec.src : cur;
            const out = localizeText(src, cat);
            if (!map) attrs.set(el, (map = new Map()));
            map.set(name, { src, out });
            if (cur !== out) el.setAttribute(name, out);
          }
        };

        const walk = (root: Node) => {
          if (root.nodeType === Node.TEXT_NODE) return doText(root as Text);
          if (root.nodeType !== Node.ELEMENT_NODE) return;
          const el = root as Element;
          if (skipped(el)) return;
          doAttrs(el);
          const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (n) =>
              n.nodeType === Node.ELEMENT_NODE && (n as Element).matches(SKIP)
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
          });
          for (let n = tw.nextNode(); n; n = tw.nextNode()) {
            if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
            else doAttrs(n as Element);
          }
        };

        walk(document.body);

        observer = new MutationObserver((records) => {
          for (const r of records) {
            if (r.type === "characterData") doText(r.target as Text);
            else if (r.type === "attributes") doAttrs(r.target as Element);
            else r.addedNodes.forEach(walk);
          }
        });
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: [...ATTRS, "href"],
        });
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [locale]);

  return null;
}
