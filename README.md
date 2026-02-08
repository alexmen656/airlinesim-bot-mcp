# AirlineSim Bot

Ein Playwright-basierter Bot für AirlineSim mit **exakt analysierten Selektoren** der echten Login-Seite.

## 🔍 Analysierte Seitenstruktur

Die Selektoren wurden durch direkte Analyse der Login-Seite ermittelt:
- **Login Input:** `input[name="login"]` (type="text")
- **Password Input:** `input[name="password"]` (type="password")  
- **"Login merken" Checkbox:** `input[name="persistent"]` (type="checkbox")
- **Login Button:** `button.btn--primary.btn--full-width` mit Text "Log in"
- **Cookie Button:** `button.btn--primary` mit Text "Accept all cookies"

## Installation

```bash
npm install
npx playwright install chromium
```

## Verwendung

### Methode 1: Mit .env Datei (empfohlen)

1. Kopiere `.env.example` zu `.env`:
   ```bash
   cp .env.example .env
   ```

2. Editiere `.env` und trage deine Zugangsdaten ein:
   ```
   AIRLINESIM_EMAIL=deine@email.com
   AIRLINESIM_PASSWORD=DeinPasswort
   AIRLINESIM_REMEMBER=false
   ```

3. Starte den Bot:
   ```bash
   npm start
   ```

### Methode 2: Mit Start-Script

```bash
./start-bot.sh deine@email.com DeinPasswort
```

### Methode 3: Direkt mit Umgebungsvariablen

```bash
AIRLINESIM_EMAIL="deine@email.com" AIRLINESIM_PASSWORD="DeinPasswort" npm start
```

## Features

- ✅ **Exakte Selektoren** - basierend auf echter Seitenanalyse
- ✅ **Cookie-Banner** - wird automatisch akzeptiert wenn vorhanden
- ✅ **"Login merken"** - optional aktivierbar via AIRLINESIM_REMEMBER
- ✅ **Navigation zur Quimby Spielwelt** - automatisch nach Login
- ✅ **Screenshots** - bei Erfolg/Fehler für Debugging
- ✅ **Browser bleibt offen** - für weitere manuelle Aktionen

## Sicherheit

⚠️ **Niemals Zugangsdaten im Code speichern!**

Verwende immer:
- `.env` Datei (nicht committen!)
- Umgebungsvariablen
- Das Start-Script

Die `.env` Datei ist in `.gitignore` und wird nicht versioniert.

## Struktur

- [login.js](login.js) - Hauptscript mit präzisen Selektoren
- [inspect.js](inspect.js) - Tool zur Seitenanalyse
- [package.json](package.json) - Node.js Konfiguration
- [start-bot.sh](start-bot.sh) - Convenience Script
- [.env.example](.env.example) - Beispiel für Credentials

## Troubleshooting

Falls der Login nicht funktioniert:

1. Prüfe die Screenshots: `login-error.png` oder `error.png`
2. Verifiziere Email und Passwort
3. Führe `node inspect.js` aus um die Seitenstruktur neu zu analysieren
4. Prüfe ob die Seite geändert wurde

## Nächste Schritte

Erweitere den Bot um:
- 🛫 Flugpläne erstellen
- ✈️ Flugzeuge kaufen/leasing
- 📊 Routen analysieren  
- 💰 Preise optimieren
- 📈 Reports automatisieren
