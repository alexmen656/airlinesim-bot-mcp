import { BrowserManager } from './interns/browser.js';
import { GameState } from './state/gameState.js';

class AirlineSimBot {
    constructor() {
        this.apiUrl = 'http://localhost:11434/v1/chat/completions';
        this.model = "nollama/mythomax-l2-13b:Q5_K_S";
        this.name = "Ralph Schuhmacher";
        this.hub = "DFW (Dallas International Airport, USA)";
        this.airlineName = "Summit Air";
        this.gameState = null;
        this.browserManager = new BrowserManager();
    }

    async startBot() {
        this.gameState = await new GameState(this.browserManager).getAirlineInfo();
        console.log(this.gameState);
    }
}

setInterval(() => {
    const bot = new AirlineSimBot();
    bot.startBot();
}, 1800000);

const bot = new AirlineSimBot();
bot.startBot();