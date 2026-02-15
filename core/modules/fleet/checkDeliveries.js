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
            //result.push({ name: 'test0' });
            table.querySelectorAll('tr').forEach(row => {
                  const planButton = row.querySelector('td.actions > .btn-toolbar > div.btn-group:last-child a.btn-default');

             //   const planButton = row.querySelector('td.actions a.btn.btn-success');//row.querySelector('td.actions').querySelector('div.btn-toolbar').querySelector('div.btn-group').querySelector('a:nth-of-type(1)');
                // result.push({ name: planButton})
                //if class btn-default do nothing, if btn-success console log it
                if (planButton && planButton.classList.contains('btn-default')) {//btn-success
                    //console.log('Found a successful delivery plan button:', planButton);
                    result.push({ name: row.querySelector('td:nth-child(2) span')?.textContent?.trim() ?? 'yvg'})//row.querySelector('td:nth-child(2) span').textContent.trim() });
                    console.log('Found a successful delivery plan button:', planButton.href);
                }
            });
            //result.push({ name: 'test2' });
            return result;
        });

        return handleDeliveries;
    }
}
