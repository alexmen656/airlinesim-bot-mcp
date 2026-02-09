export const inventoryTools = [
    {
        name: "get_route_inventory",
        description: "Ruft Inventory-Daten für eine Route ab. Zeigt Load Summary (Auslastung für Y, C, F, Cargo über mehrere Tage) und aktuelle Preiseinstellungen.",
        inputSchema: {
            type: "object",
            properties: {
                origin: {
                    type: "string",
                    description: "IATA-Code des Abflughafens (z.B. 'DFW')",
                },
                destination: {
                    type: "string",
                    description: "IATA-Code des Zielhafens (z.B. 'ORD', 'ABI')",
                },
            },
            required: ["origin", "destination"],
        },
    },
    {
        name: "set_route_prices",
        description: "Setzt neue Preise für eine Route. Alle Preise müssen angegeben werden (Y, C, F, Cargo).",
        inputSchema: {
            type: "object",
            properties: {
                origin: {
                    type: "string",
                    description: "IATA-Code des Abflughafens (z.B. 'DFW')",
                },
                destination: {
                    type: "string",
                    description: "IATA-Code des Zielhafens (z.B. 'ORD', 'ABI')",
                },
                priceY: {
                    type: "number",
                    description: "Neuer Preis für Economy Class (Y) in AS$",
                },
                priceC: {
                    type: "number",
                    description: "Neuer Preis für Business Class (C) in AS$",
                },
                priceF: {
                    type: "number",
                    description: "Neuer Preis für First Class (F) in AS$",
                },
                priceCargo: {
                    type: "number",
                    description: "Neuer Preis für Cargo in AS$",
                },
            },
            required: ["origin", "destination", "priceY", "priceC", "priceF", "priceCargo"],
        },
    },
];

export class InventoryHandlers {
    constructor(browserManager) {
        this.browserManager = browserManager;
    }

    async getRouteInventory(origin, destination) {
        const page = await this.browserManager.ensureLoggedIn();

        const routeCode = `${origin}${destination}`.toUpperCase();
        await page.goto(`https://quimby.airlinesim.aero/app/com/inventory/${routeCode}`, {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        const data = await page.evaluate(() => {
            const result = {
                route: '',
                loadSummary: [],
                pricing: []
            };

            result.route = window.location.pathname.split('/').pop();

            const loadTable = document.querySelector('.as-panel .as-table-well table');
            if (loadTable) {
                const headerRow = loadTable.querySelector('thead tr');
                const dates = [];
                if (headerRow) {
                    const dateHeaders = headerRow.querySelectorAll('th span');
                    dateHeaders.forEach(span => {
                        dates.push(span.textContent.trim());
                    });
                }

                const bodyRows = loadTable.querySelectorAll('tbody tr');
                bodyRows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length > 1) {
                        const serviceClass = cells[0].textContent.trim();
                        const dailyData = [];

                        for (let i = 1; i < cells.length; i++) {
                            const spans = cells[i].querySelectorAll('span');
                            if (spans.length >= 3) {
                                const booked = spans[0].textContent.trim();
                                const capacity = spans[1].textContent.trim();
                                const percentage = spans[2].textContent.trim();

                                dailyData.push({
                                    date: dates[i - 1] || '',
                                    booked: booked,
                                    capacity: capacity,
                                    percentage: percentage
                                });
                            }
                        }

                        result.loadSummary.push({
                            serviceClass: serviceClass,
                            data: dailyData
                        });
                    }
                });
            }

            const pricingTable = document.querySelector('.pricing .as-table-well table tbody');
            if (pricingTable) {
                const rows = pricingTable.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        const serviceClass = cells[0].textContent.trim();
                        const currentPrice = cells[1].textContent.trim();
                        const newPriceInput = cells[2].querySelector('input');
                        const defaultPriceSpan = cells[4].querySelector('span');

                        result.pricing.push({
                            serviceClass: serviceClass,
                            currentPrice: currentPrice,
                            newPrice: newPriceInput ? newPriceInput.value : '',
                            defaultPrice: defaultPriceSpan ? defaultPriceSpan.textContent.trim() : ''
                        });
                    }
                });
            }

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

    async setRoutePrices(origin, destination, priceY, priceC, priceF, priceCargo) {
        const page = await this.browserManager.ensureLoggedIn();

        const routeCode = `${origin}${destination}`.toUpperCase();
        await page.goto(`https://quimby.airlinesim.aero/app/com/inventory/${routeCode}`, {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(1000);

        await page.evaluate((prices) => {
            const pricingTable = document.querySelector('.pricing .as-table-well table tbody');
            if (!pricingTable) {
                throw new Error('Pricing table not found');
            }

            const rows = pricingTable.querySelectorAll('tr');
            const priceMap = {
                'Y': prices.priceY,
                'C': prices.priceC,
                'F': prices.priceF,
                'Cargo': prices.priceCargo
            };

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 3) {
                    const serviceClass = cells[0].textContent.trim();
                    const input = cells[2].querySelector('input');

                    if (input && priceMap[serviceClass] !== undefined) {
                        input.value = priceMap[serviceClass];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        }, { priceY, priceC, priceF, priceCargo });

        await page.waitForTimeout(500);

        const submitButton = await page.locator('button[type="submit"]').filter({ hasText: /apply prices and settings/i });
        await submitButton.click();
        await page.waitForTimeout(2000);

        const result = await page.evaluate(() => {
            const pricingTable = document.querySelector('.pricing .as-table-well table tbody');
            const updatedPrices = [];

            if (pricingTable) {
                const rows = pricingTable.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const serviceClass = cells[0].textContent.trim();
                        const currentPrice = cells[1].textContent.trim();
                        updatedPrices.push({
                            serviceClass: serviceClass,
                            currentPrice: currentPrice
                        });
                    }
                });
            }

            return {
                success: true,
                message: 'Prices updated successfully',
                updatedPrices: updatedPrices
            };
        });

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
}
