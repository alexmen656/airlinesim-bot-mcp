# AirlineSim Bot & MCP Server

Ein **Playwright-basierter Bot** und **MCP (Model Context Protocol) Server** für AirlineSim. Ermöglicht AI-gesteuerte Flottenverwaltung mit 1000+ Flugzeugen!

## 🚀 Features

### Login Bot
- ✅ **Exakte Selektoren** - basierend auf echter Seitenanalyse
- ✅ **Cookie-Banner** - automatisch akzeptiert
- ✅ **"Login merken"** - optional via AIRLINESIM_REMEMBER
- ✅ **Screenshots** - bei Erfolg/Fehler für Debugging

### MCP Server für AI
- 🤖 **AI-gesteuerte Flottenverwaltung** - Claude kann Flugzeuge analysieren
- ✈️ **Flugzeugdatenbank** - Zugriff auf alle kaufbaren Flugzeuge
- 📊 **Detaillierte Specs** - Preis, Reichweite, Sitze, Verbrauch
- 🔍 **Suche & Filter** - Finde passende Flugzeuge für Routen
- 🌐 **Browser-Integration** - Immer eingeloggt und bereit

## 📦 Installation

```bash
npm install
npx playwright install chromium
```

## 🎮 Verwendung

### Methode 1: Login Bot (Standalone)

```bash
# .env erstellen
cp .env.example .env
# Zugangsdaten eintragen und:
npm start
```

### Methode 2: MCP Server für Claude Desktop

1. **Config erstellen/bearbeiten:**
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Füge hinzu:**
   ```json
   {
     "mcpServers": {
       "airlinesim": {
         "command": "node",
         "args": ["/Users/alexpolan/airlinesim-bot-mcp/mcp-server.js"],
         "env": {
           "AIRLINESIM_EMAIL": "deine@email.com",
           "AIRLINESIM_PASSWORD": "DeinPasswort",
           "AIRLINESIM_REMEMBER": "true"
         }
       }
     }
   }
   ```

3. **Claude Desktop neu starten**

4. **Teste mit Claude:**
   ```
   Zeige mir alle verfügbaren Flugzeughersteller in AirlineSim
   ```

Siehe [MCP_SETUP.md](MCP_SETUP.md) für Details.

## 🔧 MCP Tools

Der Server bietet folgende Tools für die AI:

| Tool | Beschreibung |
|------|-------------|
| `list_aircraft_manufacturers` | Alle Flugzeughersteller mit kaufbaren Modellen |
| `get_aircraft_family` | Details zu einer Flugzeugfamilie (alle Varianten) |
| `get_aircraft_type` | Detaillierte Specs eines spezifischen Typs |
| `search_aircraft` | Suche nach Sitze, Reichweite, Preis |
| `navigate_to_page` | Navigiere zu beliebiger AirlineSim URL |
| `get_page_content` | Extrahiere aktuellen Seiteninhalt |

## 🔍 Analysierte Seitenstruktur

Die Selektoren wurden durch direkte Analyse ermittelt:
- **Login Input:** `input[name="login"]`
- **Password Input:** `input[name="password"]`  
- **"Login merken" Checkbox:** `input[name="persistent"]`
- **Login Button:** `button.btn--primary.btn--full-width`
- **Cookie Button:** `button.btn--primary:has-text("Accept all cookies")`

## 📁 Struktur

```
airlinesim-bot-mcp/
├── login.js              # Standalone Login Bot
├── mcp-server.js         # MCP Server für Claude
├── inspect.js            # Tool zur Seitenanalyse
├── package.json          # Dependencies
├── .env.example          # Beispiel Credentials
├── MCP_SETUP.md          # MCP Konfigurations-Guide
├── README.md             # Diese Datei
└── start-bot.sh          # Convenience Script
```

## 🛡️ Sicherheit

⚠️ **Niemals Zugangsdaten committen!**

- Nutze `.env` Datei (in `.gitignore`)
- Oder Umgebungsvariablen
- In Claude Config direkt eintragen

## 🧪 Testing

```bash
# Login Bot testen
./start-bot.sh deine@email.com DeinPasswort

# MCP Server testen (benötigt Claude Desktop)
# Siehe MCP_SETUP.md
```

## 🎯 Use Cases mit AI

Mit Claude Desktop und dem MCP Server kannst du:

- **"Finde alle Airbus A320 Varianten mit über 150 Sitzen"**
- **"Zeige mir die günstigsten Langstreckenflugzeuge"**
- **"Welches Flugzeug eignet sich für Frankfurt-New York?"**
- **"Liste alle Boeing 737 Modelle mit Preisen"**
- **"Analysiere die gesamte Flugzeugdatenbank"**

Die AI hat vollen Zugriff auf die AirlineSim Datenbank und kann komplexe Analysen durchführen!

## 🚧 Nächste Schritte

Erweiterungen für den MCP Server:
- 🛫 Routen-Management (erstellen, bearbeiten, löschen)
- ✈️ Flugzeuge kaufen/verkaufen/leasen
- 📊 Finanz-Reports abrufen
- 🗺️ Airport-Informationen
- 📈 Nachfrage-Analysen
- 💰 Preis-Optimierung
- 👥 Mitarbeiter-Management

## 📝 Troubleshooting

**Login funktioniert nicht:**
- Prüfe Screenshots: `login-error.png`
- Verifiziere Credentials
- Führe `node inspect.js` aus

**MCP Server startet nicht:**
- Prüfe Claude Desktop Logs
- Verifiziere Config-Pfade
- Teste mit `./test-mcp.sh`

**Tools nicht sichtbar in Claude:**
- Claude Desktop neu starten
- Config-Syntax prüfen (JSON!)
- Pfad zum mcp-server.js korrekt?
