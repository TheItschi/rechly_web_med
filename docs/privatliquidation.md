# Privatliquidation (GOÄ) – Erweiterung

Dieser Fork ergänzt Rechly um die Abrechnung ärztlicher Leistungen nach GOÄ (Fassung 1996).

## Funktionen

| Bereich | Umsetzung |
|---|---|
| GOÄ-Positionen | Schritt „Positionen“: *GOÄ-Ziffer hinzufügen* (Katalog) oder *Freie GOÄ-Ziffer*. Je Position Leistungsdatum, Steigerungssatz, ggf. Begründung. Betrag = Punktzahl × 5,82873 Ct × Faktor, wird serverseitig neu berechnet. |
| Steigerungssatz | Vorgabe = Schwellenwert der Gebührenart: 2,3 (persönlich), 1,8 (technisch, Abschn. A/E/O), 1,15 (Labor, M), 1,0 (Zuschläge). Darüber Pflicht-Begründung (§ 12 Abs. 3), über Höchstsatz nur mit Haken „Vereinbarung nach § 2“. |
| Prüfmodul | `src/lib/goae/check.ts`, läuft live im Browser inkl. früherer Rechnungen des Patienten (`/api/goae/history`): Ausschlüsse am selben Tag, „nur neben“, Höchstanzahl je Sitzung/Behandlungsfall/6 Monate/Kalenderjahr, Nr. 1/5 neben Sonderleistungen C–O, Zuschlagsregeln, fehlendes Leistungsdatum/Diagnose. Fehler erfordern eine Bestätigung. |
| Diagnosen | ICD-10-GM-Suche (nach Import) oder Freitext; Zusatzkennzeichen G/V/Z/A und Seite R/L/B; Ausgabe als Klartext, Schlüssel oder beides. |
| PDF | Leistungstabelle nach § 12 Abs. 2 (Datum, Ziffer, Bezeichnung, Faktor, Betrag, Begründung), Diagnosen, Hinweis § 4 Nr. 14 UStG, Girocode (EPC-QR). |

## Einrichtung

1. **Schema** (Appwrite): `npm run migrate:medical` legt `invoices.medicalData` und `invoice_items.goaeData` an (verschlüsselt, sofern der Server das unterstützt). Desktop-Modus (SQLite) braucht keine Migration.
2. **ICD-10-GM**: beim BfArM die *Systematik, EDV-Fassung TXT* herunterladen, entpacken und
   `npm run import:icd10gm -- icd10gm2026syst_kodes.txt` ausführen. Ziel: `data/icd10gm.json`
   (bzw. `$RECHLY_DATA_DIR` / `$ICD10GM_FILE`). Die Datei ist per `.gitignore` ausgenommen.
3. **GOÄ-Katalog erweitern**: `src/lib/goae/catalog.ts` enthält einen geprüften Auszug (Abschnitt B, Zuschläge, einige C-Leistungen) mit Regeln. Fachgebietsziffern dort ergänzen; nicht hinterlegte Ziffern sind abrechenbar, werden aber nur auf Gebührenrahmen/Begründung geprüft.

## Grenzen

- „Sitzung“ wird über das Leistungsdatum angenähert; mehrere Inanspruchnahmen an einem Tag (mit Uhrzeit) bitte bestätigen.
- Behandlungsfall = 1 Monat ab erster Inanspruchnahme je Patient, ohne Unterscheidung nach Erkrankung.
- Die GOÄneu (frühestens 2027) ersetzt Steigerungsfaktoren weitgehend durch feste Beträge; Katalog und `fees.ts` sind dafür austauschbar gehalten.
- Maßgeblich ist der amtliche Verordnungstext; das Prüfmodul ist eine Plausibilitätshilfe.

## Docker (lokaler Testbetrieb)

Läuft im Desktop-Modus: SQLite statt Appwrite, **kein Login** – Port daher nur auf `127.0.0.1` gebunden.

```bash
docker compose up -d --build        # http://127.0.0.1:3020 (Port: RECHLY_PORT in .env)
docker compose logs -f rechly

# ICD-10-GM importieren (BfArM-Datei nach ./import legen)
docker compose --profile tools run --rm icd-import /import/icd10gm2026syst_kodes.txt

docker compose down                 # Daten bleiben im Volume rechly-data
docker compose down -v              # inkl. Daten löschen
```

Backup: `docker run --rm -v rechly_web_med_rechly-data:/data -v "$PWD":/b alpine tar czf /b/rechly-data.tgz -C /data .`
