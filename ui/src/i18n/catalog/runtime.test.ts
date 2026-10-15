import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

import { LOCALES } from "../config";
import { compileCatalog, localizeText, rebrand, rewriteHref } from "./runtime";

const cat = compileCatalog({
  strings: { "Add Provider": "Ajouter un fournisseur", "Provider Connections": "Connexions fournisseurs" },
  patterns: {
    "Delete {0}": "Supprimer {0}",
    "{0} set, {1} missing": "{1} manquant(s), {0} défini(s)",
  },
});

describe("localizeText", () => {
  it("translates exact strings and keeps surrounding whitespace", () => {
    expect(localizeText(" Add Provider ", cat)).toBe(" Ajouter un fournisseur ");
  });

  it("collapses JSX whitespace before lookup", () => {
    expect(localizeText("Provider\n      Connections", cat)).toBe("Connexions fournisseurs");
  });

  it("fills patterns and allows reordering", () => {
    expect(localizeText("Delete Sales agent", cat)).toBe("Supprimer Sales agent");
    expect(localizeText("3 set, 1 missing", cat)).toBe("1 manquant(s), 3 défini(s)");
  });

  it("leaves unknown text alone", () => {
    expect(localizeText("Acme Corp", cat)).toBe("Acme Corp");
  });

  it("never lets a placeholder swallow a whole sentence", () => {
    const s = "Delete multiple accounts from any provider, including the archived ones.";
    expect(localizeText(s, cat)).toBe(s);
  });

  it("rebrands in every language, English included", () => {
    expect(localizeText("Dograh", null)).toBe("AiLunaPro");
    expect(rebrand("Dograh-hosted model tier")).toBe("AiLunaPro-hosted model tier");
    expect(rebrand("window.DograhWidget")).toBe("window.DograhWidget");
  });
});

describe("rewriteHref", () => {
  it("hides upstream links when we have no docs", () => {
    expect(rewriteHref("https://docs.dograh.com/configurations/inference-providers", "")).toBeNull();
    expect(rewriteHref("https://www.dograh.com/hub", "")).toBeNull();
  });

  it("moves docs links to our docs when configured", () => {
    expect(rewriteHref("https://docs.dograh.com/voice-agent/tools", "https://docs.ailunapro.com/")).toBe(
      "https://docs.ailunapro.com/voice-agent/tools",
    );
  });

  it("does not touch other links", () => {
    expect(rewriteHref("https://console.twilio.com", "")).toBeUndefined();
    expect(rewriteHref("/billing", "")).toBeUndefined();
  });
});

describe("shipped catalogs", () => {
  const dir = resolve(process.cwd(), "src/i18n/catalog");
  const source = JSON.parse(readFileSync(resolve(dir, "source.json"), "utf8"));

  for (const locale of LOCALES.filter((l) => l !== "en")) {
    it(`${locale}: covers the source and keeps every placeholder`, () => {
      const c = JSON.parse(readFileSync(resolve(dir, `${locale}.json`), "utf8"));
      const keys = [...Object.keys(c.strings), ...Object.keys(c.patterns)];
      const total = source.strings.length + source.patterns.length;
      // Unchanged entries (brand names, codes) are not stored, hence < 100 %.
      expect(keys.length / total).toBeGreaterThan(0.85);
      for (const [src, out] of Object.entries<string>(c.patterns)) {
        const ph = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join();
        expect(ph(out), src).toBe(ph(src));
      }
      expect(() => compileCatalog(c)).not.toThrow();
    });
  }
});

describe("public widget", () => {
  it("exposes the AiLunaPro global next to the legacy one", () => {
    const js = readFileSync(resolve(process.cwd(), "public/embed/dograh-widget.js"), "utf8");
    expect(js).toContain("window.AiLunaProWidget = window.DograhWidget");
    expect(js).toContain("data-ailunapro-context");
  });
});
