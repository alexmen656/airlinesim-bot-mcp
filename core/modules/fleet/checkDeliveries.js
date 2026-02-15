export class FleetManager {
    constructor(browser) {
        this.browser = browser;
    }

    async checkDeliveries() {
        const page = await this.browser.ensureLoggedIn();

        await page.goto('https://quimby.airlinesim.aero/app/fleets', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        const handleDeliveries = await page.evaluate(() => {
            const result = [];
            const table = document.querySelector('table.table.table-bordered.table-striped.table-hover>tbody');

            table.querySelectorAll('tr').forEach(row => {
                const planButton = row.querySelector('td.actions > .btn-toolbar > div.btn-group:last-child a.btn-default:first-child');

                if (planButton) {
                    result.push({
                        id: planButton.getAttribute('href').replace('./fleets/aircraft/', '').replace('/0', ''),
                        name: row.querySelector('td:nth-child(2) span')?.textContent?.trim(),
                        model: row.querySelector('td:nth-child(3) a')?.textContent?.trim(),
                    })
                }
            });

            return result;
        });

        return handleDeliveries;
    }
}
