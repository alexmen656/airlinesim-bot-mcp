import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function loginToAirlineSim(email, password, rememberMe = false) {
    console.log('🚀 Starte Browser...');

    const browser = await chromium.launch({
        headless: false,
        args: ['--start-maximized']
    });

    try {
        const context = await browser.newContext({
            viewport: { width: 1280, height: 800 }
        });
        const page = await context.newPage();

        console.log('📄 Navigiere zur Login-Seite...');
        await page.goto('https://www.airlinesim.aero/auth/login', {
            waitUntil: 'networkidle'
        });

        console.log('🍪 Prüfe Cookie-Banner...');
        try {
            const cookieButton = page.locator('button.btn--primary:has-text("Accept all cookies")');
            await cookieButton.waitFor({ timeout: 3000 });
            await cookieButton.click();
            console.log('✅ Cookies akzeptiert');
            await page.waitForTimeout(500);
        } catch (e) {
            console.log('ℹ️  Kein Cookie-Banner sichtbar');
        }

        console.log('📝 Fülle Login-Formular aus...');

        const loginInput = page.locator('input[name="login"]');
        await loginInput.waitFor({ timeout: 5000 });
        await loginInput.fill(email);

        const passwordInput = page.locator('input[name="password"]');
        await passwordInput.fill(password);

        if (rememberMe) {
            const persistentCheckbox = page.locator('input[name="persistent"]');
            await persistentCheckbox.check();
            console.log('✅ "Login merken" aktiviert');
        }

        const loginButton = page.locator('button.btn--primary.btn--full-width:has-text("Log in")');
        await loginButton.click();
        console.log('✅ Login-Button geklickt');

        console.log('⏳ Warte auf Login-Bestätigung...');
        try {
            await page.waitForURL((url) => !url.toString().includes('/auth/login'), {
                timeout: 10000
            });
        } catch (e) {
            const currentUrl = page.url();
            if (currentUrl.includes('/auth/login')) {
                console.log('❌ Login fehlgeschlagen - noch auf Login-Seite');
                await page.screenshot({ path: 'login-error.png', fullPage: true });
                console.log('📸 Screenshot gespeichert: login-error.png');
                throw new Error('Login fehlgeschlagen - prüfen Sie Email und Passwort');
            }
        }

        const currentUrl = page.url();
        console.log('📍 Aktuelle URL:', currentUrl);
        console.log('✅ Login erfolgreich!');

        console.log('🎮 Navigiere zur Quimby Spielwelt...');
        await page.goto('https://quimby.airlinesim.aero/', {
            waitUntil: 'networkidle'
        });

        console.log('✅ Auf Spielwelt angekommen!');
        await page.screenshot({ path: 'login-success.png', fullPage: true });
        console.log('📸 Screenshot gespeichert: login-success.png');

        console.log('🎉 Bot läuft! Drücke Ctrl+C zum Beenden.');

        await new Promise(() => { });

    } catch (error) {
        console.error('❌ Fehler beim Login:', error.message);

        try {
            const pages = await browser.contexts()[0].pages();
            if (pages.length > 0) {
                await pages[0].screenshot({ path: 'error.png', fullPage: true });
                console.log('📸 Error-Screenshot gespeichert: error.png');
            }
        } catch (e) {
            // ignore
        }

        await browser.close();
        process.exit(1);
    }
}

const email = process.env.AIRLINESIM_EMAIL || '';
const password = process.env.AIRLINESIM_PASSWORD || '';
const rememberMe = process.env.AIRLINESIM_REMEMBER === 'true';

if (!email || !password) {
    console.log('❌ Fehler: Email und Passwort erforderlich\n');
    console.log('Setzen Sie die Umgebungsvariablen:');
    console.log('  AIRLINESIM_EMAIL      - Ihre Email-Adresse');
    console.log('  AIRLINESIM_PASSWORD   - Ihr Passwort');
    console.log('  AIRLINESIM_REMEMBER   - "true" für "Login merken" (optional)\n');
    console.log('Beispiel:');
    console.log('  export AIRLINESIM_EMAIL="ihre@email.com"');
    console.log('  export AIRLINESIM_PASSWORD="IhrPasswort"');
    console.log('  npm start\n');
    console.log('Oder direkt:');
    console.log('  AIRLINESIM_EMAIL="ihre@email.com" AIRLINESIM_PASSWORD="IhrPasswort" npm start\n');
    console.log('Oder mit Script:');
    console.log('  ./start-bot.sh ihre@email.com IhrPasswort');
    process.exit(1);
}

console.log('📧 Email:', email);
console.log('🔒 Passwort:', '*'.repeat(password.length));
console.log('💾 Login merken:', rememberMe ? 'Ja' : 'Nein');
console.log('');

loginToAirlineSim(email, password, rememberMe);

