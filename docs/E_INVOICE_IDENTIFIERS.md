# Optional e-invoice identifiers

Rechly uses Next.js App Router, Ant Design forms, Appwrite collections and the
existing CII exporters in `src/lib/eRechnung`. These additions use the same API,
ownership checks and storage model. No service, subscription or feature gate is
required.

## Everyday use

- Customers: open **Advanced e-invoice details (optional)** to save a buyer ID
  and any delivery branches. The customer list loads every page from storage;
  search and invoice customer selection can access more than 260 customers.
- Company settings: the same collapsed section contains the seller ID.
- New invoice: the selected customer's buyer ID is used automatically. Open the
  advanced section to override or clear it, select a saved delivery branch, or
  enter an invoice-specific delivery address. No branch is selected automatically.
- Each invoice line has a collapsed optional EAN / GTIN field. Leading zeros
  are retained. GTIN-8, -12, -13 and -14 require a valid check digit.
- Choose GLN / `0088` for a 13-digit identifier with a valid GS1 check digit, or
  leave the scheme empty for an internal identifier. Other schemes are rejected.

Buyer/seller IDs and the selected delivery address are copied into the invoice
when it is created. Later customer/company edits do not change these snapshots.
Invoices generated from offers or recurring templates also capture current
buyer/seller defaults. Corrections copy the original identifiers and item GTINs.
Old invoices without identifiers keep their existing behavior. These snapshots
cover the new fields; the application still resolves other existing party fields
from customer/company records as before.

German and English labels are included. All new data is optional. Dashboard
appearance is separately selectable (light, dark, system), stored on the device,
and defaults to light. Small-business settings default new line items to 0% VAT;
explicit zero-rated catalog products retain 0% for other businesses too.

## Storage and deployment

Before deploying the new web code, back up the Appwrite database and run the
additive migration against the intended project:

```bash
# Use an operator environment with the endpoint/project ID and server API key.
# Never put the API key in client-side variables or version control.
npm run migrate:einvoice
```

The script reads `.env.local`; alternatively use your deployment's injected
environment with `node scripts/migrate-einvoice.mjs`. The key needs permission
to read/create database attributes. It creates these optional string attributes,
waits for readiness and checks existing definitions on subsequent runs:

| Collection | Attribute | Maximum length |
| --- | --- | --- |
| `clients` | `eInvoiceData` | 1000000 (storage; payloads validated to 16000 chars) |
| `user_company` | `eInvoiceData` | 1000000 (storage; payloads validated to 16000 chars) |
| `invoices` | `eInvoiceData` | 1000000 (storage; payloads validated to 16000 chars) |
| `invoice_items` | `gtin` | 14 |

`appwrite.config.json` includes the matching definitions. Existing rows need no
backfill. JSON data is validated on writes; customer updates that omit the field
preserve it, and an explicit empty object clears it. Address entries share their
parent customer's ownership. Invoice creation rejects foreign customer IDs,
including offer conversion and recurring generation. Existing attributes and
permissions are not changed. Do not remove these attributes when rolling back
application code: retain the optional data for a later upgrade.

The migration has **not** been run against a live Appwrite project in this work.
Local persistence tests use an isolated SQLite adapter; a staging Appwrite check
is still required before production rollout.

## CII mappings

Both existing exports use UN/CEFACT CII D16B. No UBL exporter was added.

| Business term | CII location (under SupplyChainTradeTransaction) |
| --- | --- |
| BT-46 buyer ID | `ApplicableHeaderTradeAgreement/BuyerTradeParty/GlobalID[@schemeID='0088']` (or `ID` without a scheme) |
| BT-29 seller ID | `ApplicableHeaderTradeAgreement/SellerTradeParty/GlobalID[@schemeID='0088']` (or `ID` without a scheme) |
| BT-71 delivery ID | `ApplicableHeaderTradeDelivery/ShipToTradeParty/GlobalID[@schemeID='0088']` (or `ID` without a scheme) |
| Delivery name/address | `ShipToTradeParty/Name` and `PostalTradeAddress/{PostcodeCode,LineOne,CityName,CountryID}` |
| BT-157 item GTIN | `IncludedSupplyChainTradeLineItem/SpecifiedTradeProduct/GlobalID[@schemeID='0160']` |

These identifiers are independent of buyer reference (BT-10), VAT ID and tax
registration. Existing tax registration elements and monetary calculations are
preserved. XRechnung keeps its XRechnung 3.0 profile identifier. The XML attached
to the ZUGFeRD export uses the base EN 16931 profile identifier. PDF identifiers,
delivery details and GTINs use the same invoice snapshot as the XML.

## Verification and limits

```bash
npm run test:einvoice
npx tsc --noEmit
npx tsx scripts/generate-einvoice-fixtures.ts
npm run build
```

