import { chromium } from 'playwright';

export class BrowserManager {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isLoggedIn = false;
    }

    async ensureLoggedIn() {
        if (this.isLoggedIn && this.page) {
            return this.page;
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

        await this.page.goto('https://www.airlinesim.aero/auth/login', {
            waitUntil: 'networkidle'
        });

        try {
            const cookieButton = this.page.locator('button.btn--primary:has-text("Accept all cookies")');
            await cookieButton.click({ timeout: 3000 });
            await this.page.waitForTimeout(500);
        } catch (e) {
            // no cookie banner
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
        return this.page;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    getPage() {
        return this.page;
    }
}
