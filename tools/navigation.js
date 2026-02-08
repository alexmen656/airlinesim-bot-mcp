export const navigationTools = [
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
];

export class NavigationHandlers {
    constructor(browserManager) {
        this.browserManager = browserManager;
    }

    async navigateToPage(url) {
        const page = await this.browserManager.ensureLoggedIn();
        
        if (!url.startsWith('https://quimby.airlinesim.aero/')) {
            throw new Error('URL muss mit https://quimby.airlinesim.aero/ beginnen');
        }

        await page.goto(url, { waitUntil: 'networkidle' });

        const pageInfo = await page.evaluate(() => ({
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
        const page = this.browserManager.getPage();
        
        if (!page) {
            throw new Error('Keine Seite geladen. Bitte zuerst navigieren oder einloggen.');
        }

        const content = await page.evaluate(() => ({
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
}
