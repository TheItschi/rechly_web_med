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
2. **ICD-10-GM**: *Einstellungen → ICD-10 Codes*: die BfArM-Systematik (EDV-Fassung TXT) als ZIP oder
   `icd10gmJJJJsyst_kodes.txt` hochladen. Das Alphabetische Verzeichnis wird erkannt und abgelehnt.
   Alternativ per CLI: `npm run import:icd10gm -- <zip|txt>`. Ablage: `<RECHLY_DATA_DIR|./data>/icd10gm.json`.
3. **GOÄ-Katalog**: *Einstellungen → GOÄ-Ziffern*: aktuellen Katalog als CSV exportieren, in Excel ergänzen
   (Spalten siehe Hinweis im Reiter), wieder hochladen – wahlweise *ergänzt* oder *ersetzt* er den
   mitgelieferten Auszug. Ablage: `<RECHLY_DATA_DIR|./data>/goae-katalog.json`. Nicht hinterlegte Ziffern
   sind abrechenbar, werden aber nur auf Gebührenrahmen/Begründung geprüft.

Hinweis: Beide Kataloge gelten instanzweit. Im Appwrite-Mehrbenutzerbetrieb kann jeder angemeldete Nutzer sie ersetzen.

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

# ICD-10-GM / GOÄ: bequemer über Einstellungen in der App; alternativ per CLI
docker compose --profile tools run --rm icd-import /import/icd10gm2026syst-meta.zip

docker compose down                 # Daten bleiben im Volume rechly-data
docker compose down -v              # inkl. Daten löschen
```

### Datensicherung (Windows)

```bat
scripts\backup.bat                          :: -> backups\rechly-JJJJMMTT-HHMMSS.tgz
scripts\backup.bat \\nas\backup\rechly      :: zusaetzlich Kopie auf NAS / externe Platte
scripts\restore.bat                         :: listet vorhandene Backups
scripts\restore.bat rechly-20261104-130000.tgz
```

- Sicherung im laufenden Betrieb: die SQLite-Datenbank wird per `VACUUM INTO` konsistent kopiert,
  dazu Belege und Kataloge. Aufbewahrt werden die letzten 30 Backups (`set KEEP=…`, `0` = alle).
- Wiederherstellung prüft das Archiv, fragt nach, legt vorher ein Sicherheitsbackup an, stoppt die App,
  ersetzt die Daten und startet die App wieder.
- Automatisch: Aufgabenplanung → Aufgabe erstellen → Aktion „Programm starten“:
  Programm `cmd.exe`, Argumente `/c "C:\Pfad\rechly_web_med\scripts\backup.bat" >> "C:\Pfad\rechly_web_med\backups\backup.log" 2>&1`.
- Die Archive enthalten Gesundheitsdaten – nur verschlüsselt (BitLocker, verschlüsseltes NAS) außer Haus lagern.
