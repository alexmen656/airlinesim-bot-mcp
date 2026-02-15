import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config();

export class BrowserManager {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isLoggedIn = false;
        this.viewport = { width: 1280, height: 720 };
    }

    async ensureLoggedIn() {
        console.log('Ensuring logged in state...');

        if (this.isLoggedIn && this.page) {
            return this.page;
        }

        const email = process.env.AIRLINESIM_EMAIL;
        const password = process.env.AIRLINESIM_PASSWORD;
        const rememberMe = process.env.AIRLINESIM_REMEMBER === 'true';

        if (!email || !password) {
            throw new Error('AIRLINESIM_EMAIL and AIRLINESIM_PASSWORD have to be set in environment variables');
        }

        this.browser = await chromium.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.context = await this.browser.newContext({
            viewport: this.viewport,
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });

        this.page = await this.context.newPage();

        await this.page.goto('https://www.airlinesim.aero/auth/login', {
            waitUntil: 'networkidle',
            timeout: 60000
        });

        await this.page.waitForSelector('input[name="login"]', { timeout: 15000 });

        // cookie banner
        try {
            await this.page.locator('button.btn--primary:has-text("Accept all cookies")').click({ timeout: 3000 });
            await this.page.waitForTimeout(200);
        } catch (e) {
            console.log('No cookie banner found, continuing...');
        }

        // input fields
        await this.page.locator('input[name="login"]').fill(email);
        await this.page.waitForTimeout(200);
        await this.page.locator('input[name="password"]').fill(password);
        await this.page.waitForTimeout(200);

        if (rememberMe) {
            await this.page.locator('input[name="persistent"]').check();
            await this.page.waitForTimeout(200);
        }

        await this.page.waitForTimeout(200);
        await this.page.locator('button.btn--primary.btn--full-width:has-text("Log in")').click();

        try {
            await this.page.waitForURL((url) => !url.toString().includes('/auth/login'), {
                timeout: 30000
            });
        } catch (e) {
            throw new Error(`Login failed: ${e.message}`);
        }

        this.isLoggedIn = true;
        console.log('Login successful');
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
