export class GameState {
    constructor(browserManager) {
        this.browserManager = browserManager;
    }

    async getAirlineInfo() {
        console.log('Fetching airline info...');
        const page = await this.browserManager.ensureLoggedIn();

        await page.goto('https://quimby.airlinesim.aero/app/enterprise/dashboard?7', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        await page.waitForTimeout(1000);

        const data = await page.evaluate(() => {
            const result = {};

            // In-game time
            const timeSpan = document.querySelector('.as-footer-line-element .fa-clock-o');
            if (timeSpan && timeSpan.nextElementSibling) {
                const timeText = timeSpan.nextElementSibling.textContent.trim();
                result.gameTime = timeText;
            }

            console.log('Game time:', result.gameTime);

            // Airline facts
            const factsTable = document.querySelector('.as-panel.facts table tbody');
            if (factsTable) {
                const rows = factsTable.querySelectorAll('tr');
                rows.forEach(row => {
                    const th = row.querySelector('th');
                    const td = row.querySelector('td');
                    if (th && td) {
                        const key = th.textContent.trim();
                        const value = td.textContent.trim();

                        switch (key) {
                            case 'Name':
                                result.name = value;
                                break;
                            case 'Code':
                                result.code = value;
                                break;
                            case 'Headquarters':
                                const hqLink = td.querySelector('a');
                                const hqCode = td.querySelector('span');
                                result.headquarters = {
                                    name: hqLink ? hqLink.textContent.trim() : '',
                                    code: hqCode ? hqCode.textContent.trim() : ''
                                };
                                break;
                            case 'Country':
                                const countryLink = td.querySelector('a');
                                result.country = countryLink ? countryLink.textContent.trim() : value;
                                break;
                            case 'Rating':
                                result.rating = value;
                                break;
                            case 'Fleet size':
                                result.fleetSize = value;
                                break;
                            case 'Employees':
                                result.employees = value;
                                break;
                        }
                    }
                });
            }

            // Balance
            const balanceLink = document.querySelector('a.balance');
            if (balanceLink) {
                const balanceSpan = balanceLink.querySelector('span');
                result.balance = balanceSpan ? balanceSpan.textContent.trim() + ' AS$' : '';
            }

            // Financerating
            const ratingTable = document.querySelector('.as-table-well table');
            if (ratingTable) {
                const ratingRows = ratingTable.querySelectorAll('tbody tr');
                const ratings = [];

                ratingRows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 3) {
                        const category = cells[0].textContent.trim();
                        const ratingText = cells[2].textContent.trim();
                        if (category && ratingText) {
                            ratings.push({
                                category: category,
                                rating: ratingText
                            });
                        }
                    }
                });

                result.financialRatings = ratings;
            }

            // Passenger Ratings
            const imagePanel = document.querySelector('.as-panel.image');
            if (imagePanel) {
                const imageRows = imagePanel.querySelectorAll('tbody tr');
                const imageRatings = [];

                imageRows.forEach(row => {
                    const th = row.querySelector('th');
                    const trendIcon = row.querySelector('.trend .fa');
                    if (th) {
                        const category = th.textContent.trim();
                        let trend = 'neutral';
                        if (trendIcon) {
                            if (trendIcon.classList.contains('fa-chevron-circle-up')) {
                                trend = 'up';
                            } else if (trendIcon.classList.contains('fa-chevron-circle-down')) {
                                trend = 'down';
                            }
                        }
                        imageRatings.push({
                            category: category,
                            trend: trend
                        });
                    }
                });

                result.imageRatings = imageRatings;
            }

            // Subsidiaries
            const subsidiariesPanel = document.querySelector('.as-panel.subsidiaries');
            if (subsidiariesPanel) {
                const subRows = subsidiariesPanel.querySelectorAll('tbody tr');
                const subsidiaries = [];

                subRows.forEach(row => {
                    const nameLink = row.querySelector('td:first-child a');
                    const countryImg = row.querySelector('.country img');
                    const statusTd = row.querySelector('td.notListed');

                    if (nameLink) {
                        subsidiaries.push({
                            name: nameLink.textContent.trim(),
                            country: countryImg ? countryImg.title : '',
                            status: statusTd ? statusTd.textContent.trim() : 'listed'
                        });
                    }
                });

                result.subsidiaries = subsidiaries;
            }

            return result;
        });

        return data;
    }
}