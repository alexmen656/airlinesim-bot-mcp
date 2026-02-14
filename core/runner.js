//import fetch from 'node-fetch';

//setInterval(() => {
//run local AI

//curl -X POST \
//http://localhost:11434/v1/chat/completions \
// -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
// -d '{"model": "nollama/mythomax-l2-13b:Q5_K_S", "messages": [{"role": "system", "content": "Du bist ein Experte für Datenbankdesign und Formularerstellung. Analysiere die Benutzerbeschreibung und erstelle ein passendes Datenbankschema mit sinnvollen Feldern, Typen und Optionen."}, {"role": "user", "content": "holla" } ]}'


/*
curl -X POST \
http://localhost:11434/v1/chat/completions \
-d '{"model": "nollama/mythomax-l2-13b:Q5_K_S", "messages": [{"role": "system", "content": "Du bist ein Experte für Datenbankdesign und Formularerstellung. Analysiere die Benutzerbeschreibung und erstelle ein passendes Datenbankschema mit sinnvollen Feldern, Typen und Optionen."}, {"role": "user", "content": "holla" } ]}'
*/

/*
curl -X POST \
     http://localhost:11434/v1/chat/completions \
     -d '{"model": "nollama/mythomax-l2-13b:Q5_K_S", "messages": [{"role": "system", "content": "Du bist ein Experte für Alles."}, {"role": "user", "content": "holla" } ]}'
     */



/*
Prompt optimizing:

curl -X POST \
http://localhost:11434/v1/chat/completions \
-d '{"model": "nollama/mythomax-l2-13b:Q5_K_S", "messages": [{"role": "system", "content": "You are a Airline CEO in a Airline Simulator Game, your goal is to build the most profitable airline ever"}, {"role": "user", "content": "Should we start operations from VIE to AGP?" } ]}'


{"role":"assistant","content":" Based on current market demand and potential profitability, it would be beneficial to consider starting operations from Vienna International Airport (VIE) to Alicante-Elche Airport (AGP). This route has a high passenger volume during the summer months, particularly for leisure travelers seeking sunny destinations in Spain. By offering competitive flight times and pricing strategies, your airline could capture a significant share of this market and generate substantial revenue. However, it's important to also consider factors such as operational costs, aircraft availability, and market conditions before making a final decision."},"finish_reason":"stop"}],"usage":{"prompt_tokens":62,"completion_tokens":125,"total_tokens":187}}


 curl -X POST \
http://localhost:11434/v1/chat/completions \
-d '{"model": "nollama/mythomax-l2-13b:Q5_K_S", "messages": [{"role": "system", "content": "You are the CEO of Summit Air in a Airline Simulator Game, your goal is to build the most profitable airline ever"}, {"role": "user", "content": "Should we start operations from VIE to AGP?" } ]}'


Yes, based on the provided information, starting operations from Vienna International Airport (VIE) to A Coruña Airport (AGP) seems to be a profitable decision. According to the data mentioned in the message, the potential revenue for this route is 3 million Euros per year with an average load factor of 75%. This suggests that there is a significant demand for air travel between these two destinations and starting operations along this route can potentially lead to high profits. Considering the overall goal of building the most profitable airline, initiating flights from VIE to AGP seems like a step in the right direction."},"finish_reason":"stop"}],"usage":{"prompt_tokens":64,"completion_tokens":134,"total_tokens":198}}

wrong airport lol


curl -X POST \
http://localhost:11434/v1/chat/completions \
-d '{"model": "nollama/mythomax-l2-13b:Q5_K_S", "messages": [{"role": "system", "content": "You are the CEO of Summit Air based at DFW Airport in a Airline Simulator Game, your goal is to build the most profitable airline ever"}, {"role": "user", "content": "Should we start operations from VIE to AGP?" } ]}'




*/

fetch('http://localhost:11434/v1/chat/completions',
    {
        method: 'POST',
        body:
            JSON.stringify({
                model: "nollama/mythomax-l2-13b:Q5_K_S",
                messages: [
                    {
                        role: "system",
                        content: "You are the CEO of Summit Air based at DFW Airport in a Airline Simulator Game, your goal is to build the most profitable airline ever"
                    },
                    {
                        role: "user",
                        content: "Should we start operations from VIE to AGP?"
                    }
                ]
            })
    })
    .then((response) => response.json())
    .then((response) => {
        //console.log(response)
        console.log(response.choices[0].message)
    });
//}, 1800000);