The unit suite checks optional/invalid identifiers, all four GTIN lengths,
leading zeros, multiple branches, overrides, legacy invoices, XML mappings,
unchanged fixture totals, VAT defaults and paginated retrieval of 260 records.

Run the real API integration test using a disposable local backend only:

```bash
RECHLY_DESKTOP=1 NEXT_PUBLIC_RECHLY_DESKTOP=1 \
RECHLY_DATA_DIR=/tmp/rechly-web-integration \
NEXT_PUBLIC_APPWRITE_ENDPOINT=http://127.0.0.1/desktop \
NEXT_PUBLIC_APPWRITE_PROJECT_ID=desktop-local \
npm run dev -- --hostname 127.0.0.1 --port 3102

# In another terminal:
RECHLY_DESKTOP=1 RECHLY_DATA_DIR=/tmp/rechly-web-integration \
npx tsx tests/einvoice.integration.ts
```

This test creates and edits 260 customers through the API, persists branches and
GTINs, verifies immutable overrides and omitted-field preservation, generates
invoices from offers/templates, and rejects cross-tenant customer operations.
It deletes its test customers/invoices; the company fixture remains only in the
disposable directory.

The checked-in XML examples are `tests/fixtures/identifiers-xrechnung.xml` and
`identifiers-en16931.xml`, generated from synthetic data. Both were checked
against the official CII D16B XSD and European Commission EN 16931 CII business
rules from [ConnectingEurope/eInvoicing-EN16931](https://github.com/ConnectingEurope/eInvoicing-EN16931).
Schema success alone is not proof of compliance for all invoices.

Validator source revision: `b17b2695e5e3e021945c38658326b78a76f80f84`.
The business-rule checks used Saxon-HE 10.9 and
`cii/xslt/EN16931-CII-validation.xslt`; both SVRL reports had zero
`svrl:failed-assert` entries. The schema was
`cii/schema/D16B SCRDM (Subset)/coupled clm/CII/uncefact/data/standard/CrossIndustryInvoice_100pD16B.xsd`.
For example, with a local validator checkout and Saxon JAR:

```bash
java -jar /path/to/Saxon-HE-10.9.jar \
  -s:tests/fixtures/identifiers-xrechnung.xml \
  -xsl:/path/to/eInvoicing-EN16931/cii/xslt/EN16931-CII-validation.xslt \
  -o:/tmp/xrechnung-svrl.xml
# Repeat with identifiers-en16931.xml; inspect failed assertions, not just exit status.
```

Verification on 2026-10-27 also passed TypeScript, the web production build,
the unit tests and the API integration suite. Browser checks exercised
collapsed optional fields, invalid/valid branch GLNs, saving a customer, theme
persistence, saved branch selection, invoice overrides surviving step navigation,
and a 390px mobile form without horizontal page overflow. The
PDF attachment was extracted with `pdfdetach` and byte-compared to the EN 16931
fixture; `pdftotext` confirmed visible identifiers and GTINs. Unauthenticated web
API calls returned 401, while the desktop-only health route returned 404 in web
mode. The final merge also resolved the remaining lint errors; existing warnings
are tracked separately from this feature's checks.

The follow-up validation resolved the KoSIT download blocker and corrected the
PDF/A container and discounted XML unit prices. Seven synthetic export cases
now pass the full KoSIT XRechnung 3.0.2 scenario, veraPDF PDF/A-3b and Mustang
Factur-X checks. See [validation evidence, exact scope and reproduction steps](COMPLIANCE_VALIDATION.md).
These fixture results do not certify arbitrary customer data or every possible
invoice. Validate actual output against the recipient's applicable rules.

## Repairing customer saves on older Appwrite schemas

The customer create/update API retries a write only when Appwrite explicitly
rejects the fixed `clients.eInvoiceData` attribute as unknown. For nonempty
metadata it creates the optional string attribute (created oversized at 1000000 characters so Appwrite stores it off-row instead of as an inline VARCHAR that can exceed MariaDB's row-size limit; payloads themselves are validated to 16000 characters), waits
briefly for `available`, and retries the same customer write once. Authentication
and, for updates, ownership are checked first. It never alters an existing
attribute or discards a delivery address to make a save succeed. Normal writes
do not perform schema requests. Empty metadata can be omitted on old schemas.

This repair requires the server key to read and create attributes. If that key
has only document permissions, run the existing operator migration instead:
`node scripts/migrate-einvoice.mjs` with the intended project's endpoint, project
ID and operator API key supplied securely through the environment. Do not grant
end users schema permissions. A pending, incompatible or inaccessible field
returns HTTP 503 with the form inputs preserved; operator logs identify the
migration. Existing fields and customer documents are never deleted.

Regression test: `npx tsx --test tests/clientMetadata.test.ts`. These tests
simulate Appwrite's missing-field, processing, conflict and permission errors;
production schema readiness still needs verification on the deployed project.
