@echo off
rem ======================================================================
rem  Rechly-Med Wiederherstellung (Docker)
rem
rem  Aufruf:   scripts\restore.bat <Backup-Datei>
rem            z. B. scripts\restore.bat rechly-20261104-130000.tgz
rem            (Dateiname genuegt fuer Backups im Ordner backups)
rem
rem  Ablauf    1. Archiv pruefen   2. Rueckfrage   3. Sicherheitsbackup
rem            des aktuellen Stands   4. App stoppen, Daten ersetzen,
rem            App starten
rem ======================================================================
setlocal EnableExtensions

set "CONTAINER=rechly-med"
set "HELPER_IMAGE=alpine:3.20"
for %%I in ("%~dp0..\backups") do set "BACKUP_DIR=%%~fI"

if "%~1"=="" (
    echo Verwendung: scripts\restore.bat ^<Backup-Datei^>
    echo.
    echo Vorhandene Backups in %BACKUP_DIR% ^(neueste zuerst^):
    dir /b /o-n "%BACKUP_DIR%\rechly-*.tgz" 2>nul
    goto :fail
)

set "ARCHIVE=%~f1"
if not exist "%ARCHIVE%" if exist "%BACKUP_DIR%\%~nx1" set "ARCHIVE=%BACKUP_DIR%\%~nx1"
if not exist "%ARCHIVE%" (echo [FEHLER] Datei nicht gefunden: %~1 & goto :fail)
for %%I in ("%ARCHIVE%") do (
    set "ADIR=%%~dpI"
    set "AFILE=%%~nxI"
)
set "ADIR=%ADIR:~0,-1%"

docker info >nul 2>&1 || (echo [FEHLER] Docker laeuft nicht - Docker Desktop starten. & goto :fail)
docker inspect "%CONTAINER%" >nul 2>&1 || (echo [FEHLER] Container %CONTAINER% nicht gefunden - zuerst "docker compose up -d". & goto :fail)

echo Pruefe Archiv %AFILE% ...
docker run --rm -v "%ADIR%:/restore:ro" %HELPER_IMAGE% sh -c "tar tzf '/restore/%AFILE%' | grep -qx './rechly.sqlite'"
if errorlevel 1 (echo [FEHLER] Archiv ist beschaedigt oder enthaelt keine Rechly-Datenbank. & goto :fail)

echo.
echo ACHTUNG: Alle aktuellen Daten werden durch den Stand aus
echo          %ARCHIVE%
echo          ersetzt. Vorher wird automatisch ein Sicherheitsbackup erstellt.
choice /c JN /m "Fortfahren"
if errorlevel 2 (echo Abgebrochen. & goto :fail)

echo.
echo Sicherheitsbackup des aktuellen Stands ...
set "KEEP=0"
call "%~dp0backup.bat"
if errorlevel 1 (echo [FEHLER] Sicherheitsbackup fehlgeschlagen - Wiederherstellung abgebrochen. & goto :fail)

echo.
echo Stoppe App ...
docker stop "%CONTAINER%" >nul
if errorlevel 1 (echo [FEHLER] Container konnte nicht gestoppt werden. & goto :fail)

echo Stelle Daten wieder her ...
docker run --rm --volumes-from "%CONTAINER%" -v "%ADIR%:/restore:ro" %HELPER_IMAGE% sh -c "set -e; rm -rf /data/..?* /data/.[!.]* /data/*; tar xzf '/restore/%AFILE%' -C /data"
set "RC=%errorlevel%"

echo Starte App ...
docker start "%CONTAINER%" >nul

if not "%RC%"=="0" (
    echo [FEHLER] Wiederherstellung fehlgeschlagen. Der vorherige Stand liegt als
    echo          Sicherheitsbackup in %RECHLY_LAST_BACKUP%
    goto :fail
)
echo [OK] Wiederhergestellt aus %AFILE%.
echo      Vorheriger Stand gesichert in %RECHLY_LAST_BACKUP%
endlocal
exit /b 0

:fail
endlocal
exit /b 1
