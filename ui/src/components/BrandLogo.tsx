import { cn } from "@/lib/utils";

/**
 * The Voice AiLunaPro wordmark.
 *
 * The artwork is a violet-to-cyan gradient on transparency, so one file serves
 * both themes: it sits straight on the dark canvas, and `.al-logo-pill` (see
 * src/styles/ailunapro.css) puts it on an ink pill in light mode, where the
 * cyan end would otherwise wash out.
 *
 * `mark` renders the square icon instead of the full lockup (sidebar header,
 * collapsed rail). `inverse` is kept for callers that force the light artwork
 * on an always-dark panel; with this artwork it is the same file, and the prop
 * stays so upstream call sites keep compiling after a merge.
 *
 * Height comes from the caller via className (e.g. "h-6"); width stays auto.
 */
export function BrandLogo({
  className,
  inverse = false,
  mark = false,
  pill = false,
}: {
  className?: string;
  inverse?: boolean;
  mark?: boolean;
  /** Wrap in the contrast pill. Ignored in dark mode, where the CSS flattens it. */
  pill?: boolean;
}) {
  const src = mark ? "/ailunapro-mark.png" : "/ailunapro-logo.png";
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Voice AiLunaPro"
      className={cn("block w-auto select-none", className)}
    />
  );

  if (mark) {
    return img;
  }

  if (pill && !inverse) {
    return <span className="al-logo-pill">{img}</span>;
  }

  return img;
}
