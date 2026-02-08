export const stationTools = [
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
];

export class StationHandlers {
    constructor(browserManager) {
        this.browserManager = browserManager;
    }

    async listStations(country) {
        const page = await this.browserManager.ensureLoggedIn();

        await page.goto('https://quimby.airlinesim.aero/app/ops/stations?2', {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        if (country) {
            const selectLocator = page.locator('select[name*="country"]');
            const matchingValue = await page.evaluate((filterCountry) => {
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
                await page.waitForTimeout(2000);
            }
        }

        const data = await page.evaluate(() => {
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
        const page = await this.browserManager.ensureLoggedIn();
        const code = stationCode.toUpperCase();

        await page.goto(`https://quimby.airlinesim.aero/app/ops/stations/${code}`, {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const data = await page.evaluate(() => {
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
        const page = await this.browserManager.ensureLoggedIn();

        await page.goto('https://quimby.airlinesim.aero/app/ops/stations?2', {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const airportInput = page.locator('input[name*="airport-group"][name*="airport"]');
        await airportInput.fill(airportCode);
        await page.waitForTimeout(1500);

        const autocompleteItem = page.locator('.wicket-aa-container li, .wicket-aa li, [id*="wicket-autocomplete"] li').first();
        try {
            await autocompleteItem.waitFor({ timeout: 3000 });
            const suggestionText = await autocompleteItem.textContent();
            await autocompleteItem.click();
            await page.waitForTimeout(500);

            const submitButton = page.locator('button:has-text("Open Station"), input[type="submit"]');
            await submitButton.click();

            await page.waitForTimeout(3000);

            const currentUrl = page.url();
            const pageContent = await page.evaluate(() => {
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
        const page = await this.browserManager.ensureLoggedIn();
        const code = stationCode.toUpperCase();

        await page.goto(`https://quimby.airlinesim.aero/app/ops/stations/${code}`, {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const closeInfo = await page.evaluate(() => {
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
            await page.goto(closeInfo.closeLink.href, { waitUntil: 'networkidle' });
        } else {
            const closeButton = page.locator(`${closeInfo.closeLink.tagName.toLowerCase()}:has-text("${closeInfo.closeLink.text}")`);
            await closeButton.click();
        }
        await page.waitForTimeout(1000);

        const hasConfirmation = await page.evaluate(() => {
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
            const confirmBtn = page.locator(`button:has-text("${hasConfirmation.text}"), a:has-text("${hasConfirmation.text}")`).first();
            await confirmBtn.click();
            await page.waitForTimeout(2000);
        }

        const result = await page.evaluate(() => {
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

        const backOnOverview = page.url().includes('/app/ops/stations') && !page.url().includes(`/stations/${code}`);

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
}
