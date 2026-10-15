#!/usr/bin/env node
/**
 * Collects every user-visible English string in the upstream UI so the DOM
 * localizer (ui/src/components/brand/DomLocalizer.tsx) can translate screens
 * we never edit. OURS — see BRAND.md §6.
 *
 *   node scripts/i18n/extract-ui-strings.cjs        # writes ui/src/i18n/catalog/source.json
 *
 * Output: { strings: string[], patterns: string[] }
 *   strings  — exact texts (JSX text, prose attributes, prose string literals)
 *   patterns — template literals with ${…}, written with {0} {1} placeholders
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const ts = require(path.join(ROOT, "ui/node_modules/typescript"));
const SRC = path.join(ROOT, "ui/src");
const SKIP_DIRS = ["client", "i18n", "styles", "__tests__", "__mocks__"];
const SKIP_FILE = /\.(test|spec|stories)\.(t|j)sx?$|\.d\.ts$/;

const PROSE_ATTRS = new Set([
  "placeholder", "title", "aria-label", "alt", "label", "description", "tooltip",
  "helperText", "helpText", "hint", "emptyMessage", "emptyText", "heading",
  "subtitle", "subheading", "message", "text", "confirmText", "cancelText",
  "confirmLabel", "cancelLabel", "actionLabel", "buttonText", "submitLabel",
  "loadingText", "caption", "summary", "content", "info", "warning", "error",
  "successMessage", "errorMessage", "header", "footer", "noResultsText",
]);
const CODE_CALLEES = new Set([
  "cn", "clsx", "cva", "twMerge", "require", "import", "fetch", "get", "set",
  "has", "querySelector", "querySelectorAll", "getElementById", "addEventListener",
  "removeEventListener", "getItem", "setItem", "removeItem", "startsWith", "endsWith",
  "includes", "split", "join", "replace", "match", "test", "push", "useState",
  "searchParams", "append", "delete", "createElement", "Error", "debug", "log",
  "info", "warn", "trace", "assert", "useQuery", "invalidateQueries", "redirect",
  "navigate", "router", "routerPush", "encodeURIComponent", "URL", "RegExp",
  "format", "toLocaleString", "Date", "localeCompare", "indexOf", "getPropertyValue",
]);
const CODE_ATTRS = /^(className|class|id|key|href|src|type|variant|size|name|value|defaultValue|role|htmlFor|side|align|as|target|rel|method|action|mode|orientation|dir|lang|style|width|height|viewBox|d|fill|stroke|accept|autoComplete|inputMode|pattern|step|min|max|form|sizes|data-[\w-]+|aria-(?!label)[\w-]+|on[A-Z]\w*|testId|icon|color|position|layout|direction|sideOffset|asChild|path|to|route|field|column|accessorKey|dataKey|format|locale|kind|status|provider|model|language|voice)$/;

function looksLikeProse(s) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length < 2 || t.length > 400) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (/^(https?:|mailto:|tel:|\/|\.|#|@|\$|\{|<|\[|--|\w+:\/\/)/.test(t)) return false;
  if (/[{}<>`;=]|=>|\|\||&&/.test(t)) return false;
  if (/^[a-z0-9_.:\/-]+$/.test(t)) return false;            // ids, keys, paths, slugs
  if (/^[a-z]+[A-Z]\w*$/.test(t)) return false;             // camelCase
  if (/^[A-Z0-9_]+$/.test(t) && t.length > 4) return false;  // CONSTANT
  if (/^[\w-]+(\s+[\w:\/\[\]().%-]+)*$/.test(t) && /(^|\s)(flex|grid|text-|bg-|px-|py-|p-|m-|mx-|my-|w-|h-|rounded|border|items-|justify-|gap-|hover:|dark:|sm:|md:|lg:)/.test(t)) return false; // tailwind
  if (!/[A-Z]/.test(t[0]) && !/\s/.test(t) && !/[A-Za-z]{3}/.test(t)) return false;
  if (/^[\w.]+\([^)]*\)$/.test(t)) return false;                         // start(), getMessages()
  if (/cubic-bezier|gradient\(|rgba?\(|hsla?\(|translate[XY3d]*\(|var\(--|\d(px|rem|em|ms|vh|vw)\b/.test(t)) return false; // CSS
  if (/(^|\s)[\w-]+:[\w-]/.test(t) && !/:\s/.test(t)) return false;          // tailwind variants
  if (/must be used within/.test(t)) return false;                       // developer errors
  if (/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(t)) return false;
  return true;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (dir === SRC && SKIP_DIRS.includes(e.name)) continue;
      if (e.name === "__tests__" || e.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx|ts)$/.test(e.name) && !SKIP_FILE.test(e.name)) out.push(p);
  }
  return out;
}

const strings = new Set();
const patterns = new Set();
const norm = (s) => s.replace(/\s+/g, " ").trim();

function calleeName(call) {
  const ex = call.expression;
  if (ts.isIdentifier(ex)) return ex.text;
  if (ts.isPropertyAccessExpression(ex)) return ex.name.text;
  return "";
}

function inCodeContext(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isJsxAttribute(p)) {
      const n = p.name.getText();
      if (PROSE_ATTRS.has(n)) return false;
      if (CODE_ATTRS.test(n)) return true;
      return false;
    }
    if (ts.isCallExpression(p) && CODE_CALLEES.has(calleeName(p))) return true;
    if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
    if (ts.isPropertyAssignment(p) && p.name === node) return true;
    if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
    if (ts.isCaseClause(p) && p.expression === node) return true;
    if (ts.isTypeNode(p) || ts.isLiteralTypeNode(p)) return true;
    if (ts.isJsxExpression(p) || ts.isJsxElement(p) || ts.isBlock(p) || ts.isSourceFile(p)) return false;
  }
  return false;
}

function visit(node) {
  if (ts.isJsxText(node)) {
    const t = norm(node.text);
    if (t && /[A-Za-z]{2}/.test(t) && !/[{}<>]/.test(t)) strings.add(t);
  } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const t = norm(node.text);
    if (looksLikeProse(t) && !inCodeContext(node)) strings.add(t);
  } else if (ts.isTemplateExpression(node) && !inCodeContext(node)) {
    let s = node.head.text;
    node.templateSpans.forEach((sp, i) => { s += `{${i}}` + sp.literal.text; });
    const t = norm(s);
    const stat = t.replace(/\{\d+\}/g, " ");
    if (looksLikeProse(stat.replace(/\s+/g, " ").trim() || "x") && /[A-Za-z]{3}/.test(stat) && !/[<>`;=]/.test(t) && !/^\{\d+\}$/.test(t)) {
      if (/^[^{]*[A-Za-z]{3}/.test(t) || /[A-Za-z]{3}[^}]*$/.test(t)) patterns.add(t);
    }
  }
  ts.forEachChild(node, visit);
}

for (const f of walk(SRC, [])) {
  const src = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  visit(sf);
}

// Text with "Dograh" is rebranded at runtime before lookup, so store the rebranded form.
const rebrand = (s) => s.replace(/\bDograh\b/g, "AiLunaPro");
const outStrings = [...new Set([...strings].map(rebrand))].filter((s) => !/^\{\d+\}$/.test(s)).sort();
const outPatterns = [...new Set([...patterns].map(rebrand))].sort();
const dest = path.join(ROOT, "ui/src/i18n/catalog/source.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify({ strings: outStrings, patterns: outPatterns }, null, 1) + "\n");
console.log(`strings=${outStrings.length} patterns=${outPatterns.length} → ${path.relative(ROOT, dest)}`);
