import { BrowserManager } from './interns/browser.js';
import { GameState } from './state/gameState.js';
import { FleetManager } from './modules/fleet/checkDeliveries.js';
import { AircraftPlanner } from './modules/fleet/planAircraft.js';

class AirlineSimBot {
    constructor() {
        this.apiUrl = 'http://localhost:11434/v1/chat/completions';
        this.model = "nollama/mythomax-l2-13b:Q5_K_S";
        this.name = "Ralph Schuhmacher";
        this.hub = "DFW (Dallas International Airport, USA)";
        this.airlineName = "Summit Air";
        this.gameState = null;
        this.browserManager = new BrowserManager();
        this.fleetManager = new FleetManager(this.browserManager);
    }

    async startBot() {
        this.gameState = await new GameState(this.browserManager).getAirlineInfo();
        const deliveries = await this.fleetManager.checkDeliveries();
        console.log('Deliveries:', deliveries);

        const planner = new AircraftPlanner(this.browserManager);
        deliveries.slice(-1).forEach(async (delivery) => {
            const planResult = await planner.planPlane(delivery.id);
            console.log('Planning result for aircraft ID', delivery.id, ':', planResult);
        });
    }
}

setInterval(() => {
    const bot = new AirlineSimBot();
    bot.startBot();
}, 1800000);

const bot = new AirlineSimBot();
bot.startBot();