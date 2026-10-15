import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";

/* The root layout loads Geist, not the Inter/Sora pair this design was drawn
   with, so the pricing route loads its own two faces and exposes them as CSS
   variables. Explicit weights (rather than the variable axis) keep the build
   deterministic: every weight listed below is published as a static file for
   both families. */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-pricing-sans",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800"],
  variable: "--font-pricing-display",
});

export const metadata: Metadata = {
  title: "Pricing — Voice AiLunaPro",
  description:
    "Voice AI agents on the phone number you already own. Flat monthly platform pricing in EUR, no carrier markup, 7-day free trial on every plan.",
};

/* Everything the page needs that cannot live in an inline style attribute:
   keyframes, hover states, scroll-driven reveals, the document-level
   background, and the opt-out from the authenticated app chrome.

   Keyframe names are all `pr-` prefixed on purpose. This stylesheet is global
   while the route is mounted, and the unprefixed names used by the source
   design (`pulse`, `shift`, `rise`, ...) would collide with Tailwind's own
   `@keyframes pulse` and shadow it for the rest of the app.

   The hover declarations carry `!important` because the design keeps all of
   its base styling in inline `style` attributes, and an inline declaration
   outranks a normal rule from a stylesheet. */
const PRICING_CSS = `
html:has(#pricing-top){scroll-behavior:smooth;scroll-padding-top:84px}
html:has(#pricing-top),html:has(#pricing-top) body{overflow-x:clip;background:var(--bg,#070B17);color:var(--text,#F8FAFC)}

/* Standalone marketing route: suppress the authenticated app shell that the
   root layout wraps every route in (sidebar, app header, brand imprint). */
body:has(#pricing-top) [data-slot="sidebar"]{display:none!important}
/* AppHeader is a direct child of SidebarInset; the page's own sticky header is
   deeper, so the child combinator is load-bearing here. */
body:has(#pricing-top) [data-slot="sidebar-inset"] > header{display:none!important}
body:has(#pricing-top) [data-slot="sidebar-inset"]{margin:0!important;border-radius:0!important;box-shadow:none!important;background:none!important}
body:has(#pricing-top) .app-surface{background:none!important}

#pricing-top{font-family:var(--font-pricing-sans),Inter,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
#pricing-top,#pricing-top *,#pricing-top *::before,#pricing-top *::after{box-sizing:border-box}
#pricing-top a{color:var(--accent,#22D3EE);text-decoration:none}
#pricing-top a:hover{color:var(--text,#F8FAFC)}
#pricing-top button{font:inherit;color:inherit}
#pricing-top :focus-visible{outline:2px solid #22D3EE;outline-offset:3px;border-radius:10px}
#pricing-top ::selection{background:rgba(124,58,237,.35)}

@keyframes pr-rise{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
@keyframes pr-intro{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes pr-drift{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(5vw,-4vh,0) scale(1.12)}}
@keyframes pr-shift{0%{background-position:0% 50%}100%{background-position:100% 50%}}
@keyframes pr-pulse{0%{box-shadow:0 0 0 0 currentColor}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}
@keyframes pr-stripes{to{background-position:28px 0}}
@keyframes pr-sheen{0%{transform:translateX(-150%) skewX(-20deg)}60%,100%{transform:translateX(380%) skewX(-20deg)}}

/* Scroll-driven section reveals. Browsers without animation-timeline fall back
   to a 0s animation with fill-mode both, i.e. the finished state. */
#pricing-top .pr-reveal-28{animation:pr-rise linear both;animation-timeline:view();animation-range:entry 0% cover 28%}
#pricing-top .pr-reveal-25{animation:pr-rise linear both;animation-timeline:view();animation-range:entry 0% cover 25%}

::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}

#pricing-top .pr-nav:hover{color:var(--text,#F8FAFC)!important;background:var(--hover,rgba(255,255,255,.05))!important}
#pricing-top .pr-toggle:hover{border-color:rgba(34,211,238,.45)!important;box-shadow:0 0 20px rgba(34,211,238,.2)!important}
#pricing-top .pr-cta:hover{box-shadow:0 0 34px rgba(124,58,237,.7)!important;color:#fff!important}
#pricing-top .pr-chip:hover{border-color:rgba(34,211,238,.5)!important}
#pricing-top .pr-cta-best:hover{box-shadow:0 0 40px rgba(124,58,237,.75)!important;color:#fff!important}
#pricing-top .pr-row:hover{border-color:rgba(34,211,238,.4)!important}
#pricing-top .pr-plan:hover{transform:translateY(-4px);border-color:rgba(34,211,238,.45)!important}
#pricing-top .pr-plan-cta:hover{box-shadow:0 0 26px rgba(124,58,237,.45)!important;border-color:rgba(34,211,238,.5)!important}
#pricing-top .pr-why:hover{transform:translateY(-4px);border-color:rgba(124,58,237,.45)!important;box-shadow:0 24px 48px -24px rgba(124,58,237,.5)!important}

@media (prefers-reduced-motion:reduce){
  html:has(#pricing-top){scroll-behavior:auto!important}
  #pricing-top,#pricing-top *,#pricing-top *::before,#pricing-top *::after{animation:none!important;transition:none!important}
}
`;

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable} ${sora.variable}`}>
      <style dangerouslySetInnerHTML={{ __html: PRICING_CSS }} />
      {children}
    </div>
  );
}
