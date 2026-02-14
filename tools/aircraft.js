export const aircraftTools = [
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
        name: "get_aircraft_performance",
        description: "Berechnet Performance-Daten für einen Flugzeugtyp auf einer Route. Zeigt Flugzeit, ob Landebahnen ausreichend sind, Reichweite, Treibstoffverbrauch und ob die Route machbar ist.",
        inputSchema: {
            type: "object",
            properties: {
                typeId: {
                    type: "string",
                    description: "Die ID des Flugzeugtyps (z.B. '3155')",
                },
                origin: {
                    type: "string",
                    description: "IATA-Code des Abflughafens (z.B. 'DFW')",
                },
                destination: {
                    type: "string",
                    description: "IATA-Code des Zielhafens (z.B. 'ORD')",
                },
                cruiseSpeed: {
                    type: "number",
                    description: "Reisegeschwindigkeit in km/h (optional, Standard: 840)",
                },
            },
            required: ["typeId", "origin", "destination"],
        },
    },
];

export class AircraftHandlers {
    constructor(browserManager) {
        this.browserManager = browserManager;
    }

    async listAircraftManufacturers() {
        const page = await this.browserManager.ensureLoggedIn();

        await page.goto('https://quimby.airlinesim.aero/app/aircraft/manufacturers?2', {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const data = await page.evaluate(() => {
            const manufacturers = [];
            const headers = document.querySelectorAll('h3, h4');

            headers.forEach(header => {
                const manufacturerName = header.textContent.trim();
                const families = [];

                let next = header.nextElementSibling;
                while (next && !['H2', 'H3', 'H4'].includes(next.tagName)) {
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
        const page = await this.browserManager.ensureLoggedIn();

        await page.goto(`https://quimby.airlinesim.aero/action/enterprise/aircraftsFamily?id=${familyId}`, {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const familyData = await page.evaluate(() => {
            const data = {
                title: document.querySelector('h1, h2, h3')?.textContent?.trim() || 'Unknown',
                aircraft: []
            };

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

                        if (idx === 0 && link) {
                            aircraft.name = link.textContent.trim();
                            aircraft.url = link.href;
                            const url = new URL(link.href);
                            aircraft.typeId = url.searchParams.get('id');
                        }

                        if (headerName.includes('Passengers')) aircraft.passengers = cell.textContent.trim();
                        else if (headerName.includes('Cargo')) aircraft.cargo = cell.textContent.trim();
                        else if (headerName.includes('Range')) aircraft.range = cell.textContent.trim();
                        else if (headerName.includes('Speed')) aircraft.speed = cell.textContent.trim();
                        else if (headerName.includes('takeoff')) aircraft.takeoffDistance = cell.textContent.trim();
                        else if (headerName.includes('landing')) aircraft.landingDistance = cell.textContent.trim();
                        else if (headerName.includes('Price')) aircraft.price = cell.textContent.trim();
                        else if (headerName.includes('new')) aircraft.availableAsNew = cell.textContent.trim();
                        else if (headerName.includes('Auction')) aircraft.onAuction = cell.textContent.trim();
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
        const page = await this.browserManager.ensureLoggedIn();

        await page.goto(`https://quimby.airlinesim.aero/action/enterprise/aircraftsType?id=${typeId}`, {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const typeData = await page.evaluate(() => {
            const data = {
                name: document.querySelector('h1, h2, h3')?.textContent?.trim() || 'Unknown',
                specifications: {},
                sections: []
            };

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
        const page = await this.browserManager.ensureLoggedIn();

        await page.goto('https://quimby.airlinesim.aero/app/aircraft/manufacturers?2', {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const allFamilies = await page.evaluate(() => {
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

            await page.goto(family.url, { waitUntil: 'networkidle' });
            await page.waitForTimeout(500);

            const aircraft = await page.evaluate(() => {
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

    async getAircraftPerformance(typeId, origin, destination, cruiseSpeed = 840) {
        const page = await this.browserManager.ensureLoggedIn();

        const url = `https://quimby.airlinesim.aero/action/enterprise/aircraftsPerformance?id=${typeId}&dep=${origin.toUpperCase()}&arr=${destination.toUpperCase()}&speed=${cruiseSpeed}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        const performanceData = await page.evaluate(() => {
            const result = {
                aircraftName: '',
                flightTime: '',
                atcFee: '',
                airportFee: '',
                takeoffStatus: '',
                landingStatus: '',
                flightDistance: 0,
                maxRange: 0,
                routeRestrictions: '',
                payload: {},
                fuelConsumption: '',
                feasible: true
            };

            const nameEl = document.querySelector('h1, h2, h3');
            if (nameEl) {
                result.aircraftName = nameEl.textContent.trim();
            }

            const perfTables = document.querySelectorAll('.as-panel .as-table-well table');
            perfTables.forEach(table => {
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const th = row.querySelector('th');
                    const td = row.querySelector('td');
                    if (th && td) {
                        const label = th.textContent.trim();
                        const value = td.textContent.trim();

                        if (label.includes('Flight time')) {
                            result.flightTime = value;
                        } else if (label.includes('Air traffic control fee')) {
                            result.atcFee = value;
                        } else if (label.includes('Airport fee')) {
                            result.airportFee = value;
                        } else if (label.includes('Calculated payload')) {
                            result.payload.calculated = value;
                        } else if (label.includes('Maximum payload')) {
                            result.payload.maximum = value;
                        } else if (label.includes('% of maximum')) {
                            result.payload.percentage = value;
                        } else if (label.includes('Fuel consumption')) {
                            result.fuelConsumption = value;
                        }
                    }
                });
            });

            const allRows = document.querySelectorAll('tbody tr');
            allRows.forEach(row => {
                const th = row.querySelector('th');
                if (!th) return;

                const label = th.textContent.trim();
                const statusCell = row.querySelector('td:last-child span');

                if (label.includes('Ground roll takeoff')) {
                    if (statusCell) {
                        result.takeoffStatus = statusCell.textContent.trim();
                        if (!statusCell.classList.contains('good')) {
                            result.feasible = false;
                        }
                    }
                } else if (label.includes('Ground roll landing')) {
                    if (statusCell) {
                        result.landingStatus = statusCell.textContent.trim();
                        if (!statusCell.classList.contains('good')) {
                            result.feasible = false;
                        }
                    }
                } else if (label.includes('Flight distance')) {
                    const cells = row.querySelectorAll('td');
                    const distances = [];
                    cells.forEach(cell => {
                        const text = cell.textContent.trim();
                        const match = text.match(/([0-9,]+)\s*km/);
                        if (match) {
                            distances.push(parseInt(match[1].replace(/,/g, '')));
                        }
                    });

                    if (distances.length >= 2) {
                        distances.sort((a, b) => a - b);
                        result.flightDistance = distances[0];
                        result.maxRange = distances[distances.length - 1];
                    } else if (distances.length === 1) {
                        result.flightDistance = distances[0];
                    }

                    if (statusCell && !statusCell.classList.contains('good')) {
                        result.feasible = false;
                    }
                } else if (label.includes('Route Restrictions')) {
                    if (statusCell) {
                        result.routeRestrictions = statusCell.textContent.trim();
                        if (!statusCell.classList.contains('good')) {
                            result.feasible = false;
                        }
                    }
                }
            });

            return result;
        });

        const rangeCheck = {
            flightDistance: performanceData.flightDistance,
            maxRange: performanceData.maxRange,
            sufficient: performanceData.flightDistance <= performanceData.maxRange
        };

        const finalFeasibility = performanceData.feasible && rangeCheck.sufficient;

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        aircraft: performanceData.aircraftName,
                        route: `${origin.toUpperCase()}-${destination.toUpperCase()}`,
                        feasible: finalFeasibility,
                        flightTime: performanceData.flightTime,
                        flightDistance: `${performanceData.flightDistance} km`,
                        rangeCheck: rangeCheck,
                        runwayChecks: {
                            takeoff: performanceData.takeoffStatus,
                            landing: performanceData.landingStatus
                        },
                        routeRestrictions: performanceData.routeRestrictions,
                        costs: {
                            atcFee: performanceData.atcFee,
                            airportFee: performanceData.airportFee
                        },
                        fuel: performanceData.fuelConsumption,
                        payload: performanceData.payload
                    }, null, 2),
                },
            ],
        };
    }
}
