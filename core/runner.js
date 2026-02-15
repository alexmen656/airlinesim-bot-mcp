import { BrowserManager } from './interns/browser.js';
import { GameState } from './state/gameState.js';
import { FleetManager } from './modules/fleet/checkDeliveries.js';

class AirlineSimBot {
    constructor() {
        this.apiUrl = 'http://localhost:11434/v1/chat/completions';
        this.model = "nollama/mythomax-l2-13b:Q5_K_S";
        this.name = "Ralph Schuhmacher";
        this.hub = "DFW (Dallas International Airport, USA)";
        this.airlineName = "Summit Air";
        this.gameState = null;
        this.browserManager = new BrowserManager();
        this.fleetManager = null;
    }

    async startBot() {
        this.gameState = await new GameState(this.browserManager).getAirlineInfo();
        console.log(this.gameState);

        const fleetManager = new FleetManager(this.browserManager);
        const deliveries = await fleetManager.checkDeliveries();

        console.log('Deliveries:', deliveries);

    }
}

setInterval(() => {
    const bot = new AirlineSimBot();
    bot.startBot();
}, 1800000);

const bot = new AirlineSimBot();
bot.startBot();