class AirlineSimBot {
    constructor() {
        this.apiUrl = 'http://localhost:11434/v1/chat/completions';
        this.model = "nollama/mythomax-l2-13b:Q5_K_S";
        this.name = "Ralph Schuhmacher";
        this.hub = "DFW (Dallas International Airport, USA)";
    }

    startBot() {
        fetch(this.apiUrl,
            {
                method: 'POST',
                body:
                    JSON.stringify({
                        model: this.model,
                        messages: [
                            {
                                role: "system",
                                content: `
                        General Rules:
                        1. Marketingisn't importnat at all, AirlineSim doesn't have any marketing tools
                        2. They are no prefered departure times or seasons every flight has the same demand, indepentetly from the time or season
                        3. The Game is running in real time so 9h in-game flight takes real 9h
                        4. Your name is ${this.name}
                        5. Our strategy is Hub and Spoke not Point to Point, this means we can only operate flights from and to our main hub!!!
                        6. The game doesn't allow us to do anything with the airport itself
                        `
                            },
                            {
                                role: "system",
                                content: `You are the CEO of Summit Air, a Airline based at ${this.hub} Airport (main hub) in a Airline Simulator Game, your goal is to build the most profitable airline ever`
                            },
                            {
                                role: "user",
                                content: "Should we start operations from DFW (Dallas), USA to MIA (Miami), USA?"
                            }
                        ],
                        response_format: {
                            type: 'json_schema',
                            json_schema: {
                                name: 'answer',
                                strict: true,
                                schema: {
                                    type: 'object',
                                    properties: {
                                        answer: {
                                            type: 'string',
                                            description: 'Yes/No, ONLY "YES" or "No" without extra text'
                                        },
                                        reasoning: {
                                            type: 'string',
                                            description: 'Reason why you answered wih "Yes" or "No"'
                                        }
                                    },
                                    required: ['answer', 'reasoning'],
                                    additionalProperties: false
                                }
                            }
                        },
                    })
            })
            .then((response) => response.json())
            .then((response) => {
                console.log(response.choices[0].message.content)
            });
    }
}

setInterval(() => {
    const bot = new AirlineSimBot();
    bot.startBot();
}, 1800000);

const bot = new AirlineSimBot();
bot.startBot();