import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { BrowserManager } from './tools/browser.js';
import { aircraftTools, AircraftHandlers } from './tools/aircraft.js';
import { stationTools, StationHandlers } from './tools/stations.js';
import { navigationTools, NavigationHandlers } from './tools/navigation.js';
import { infoTools, InfoHandlers } from './tools/info.js';
import { inventoryTools, InventoryHandlers } from './tools/inventory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AirlineSimServer {
    constructor() {
        this.gameRules = this.loadGameRules();

        this.server = new Server(
            {
                name: "AirlineSim-bot",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.browserManager = new BrowserManager();
        this.infoHandlers = new InfoHandlers(this.browserManager);
        this.aircraftHandlers = new AircraftHandlers(this.browserManager);
        this.stationHandlers = new StationHandlers(this.browserManager);
        this.navigationHandlers = new NavigationHandlers(this.browserManager);
        this.inventoryHandlers = new InventoryHandlers(this.browserManager);

        this.setupHandlers();
        this.setupErrorHandling();
    }

    loadGameRules() {
        try {
            const rulesPath = join(__dirname, 'rules.md');
            const rulesContent = readFileSync(rulesPath, 'utf-8');
            console.error('[MCP] Grundwissen aus rules.md geladen');
            return rulesContent;
        } catch (error) {
            console.error('[MCP] Warnung: rules.md konnte nicht geladen werden:', error.message);
            return '';
        }
    }

    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error("[MCP Error]", error);
        };

        process.on('SIGINT', async () => {
            await this.browserManager.cleanup();
            process.exit(0);
        });
    }

    setupHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            const allTools = [
                ...aircraftTools,
                ...stationTools,
                ...navigationTools,
                ...infoTools,
                ...inventoryTools,
            ];

            if (this.gameRules) {
                allTools.forEach(tool => {
                    tool.description = `${tool.description}\n\n**WICHTIGES GRUNDWISSEN:**\n${this.gameRules}`;
                });
            }

            return { tools: allTools };
        });

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                const { name, arguments: args } = request.params;

                // Aircraft Tools
                if (name === "list_aircraft_manufacturers") {
                    return await this.aircraftHandlers.listAircraftManufacturers();
                }
                if (name === "get_aircraft_family") {
                    return await this.aircraftHandlers.getAircraftFamily(args.familyId);
                }
                if (name === "get_aircraft_type") {
                    return await this.aircraftHandlers.getAircraftType(args.typeId);
                }
                if (name === "search_aircraft") {
                    return await this.aircraftHandlers.searchAircraft(args);
                }
                if (name === "get_aircraft_performance") {
                    return await this.aircraftHandlers.getAircraftPerformance(
                        args.typeId,
                        args.origin,
                        args.destination,
                        args.cruiseSpeed
                    );
                }

                // Info Tools
                if (name === "get_airline_info") {
                    return await this.infoHandlers.getAirlineInfo();
                }

                // Station Tools
                if (name === "list_stations") {
                    return await this.stationHandlers.listStations(args?.country);
                }
                if (name === "get_station_details") {
                    return await this.stationHandlers.getStationDetails(args.stationCode);
                }

                if (name === "open_station") {
                    return await this.stationHandlers.openStation(args.airportCode);
                }
                if (name === "close_station") {
                    return await this.stationHandlers.closeStation(args.stationCode);
                }

                // Navigation Tools
                if (name === "navigate_to_page") {
                    return await this.navigationHandlers.navigateToPage(args.url);
                }
                if (name === "get_page_content") {
                    return await this.navigationHandlers.getPageContent();
                }

                // Inventory Tools
                if (name === "get_route_inventory") {
                    return await this.inventoryHandlers.getRouteInventory(args.origin, args.destination);
                }
                if (name === "set_route_prices") {
                    return await this.inventoryHandlers.setRoutePrices(
                        args.origin,
                        args.destination,
                        args.priceY,
                        args.priceC,
                        args.priceF,
                        args.priceCargo
                    );
                }

                throw new Error(`Unknown tool: ${name}`);
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: ${error.message}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error("AirlineSim MCP Server läuft");
        console.error(`- ${aircraftTools.length} Aircraft Tools`);
        console.error(`- ${stationTools.length} Station Tools`);
        console.error(`- ${navigationTools.length} Navigation Tools`);
        console.error(`- ${infoTools.length} Info Tools`);
        console.error(`- ${inventoryTools.length} Inventory Tools`);

        if (this.gameRules) {
            console.error('- Grundwissen aus rules.md geladen');
        }
    }
}

// Start server
const server = new AirlineSimServer();
server.run().catch(console.error);
