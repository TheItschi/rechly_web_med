# Search landing pages

Use existing pages for a distinct search task. Keep titles, descriptions and
visible copy consistent with the actual tool. In particular, reading invoice
data is not equivalent to validating XRechnung/EN 16931 or PDF/A-3 compliance.

Tool and invoice-template metadata live in `src/lib/tools/catalog.ts` and
`src/lib/tools/vorlagenCatalog.ts`. Their optional `lastModified` date feeds the
sitemap. Update it when making a substantive change to that entry; do not refresh
every page's date on each build. Visible FAQs and FAQ structured data share the
same catalog. FAQ markup does not guarantee a Google rich result.

Guide sections can include contextual `links`. Prefer links that help complete
the task and relevant primary sources over large lists of keyword variants.

## Browser regression checks

Start a local production web server and provide `playwright-core` and Chromium:

```sh
RECHLY_SEO_URL=http://127.0.0.1:3110 \
RECHLY_CANONICAL_URL=https://rechly.de \
node tests/seo-tools.browser.cjs
```

Use the canonical origin configured at build time. `RECHLY_CHROMIUM` and
`RECHLY_PLAYWRIGHT_PATH` override local tool paths. The test checks server-rendered
copy, FAQ/schema agreement, canonical URLs and sitemap dates on the four updated
pages. It also opens synthetic UBL/CII invoices, checks result display and CSV
export, verifies that the file is not posted, tests error recovery and checks
the viewer result layout at 320 pixels. It creates no user accounts.

Search Console exports contain private analytics and are not stored here.
Evaluate releases with equal time periods and page/query filters after recrawling.
Keep ranking changes separate from CTR changes; lab SEO scores alone do not
measure organic search performance.
