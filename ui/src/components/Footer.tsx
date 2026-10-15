/** BRAND: legal links point at ailunapro.com, not dograh.com. See BRAND.md. */
export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background px-6 py-4">
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <a
          href="https://ailunapro.com/politique-de-confidentialite"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          Confidentialité
        </a>
        <span className="text-border">|</span>
        <a
          href="https://ailunapro.com/conditions-generales"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          Conditions générales
        </a>
        <span className="text-border">|</span>
        <a
          href="mailto:service@ailunapro.com"
          className="transition-colors hover:text-foreground"
        >
          Support
        </a>
      </div>
    </footer>
  );
}
