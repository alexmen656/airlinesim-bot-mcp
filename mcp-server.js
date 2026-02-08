import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { chromium } from 'playwright';
//import dotenv from 'dotenv';

//dotenv.config();

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
            headless: true, // Headless für MCP Server
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

    async navigateToPage(url) {
        if (!url.startsWith('https://quimby.airlinesim.aero/')) {
            throw new Error('URL muss mit https://quimby.airlinesim.aero/ beginnen');
        }

        await this.page.goto(url, { waitUntil: 'networkidle' });

        const pageInfo = await this.page.evaluate(() => ({
            url: window.location.href,
            title: document.title,
            content: document.body.textContent.slice(0, 5000), // Erste 5000 Zeichen
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
