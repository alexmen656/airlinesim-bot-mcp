export class AircraftPlanner {
    constructor(browser) {
        this.browser = browser;
    }

    async planPlane(id) {
        const page = await this.browser.ensureLoggedIn();

        await page.goto('https://quimby.airlinesim.aero/app/fleets/aircraft/' + id + '/0', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        const handlePlanning = await page.evaluate((id) => {
            console.log('Creating plan for aircraft ID:', id);
            return 'successfully planned aircraft with ID: ' + id;
        }, id);

        return handlePlanning;
    }
}
