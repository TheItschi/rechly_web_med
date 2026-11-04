@echo off
rem ======================================================================
rem  Rechly-Med Datensicherung (Docker)
rem
rem  Aufruf:   scripts\backup.bat [Zusatzziel]
rem            z. B. scripts\backup.bat \\nas\backup\rechly
rem
rem  Erzeugt   backups\rechly-JJJJMMTT-HHMMSS.tgz  (Datenbank, Belege,
rem            ICD-10- und GOAe-Katalog). Laeuft die App, wird die
rem            Datenbank per SQLite "VACUUM INTO" konsistent im laufenden
rem            Betrieb gesichert - kein Anhalten noetig.
rem
rem  Optional  set KEEP=30          Anzahl aufzubewahrender Backups (0 = alle)
rem            Zusatzziel           Kopie z. B. auf NAS oder externe Platte
rem
rem  Exitcode  0 = ok, 1 = Fehler (fuer die Aufgabenplanung)
rem ======================================================================
setlocal EnableExtensions EnableDelayedExpansion

set "CONTAINER=rechly-med"
set "HELPER_IMAGE=alpine:3.20"
if not defined KEEP set "KEEP=30"
for %%I in ("%~dp0..\backups") do set "BACKUP_DIR=%%~fI"

docker info >nul 2>&1 || (echo [FEHLER] Docker laeuft nicht - Docker Desktop starten. & goto :fail)
docker inspect "%CONTAINER%" >nul 2>&1 || (echo [FEHLER] Container %CONTAINER% nicht gefunden - zuerst "docker compose up -d". & goto :fail)
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%" || goto :fail

for /f %%T in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%T"
set "NAME=rechly-%TS%.tgz"

set "SNAP=0"
set "RUNNING=false"
for /f %%R in ('docker inspect -f "{{.State.Running}}" "%CONTAINER%"') do set "RUNNING=%%R"

if /i "%RUNNING%"=="true" (
    echo Erstelle konsistenten Datenbank-Snapshot im laufenden Betrieb ...
    docker exec "%CONTAINER%" node --no-warnings -e "const fs=require('node:fs'),s='/data/.backup-snapshot.sqlite',db='/data/rechly.sqlite';fs.rmSync(s,{force:true});if(fs.existsSync(db))new (require('node:sqlite').DatabaseSync)(db).exec(`VACUUM INTO '${s}'`)"
    if errorlevel 1 (echo [FEHLER] Snapshot fehlgeschlagen. & goto :fail)
    set "SNAP=1"
) else (
    echo App ist gestoppt - sichere Datenverzeichnis direkt.
)

echo Schreibe %BACKUP_DIR%\%NAME% ...
docker run --rm --volumes-from "%CONTAINER%" -v "%BACKUP_DIR%:/backup" %HELPER_IMAGE% sh -c "set -e; mkdir /stage; cp -a /data/. /stage/; if [ %SNAP% = 1 ] && [ -f /stage/.backup-snapshot.sqlite ]; then rm -f /stage/rechly.sqlite /stage/rechly.sqlite-wal /stage/rechly.sqlite-shm; mv /stage/.backup-snapshot.sqlite /stage/rechly.sqlite; fi; rm -f /stage/.backup-snapshot.sqlite; tar czf /backup/%NAME% -C /stage .; rm -f /data/.backup-snapshot.sqlite; tar tzf /backup/%NAME% > /dev/null"
if errorlevel 1 (echo [FEHLER] Archiv konnte nicht erstellt werden. & goto :fail)

if not "%~1"=="" (
    if not exist "%~1\" mkdir "%~1"
    copy /y "%BACKUP_DIR%\%NAME%" "%~1\" >nul
    if errorlevel 1 (echo [FEHLER] Kopie nach %~1 fehlgeschlagen. & goto :fail)
    echo Kopie abgelegt in %~1
)

if %KEEP% gtr 0 (
    set /a COUNT=0
    for /f "delims=" %%F in ('dir /b /o-n "%BACKUP_DIR%\rechly-*.tgz" 2^>nul') do (
        set /a COUNT+=1
        if !COUNT! gtr %KEEP% (
            del "%BACKUP_DIR%\%%F"
            echo Altes Backup entfernt: %%F
        )
    )
)

echo [OK] Backup erstellt: %BACKUP_DIR%\%NAME%
endlocal & set "RECHLY_LAST_BACKUP=%BACKUP_DIR%\%NAME%"
exit /b 0

:fail
endlocal
exit /b 1
