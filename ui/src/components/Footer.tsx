"use client";

/** BRAND: legal links point at ailunapro.com, not dograh.com. See BRAND.md. */
import { useI18n } from "@/i18n";

const LINK = "transition-colors hover:text-foreground";

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        <a href="https://ailunapro.com/politique-de-confidentialite" target="_blank" rel="noopener noreferrer" className={LINK}>
          {t.footer.privacy}
        </a>
        <span className="text-border">|</span>
        <a href="https://ailunapro.com/conditions-generales" target="_blank" rel="noopener noreferrer" className={LINK}>
          {t.footer.terms}
        </a>
        <span className="text-border">|</span>
        <a href="mailto:service@ailunapro.com" className={LINK}>
          {t.footer.support}
        </a>
        <span className="text-border">|</span>
        {/* Notices required by the BSD licences of Dograh and Pipecat. */}
        <a href="/licenses.txt" target="_blank" rel="noopener noreferrer" className={LINK}>
          {t.footer.openSource}
        </a>
      </div>
    </footer>
  );
}
