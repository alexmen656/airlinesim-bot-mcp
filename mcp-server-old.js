import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from 'playwright';

class AirlineSimServer {
    constructor() {
        this.server = new Server(
            {
                name: "airlinesim-bot",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.browser = null;
        this.context = null;
        this.page = null;
        this.isLoggedIn = false;

        this.setupHandlers();
        this.setupErrorHandling();
    }

    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };

        process.on('SIGINT', async () => {
            await this.cleanup();
            process.exit(0);
        });
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async ensureLoggedIn() {
        if (this.isLoggedIn && this.page) {
            return;
        }

        const email = process.env.AIRLINESIM_EMAIL;
        const password = process.env.AIRLINESIM_PASSWORD;
        const rememberMe = process.env.AIRLINESIM_REMEMBER === 'true';

        if (!email || !password) {
            throw new Error('AIRLINESIM_EMAIL und AIRLINESIM_PASSWORD müssen gesetzt sein');
        }

        console.error('[MCP] Starte Browser und Login...');

        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });

        this.page = await this.context.newPage();

        // Login durchführen
        await this.page.goto('https://www.airlinesim.aero/auth/login', {
            waitUntil: 'networkidle'
        });

        try {
            const cookieButton = this.page.locator('button.btn--primary:has-text("Accept all cookies")');
            await cookieButton.click({ timeout: 3000 });
            await this.page.waitForTimeout(500);
        } catch (e) {
            // Kein Cookie Banner
        }

        await this.page.locator('input[name="login"]').fill(email);
        await this.page.locator('input[name="password"]').fill(password);

        if (rememberMe) {
            await this.page.locator('input[name="persistent"]').check();
        }

        await this.page.locator('button.btn--primary.btn--full-width:has-text("Log in")').click();

        try {
            await this.page.waitForURL((url) => !url.toString().includes('/auth/login'), {
                timeout: 10000
            });
        } catch (e) {
            throw new Error('Login fehlgeschlagen');
        }

