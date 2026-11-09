# Homepage refresh

The homepage now uses seven focused sections: introduction, core features,
online booking, web/desktop options, resources, FAQs, and a closing call to action.
Repeated feature lists and large keyword-link blocks have been replaced by links
to the existing detailed resource pages. Existing public URLs remain available.

The copy introduces booking, projects and time tracking, supported file imports,
and optional AI/Ollama. It distinguishes file-based bank reconciliation from a
live bank connection and local desktop storage from automatic cloud sync.
Illustrations are explicitly labelled as examples with fictional data.

## Accessibility and mobile

- Responsive navigation and layouts tested at 320, 390, 768, 1024 and 1440 pixels.
- Keyboard-accessible menu with Escape/focus restoration, skip link, visible focus,
  native FAQ controls, and reduced-motion support.
- German content is rendered on the server and readable without JavaScript.
  Saved English preferences are restored after hydration to avoid mismatches.
- Scoped styles keep the homepage redesign separate from application screens.

The homepage and other public pages use the shared `Navbar` component. It keeps
primary links consistent and groups tools, templates and guides under Resources.
At widths below 1100 pixels it uses a scrollable native disclosure, with Escape,
outside-click and route-change dismissal. The menu remains usable without
JavaScript. Login/register pages retain `showAuth={false}`; the homepage uses
`reserveSpace` because other public pages already offset their heroes for the
fixed header. Page heroes use sections where needed to keep one site banner.

Run `RECHLY_NAV_URL=http://127.0.0.1:3111 node tests/navbar.browser.cjs` against a
local web server to check navigation consistency, active links, keyboard and
mobile interactions, language persistence, auth pages and no-JavaScript access.

Document scrolling uses `auto`: global CSS smooth scrolling interfered with
Back/Forward restoration, even with Next.js's smooth-scroll declaration. Native
history restoration and section anchors remain intact, without animating old
page offsets. The Features download link targets `/desktop#download`; its former
homepage target no longer exists. Run
`RECHLY_NAV_URL=http://127.0.0.1:3111 node tests/navigation-scroll.browser.cjs`
to check footer/menu navigation, history restoration and section targets.

## Search and sharing

The homepage and features page have updated titles/descriptions. Canonical URLs,
Open Graph/Twitter metadata, a self-contained social image, sitemap dates, and
SoftwareApplication/WebPage/FAQPage structured data describe the actual content.
FAQ schema uses the same source as the visible German FAQs. The unsupported
site-search action was removed. Links remain crawlable; automatic prefetching of
linked application pages is disabled on the homepage.

## Verification

Local production verification on 8–9 November 2026:

- Production web build and TypeScript checks passed.
- All 107 automated tests passed; changed TypeScript files passed ESLint.
- Chromium checks passed for navigation, responsive overflow, FAQ controls,
  persisted English, no-JavaScript content, metadata/schema agreement,
  robots/sitemap and the generated social image.
- Axe WCAG A/AA checks reported no violations.
- Final Lighthouse mobile audit: performance **71**, accessibility **100**,
  best practices **96**, SEO **100**, cumulative layout shift **0**.
  Performance varied from 71 to 81 across local runs; shared application scripts
  remain an optimization opportunity. The best-practices deduction came from the
  existing anonymous session endpoint returning HTTP 401.

These are local lab measurements, not deployed Core Web Vitals or a guarantee of
search rankings. Keep monitoring production performance and Search Console.

To repeat the browser checks, start a web-mode server, provide `playwright-core`,
`axe-core` and Chromium, then run:

```sh
RECHLY_LANDING_URL=http://127.0.0.1:3107 \
RECHLY_CANONICAL_URL=https://rechly.de \
node tests/landing.browser.cjs
```

Set the canonical URL to the value used at build time. Optional overrides are
`RECHLY_CHROMIUM`, `RECHLY_PLAYWRIGHT_PATH`, and `RECHLY_AXE_PATH`. The test mocks
anonymous session lookup, creates no accounts and writes screenshots/reports to
`/tmp/rechly-home-*`.