        this.isLoggedIn = true;
        console.error('[MCP] Login erfolgreich');
    }

    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: "list_aircraft_manufacturers",
                    description: "Liste aller verfügbaren Flugzeughersteller mit kaufbaren Flugzeugen. Zeigt einen Überblick über alle Hersteller und deren Modelle.",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
                {
                    name: "get_aircraft_family",
                    description: "Ruft Details zu einer bestimmten Flugzeugfamilie ab. Zeigt alle Varianten und Modelle einer Familie mit technischen Daten.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            familyId: {
                                type: "string",
                                description: "Die ID der Flugzeugfamilie (z.B. '1200310')",
                            },
                        },
                        required: ["familyId"],
                    },
                },
                {
                    name: "get_aircraft_type",
                    description: "Ruft detaillierte Spezifikationen für einen spezifischen Flugzeugtyp ab. Enthält Preis, Reichweite, Sitze, Verbrauch, etc.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            typeId: {
                                type: "string",
                                description: "Die ID des Flugzeugtyps (z.B. '3155')",
                            },
                        },
                        required: ["typeId"],
                    },
                },
                {
                    name: "search_aircraft",
                    description: "Sucht Flugzeuge nach Kriterien wie Sitze, Reichweite, Preis. Nützlich um passende Flugzeuge für Routen zu finden.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            minSeats: {
                                type: "number",
                                description: "Minimale Sitzanzahl",
                            },
                            maxSeats: {
                                type: "number",
                                description: "Maximale Sitzanzahl",
                            },
                            minRange: {
                                type: "number",
                                description: "Minimale Reichweite in km",
                            },
                            manufacturer: {
                                type: "string",
                                description: "Herstellername zum Filtern (optional)",
                            },
                        },
                    },
                },
                {
                    name: "list_stations",
                    description: "Liste aller Stationen/Offices der Airline. Zeigt Übersicht mit Airport, Land, Abflüge, Passagier- und Cargo-Daten (Markt, Kapazität, Handling, Auslastung). Optional nach Land filtern.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            country: {
                                type: "string",
                                description: "Ländername zum Filtern (z.B. 'USA', 'Germany'). Leer lassen für alle Länder.",
                            },
                        },
                    },
                },
                {
                    name: "get_station_details",
                    description: "Ruft detaillierte Informationen zu einer bestimmten Station ab. Zeigt Handling-Kapazitäten, Gebäude, Terminal-Infos und weitere Details.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            stationCode: {
                                type: "string",
                                description: "IATA-Code des Flughafens (z.B. 'DFW', 'ORD', 'LAX')",
                            },
                        },
                        required: ["stationCode"],
                    },
                },
                {
                    name: "open_station",
                    description: "Eröffnet eine neue Station an einem Flughafen. Der Flughafen wird über den IATA-Code oder Namen angegeben.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            airportCode: {
                                type: "string",
                                description: "IATA-Code oder Name des Flughafens (z.B. 'JFK', 'London Heathrow')",
                            },
                        },
                        required: ["airportCode"],
                    },
                },
                {
                    name: "close_station",
                    description: "Schließt eine bestehende Station. ACHTUNG: Dies löscht die Station und alle damit verbundenen Daten.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            stationCode: {
                                type: "string",
                                description: "IATA-Code der zu schließenden Station (z.B. 'DFW')",
                            },
                        },
                        required: ["stationCode"],
                    },
                },
                {
                    name: "navigate_to_page",
                    description: "Navigiert zu einer beliebigen AirlineSim URL. Nützlich für direkten Zugriff auf spezielle Seiten.",
                    inputSchema: {
                        type: "object",
                        properties: {
                            url: {
                                type: "string",
                                description: "Die vollständige URL (muss mit https://quimby.airlinesim.aero/ beginnen)",
                            },
                        },
                        required: ["url"],
                    },
                },
                {
                    name: "get_page_content",
                    description: "Extrahiert den Text-Content der aktuellen Seite. Nützlich für Ad-hoc Analysen.",
                    inputSchema: {
                        type: "object",
                        properties: {},
                    },
                },
            ],
        }));

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                await this.ensureLoggedIn();

                switch (request.params.name) {
                    case "list_aircraft_manufacturers":
                        return await this.listAircraftManufacturers();

                    case "get_aircraft_family":
                        return await this.getAircraftFamily(request.params.arguments.familyId);

                    case "get_aircraft_type":
                        return await this.getAircraftType(request.params.arguments.typeId);

                    case "search_aircraft":
                        return await this.searchAircraft(request.params.arguments);

                    case "list_stations":
                        return await this.listStations(request.params.arguments?.country);

                    case "get_station_details":
                        return await this.getStationDetails(request.params.arguments.stationCode);

                    case "open_station":
                        return await this.openStation(request.params.arguments.airportCode);

                    case "close_station":
                        return await this.closeStation(request.params.arguments.stationCode);

                    case "navigate_to_page":
                        return await this.navigateToPage(request.params.arguments.url);

                    case "get_page_content":
                        return await this.getPageContent();

                    default:
                        throw new Error(`Unknown tool: ${request.params.name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    async listAircraftManufacturers() {
        await this.page.goto('https://quimby.airlinesim.aero/app/aircraft/manufacturers?2', {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        // Extrahiere Hersteller mit ihren Familien (echte Struktur von der Seite)
        const data = await this.page.evaluate(() => {
            const manufacturers = [];

            // Die Seite hat Sections mit h3/h4 Headers für Hersteller
            const headers = document.querySelectorAll('h3, h4');

            headers.forEach(header => {
                const manufacturerName = header.textContent.trim();
                const families = [];

                // Finde alle Links nach diesem Header bis zum nächsten Header
                let next = header.nextElementSibling;
                while (next && !['H2', 'H3', 'H4'].includes(next.tagName)) {
                    // Suche nach Links in diesem Element
                    const links = next.querySelectorAll('a.type-link[href*="aircraftsFamily"]');
                    links.forEach(link => {
                        const url = new URL(link.href);
                        families.push({
                            familyId: url.searchParams.get('id'),
                            name: link.textContent.trim(),
                            url: link.href
                        });
                    });
                    next = next.nextElementSibling;
                }

                if (families.length > 0) {
                    manufacturers.push({
                        manufacturer: manufacturerName,
                        familyCount: families.length,
                        families
                    });
                }
            });

            return {
                totalManufacturers: manufacturers.length,
                totalFamilies: manufacturers.reduce((sum, m) => sum + m.familyCount, 0),
                manufacturers
            };
        });

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    }

    async getAircraftFamily(familyId) {
        await this.page.goto(`https://quimby.airlinesim.aero/action/enterprise/aircraftsFamily?id=${familyId}`, {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        const familyData = await this.page.evaluate(() => {
            const data = {
                title: document.querySelector('h1, h2, h3')?.textContent?.trim() || 'Unknown',
                aircraft: []
            };

            // Extrahiere Tabelle mit Flugzeugen
            const table = document.querySelector('table');
            if (table) {
                const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th'))
                    .map(th => th.textContent.trim());

                const rows = table.querySelectorAll('tbody tr, tr');
                rows.forEach(tr => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length === 0) return;

                    const aircraft = {};

                    cells.forEach((cell, idx) => {
                        const headerName = headers[idx] || `Column${idx}`;
                        const link = cell.querySelector('a');

                        // Nur die erste Zelle (Model) hat den Namen und typeId
                        if (idx === 0 && link) {
                            aircraft.name = link.textContent.trim();
                            aircraft.url = link.href;
                            const url = new URL(link.href);
                            aircraft.typeId = url.searchParams.get('id');
                        }

                        // Parse verschiedene Spalten basierend auf Header
                        if (headerName.includes('Passengers')) aircraft.passengers = cell.textContent.trim();
                        else if (headerName.includes('Cargo')) aircraft.cargo = cell.textContent.trim();
                        else if (headerName.includes('Range')) aircraft.range = cell.textContent.trim();
                        else if (headerName.includes('Speed')) aircraft.speed = cell.textContent.trim();
                        else if (headerName.includes('takeoff')) aircraft.takeoffDistance = cell.textContent.trim();
                        else if (headerName.includes('landing')) aircraft.landingDistance = cell.textContent.trim();
                        else if (headerName.includes('Price')) aircraft.price = cell.textContent.trim();
                        else if (headerName.includes('new')) aircraft.availableAsNew = cell.textContent.trim();
                        else if (headerName.includes('Auction')) {
                            // On Auction hat auch einen Link, aber wir wollen nur die Zahl
                            aircraft.onAuction = cell.textContent.trim();
                        }
                        else if (headerName.includes('Remarks')) aircraft.remarks = cell.textContent.trim();
                    });

                    if (aircraft.name) {
                        data.aircraft.push(aircraft);
                    }
                });
            }

            return data;
        });

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(familyData, null, 2),
                },
            ],
        };
    }

    async getAircraftType(typeId) {
        await this.page.goto(`https://quimby.airlinesim.aero/action/enterprise/aircraftsType?id=${typeId}`, {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        const typeData = await this.page.evaluate(() => {
            const data = {
                name: document.querySelector('h1, h2, h3')?.textContent?.trim() || 'Unknown',
                specifications: {},
                sections: []
            };

            // Extrahiere alle Tabellen mit Specs
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length === 2) {
                        const key = cells[0].textContent.trim();
                        const value = cells[1].textContent.trim();
                        if (key && value) {
                            data.specifications[key] = value;
                        }
                    }
                });
            });

            // Extrahiere dl/dt/dd Listen
            const dls = document.querySelectorAll('dl');
            dls.forEach(dl => {
                const dts = dl.querySelectorAll('dt');
                const dds = dl.querySelectorAll('dd');
                dts.forEach((dt, idx) => {
                    if (dds[idx]) {
                        const key = dt.textContent.trim();
                        const value = dds[idx].textContent.trim();
                        if (key && value) {
                            data.specifications[key] = value;
                        }
                    }
                });
            });

            document.querySelectorAll('h1, h2, h3, h4').forEach(h => {
                const section = {
                    level: h.tagName,
                    title: h.textContent.trim(),
                    content: []
                };

                let next = h.nextElementSibling;
                while (next && !['H1', 'H2', 'H3', 'H4'].includes(next.tagName)) {
                    if (next.tagName === 'P') {
                        section.content.push(next.textContent.trim());
                    } else if (next.tagName === 'UL' || next.tagName === 'OL') {
                        const items = Array.from(next.querySelectorAll('li')).map(li => li.textContent.trim());
                        section.content.push(...items);
                    }
                    next = next.nextElementSibling;
                }

                if (section.title) {
                    data.sections.push(section);
                }
            });

            return data;
        });

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(typeData, null, 2),
                },
            ],
        };
    }

    async searchAircraft(criteria) {
        await this.page.goto('https://quimby.airlinesim.aero/app/aircraft/manufacturers?2', {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        const allFamilies = await this.page.evaluate(() => {
            const families = [];
            const links = document.querySelectorAll('a.type-link[href*="aircraftsFamily"]');

            links.forEach(link => {
                const url = new URL(link.href);
                const familyId = url.searchParams.get('id');
                if (familyId) {
                    families.push({
                        familyId,
                        name: link.textContent.trim(),
                        url: link.href
                    });
                }
            });

            return families;
        });

        const matchingAircraft = [];
        const { minSeats, maxSeats, minRange, manufacturer } = criteria;

        for (const family of allFamilies.slice(0, 20)) {
            if (manufacturer && !family.name.toUpperCase().includes(manufacturer.toUpperCase())) {
                continue;
            }

            await this.page.goto(family.url, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(500);

            const aircraft = await this.page.evaluate(() => {
                const results = [];
                const table = document.querySelector('table');
                if (!table) return results;

                const rows = table.querySelectorAll('tbody tr, tr');
                rows.forEach(tr => {
                    const cells = Array.from(tr.querySelectorAll('td'));
                    if (cells.length === 0) return;

                    const ac = {
                        name: cells[0]?.querySelector('a')?.textContent?.trim(),
                        passengers: cells[1]?.textContent?.trim(),
                        cargo: cells[2]?.textContent?.trim(),
                        range: cells[3]?.textContent?.trim(),
                        speed: cells[4]?.textContent?.trim(),
                        price: cells[7]?.textContent?.trim(),
                        url: cells[0]?.querySelector('a')?.href
                    };

                    if (ac.name) results.push(ac);
                });

                return results;
            });

            aircraft.forEach(ac => {
                const seats = parseInt(ac.passengers);
                const range = parseInt(ac.range?.split('-')[0]?.replace(/,/g, ''));

                let matches = true;
                if (minSeats && seats < minSeats) matches = false;
                if (maxSeats && seats > maxSeats) matches = false;
                if (minRange && range < minRange) matches = false;

                if (matches) {
                    matchingAircraft.push({ ...ac, family: family.name });
                }
            });
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        criteria,
                        totalMatches: matchingAircraft.length,
                        matches: matchingAircraft,
                        note: `Durchsucht ${Math.min(20, allFamilies.length)} von ${allFamilies.length} Familien`
                    }, null, 2),
                },
            ],
        };
    }

    async listStations(country) {
        await this.page.goto('https://quimby.airlinesim.aero/app/ops/stations?2', {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        if (country) {
            const selectLocator = this.page.locator('select[name*="country"]');
            const matchingValue = await this.page.evaluate((filterCountry) => {
                const select = document.querySelector('select[name*="country"]');
                if (!select) return null;
                const options = Array.from(select.options);
                const match = options.find(opt =>
                    opt.text.toLowerCase().includes(filterCountry.toLowerCase())
                );
                return match ? match.value : null;
            }, country);

            if (matchingValue) {
                await selectLocator.selectOption(matchingValue);
                await this.page.waitForTimeout(2000);
            }
        }

        const data = await this.page.evaluate(() => {
            const stations = [];
            const rows = document.querySelectorAll('table.offices tbody tr');

            rows.forEach(row => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 14) return;

                const airportLink = cells[2]?.querySelector('a');
                const codeSpan = cells[2]?.querySelector('span');
                const countryImg = cells[3]?.querySelector('img');

                const paxDemandImg = cells[5]?.querySelector('img');
                const cargoDemandImg = cells[9]?.querySelector('img');

                const paxLoadSpan = cells[8]?.querySelector('span');
                const cargoLoadSpan = cells[12]?.querySelector('span');

                const station = {
                    airport: airportLink?.textContent?.trim() || '',
                    code: codeSpan?.textContent?.trim() || '',
                    airportUrl: airportLink?.href || '',
                    country: countryImg?.title || '',
                    departures: cells[4]?.textContent?.trim() || '0',
                    passengers: {
                        marketDemand: paxDemandImg?.title?.replace('demand: ', '') || '',
                        capacity: cells[6]?.textContent?.trim() || '0',
                        handling: cells[7]?.textContent?.trim() || '0',
                        load: paxLoadSpan?.textContent?.trim() || '0%',
                        loadStatus: paxLoadSpan?.className || '',
                    },
                    cargo: {
                        marketDemand: cargoDemandImg?.title?.replace('demand: ', '') || '',
                        capacity: cells[10]?.textContent?.trim() || '0',
                        handling: cells[11]?.textContent?.trim() || '0',
                        load: cargoLoadSpan?.textContent?.trim() || '0%',
                        loadStatus: cargoLoadSpan?.className || '',
                    },
                    stationUrl: '',
                };

                const stationLink = cells[14]?.querySelector('a[href*="/app/ops/stations/"]');
                if (stationLink) {
                    station.stationUrl = stationLink.href;
                }

                if (station.code) {
                    stations.push(station);
                }
            });

            const countryOptions = [];
            const select = document.querySelector('select[name*="country"]');
            if (select) {
                Array.from(select.options).forEach(opt => {
                    if (opt.value) {
                        countryOptions.push({ value: opt.value, name: opt.text });
                    }
                });
            }

            return {
                totalStations: stations.length,
                stations,
                availableCountries: countryOptions,
            };
        });

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    }

    async getStationDetails(stationCode) {
        const code = stationCode.toUpperCase();
        await this.page.goto(`https://quimby.airlinesim.aero/app/ops/stations/${code}`, {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        const data = await this.page.evaluate(() => {
            const result = {
                title: document.querySelector('h2, h1')?.textContent?.trim() || '',
                tabs: [],
                details: {},
                tables: [],
            };

            const tabLinks = document.querySelectorAll('.nav-tabs li a');
            tabLinks.forEach(tab => {
                result.tabs.push(tab.textContent.trim());
            });

            const panels = document.querySelectorAll('.as-panel, .panel, .tab-pane');
            panels.forEach(panel => {
                const heading = panel.querySelector('h3, h4, .panel-title');
                const sectionName = heading?.textContent?.trim() || 'General';

                const dls = panel.querySelectorAll('dl');
                dls.forEach(dl => {
                    const dts = dl.querySelectorAll('dt');
                    const dds = dl.querySelectorAll('dd');
                    dts.forEach((dt, idx) => {
                        if (dds[idx]) {
                            const key = dt.textContent.trim();
                            const value = dds[idx].textContent.trim();
                            if (key && value) {
                                result.details[key] = value;
                            }
                        }
                    });
                });

                const tables = panel.querySelectorAll('table');
                tables.forEach(table => {
                    const tableData = {
                        section: sectionName,
                        headers: [],
                        rows: [],
                    };

                    const headerCells = table.querySelectorAll('thead th, tr:first-child th');
                    headerCells.forEach(th => {
                        tableData.headers.push(th.textContent.trim());
                    });

                    const bodyRows = table.querySelectorAll('tbody tr');
                    bodyRows.forEach(tr => {
                        const rowData = {};
                        const cells = Array.from(tr.querySelectorAll('td'));
                        cells.forEach((cell, idx) => {
                            const header = tableData.headers[idx] || `col${idx}`;
                            rowData[header] = cell.textContent.trim();
                        });
                        if (Object.keys(rowData).length > 0) {
                            tableData.rows.push(rowData);
                        }
                    });

                    if (tableData.rows.length > 0) {
                        result.tables.push(tableData);
                    }
                });

                const formGroups = panel.querySelectorAll('.form-group');
                formGroups.forEach(fg => {
                    const label = fg.querySelector('label, .control-label')?.textContent?.trim();
                    const value = fg.querySelector('input, select, .form-control-static, span:not(.control-label span)')?.textContent?.trim()
                        || fg.querySelector('input')?.value
                        || fg.querySelector('select option[selected]')?.textContent?.trim();
                    if (label && value) {
                        result.details[label] = value;
                    }
                });
            });

            const alerts = document.querySelectorAll('.alert, .callout');
            result.messages = [];
            alerts.forEach(alert => {
                result.messages.push(alert.textContent.trim());
            });

            const closeBtn = document.querySelector('a[href*="close"], button:has-text("close"), a:has-text("Close")');
            result.canClose = !!closeBtn;

            return result;
        });

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(data, null, 2),
                },
            ],
        };
    }

    async openStation(airportCode) {
        await this.page.goto('https://quimby.airlinesim.aero/app/ops/stations?2', {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        const airportInput = this.page.locator('input[name*="airport-group"][name*="airport"]');
        await airportInput.fill(airportCode);
        await this.page.waitForTimeout(1500);

        const autocompleteItem = this.page.locator('.wicket-aa-container li, .wicket-aa li, [id*="wicket-autocomplete"] li').first();
        try {
            await autocompleteItem.waitFor({ timeout: 3000 });
            const suggestionText = await autocompleteItem.textContent();
            await autocompleteItem.click();
            await this.page.waitForTimeout(500);

            const submitButton = this.page.locator('button:has-text("Open Station"), input[type="submit"]');
            await submitButton.click();

            await this.page.waitForTimeout(3000);

            const currentUrl = this.page.url();
            const pageContent = await this.page.evaluate(() => {
                const errors = document.querySelectorAll('.alert-danger, .feedbackPanelERROR, .error, .alert-warning');
                const errorMessages = Array.from(errors).map(e => e.textContent.trim()).filter(t => t);

                const successes = document.querySelectorAll('.alert-success, .feedbackPanelINFO');
                const successMessages = Array.from(successes).map(e => e.textContent.trim()).filter(t => t);

                return {
                    errors: errorMessages,
                    successes: successMessages,
                    title: document.querySelector('h2, h1')?.textContent?.trim() || '',
                };
            });

            const isStationPage = currentUrl.includes('/app/ops/stations/') && !currentUrl.endsWith('stations?2');

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: isStationPage || pageContent.successes.length > 0,
                            suggestion: suggestionText?.trim(),
                            url: currentUrl,
                            title: pageContent.title,
                            errors: pageContent.errors,
                            messages: pageContent.successes,
                        }, null, 2),
                    },
                ],
            };
        } catch (e) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Kein Flughafen gefunden für '${airportCode}'. Bitte IATA-Code (z.B. 'JFK') oder Flughafennamen verwenden.`,
                        }, null, 2),
                    },
                ],
            };
        }
    }

    async closeStation(stationCode) {
        const code = stationCode.toUpperCase();

        await this.page.goto(`https://quimby.airlinesim.aero/app/ops/stations/${code}`, {
            waitUntil: 'networkidle'
        });
        await this.page.waitForTimeout(1000);

        const closeInfo = await this.page.evaluate(() => {
            const closeLinks = document.querySelectorAll('a, button');
            let closeLink = null;

            for (const link of closeLinks) {
                const text = link.textContent.toLowerCase().trim();
                const href = link.href || '';
                if (text.includes('close') || text.includes('schließen') || text.includes('delete') ||
                    href.includes('close') || href.includes('delete')) {
                    closeLink = {
                        text: link.textContent.trim(),
                        href: link.href || '',
                        tagName: link.tagName,
                    };
                    break;
                }
            }

            return {
                title: document.querySelector('h2, h1')?.textContent?.trim() || '',
                closeLink,
                currentUrl: window.location.href,
            };
        });

        if (!closeInfo.closeLink) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            success: false,
                            error: `Kein Close/Delete-Button für Station ${code} gefunden. Die Station hat möglicherweise noch aktive Flüge oder kann aus anderen Gründen nicht geschlossen werden.`,
                            stationTitle: closeInfo.title,
                        }, null, 2),
                    },
                ],
            };
        }

        if (closeInfo.closeLink.href) {
            await this.page.goto(closeInfo.closeLink.href, { waitUntil: 'networkidle' });
        } else {
            const closeButton = this.page.locator(`${closeInfo.closeLink.tagName.toLowerCase()}:has-text("${closeInfo.closeLink.text}")`);
            await closeButton.click();
        }
        await this.page.waitForTimeout(1000);

        const hasConfirmation = await this.page.evaluate(() => {
            const confirmBtns = document.querySelectorAll('button, a, input[type="submit"]');
            for (const btn of confirmBtns) {
                const text = btn.textContent.toLowerCase().trim();
                if (text.includes('confirm') || text.includes('yes') || text.includes('bestätigen') || text.includes('ja')) {
                    return { found: true, text: btn.textContent.trim() };
                }
            }
            return { found: false };
        });

        if (hasConfirmation.found) {
            const confirmBtn = this.page.locator(`button:has-text("${hasConfirmation.text}"), a:has-text("${hasConfirmation.text}")`).first();
            await confirmBtn.click();
            await this.page.waitForTimeout(2000);
        }

        const result = await this.page.evaluate(() => {
            const errors = document.querySelectorAll('.alert-danger, .feedbackPanelERROR, .error');
            const errorMessages = Array.from(errors).map(e => e.textContent.trim()).filter(t => t);
            const successes = document.querySelectorAll('.alert-success, .feedbackPanelINFO');
            const successMessages = Array.from(successes).map(e => e.textContent.trim()).filter(t => t);

            return {
                url: window.location.href,
                title: document.querySelector('h2, h1')?.textContent?.trim() || '',
                errors: errorMessages,
                messages: successMessages,
            };
        });

        const backOnOverview = this.page.url().includes('/app/ops/stations') && !this.page.url().includes(`/stations/${code}`);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: backOnOverview || result.messages.length > 0,
                        closedStation: code,
                        ...result,
                    }, null, 2),
                },
            ],
        };
    }

    async navigateToPage(url) {
        if (!url.startsWith('https://quimby.airlinesim.aero/')) {
            throw new Error('URL muss mit https://quimby.airlinesim.aero/ beginnen');
        }

        await this.page.goto(url, { waitUntil: 'networkidle' });

        const pageInfo = await this.page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            content: document.body.textContent.slice(0, 5000),
        }));

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(pageInfo, null, 2),
                },
            ],
        };
    }

    async getPageContent() {
        const content = await this.page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            text: document.body.textContent,
            html: document.body.innerHTML.slice(0, 10000),
        }));

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(content, null, 2),
                },
            ],
        };
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("AirlineSim MCP Server läuft");
    }
}

// Start server
const server = new AirlineSimServer();
server.run().catch(console.error);
