import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';
import { query as dbQuery } from '../database/db';
import express from 'express';
import { CHAIN_CONFIG } from '../config/chain';
import { createClient } from '@crypto.com/ai-agent-client'; // [NEW] SDK Integration
import { APP_CONFIG } from '../config/app';

/**
 * McpService (SDK Standard Implementation)
 * 
 * Provides a standardized Model Context Protocol interface for AI Agents.
 * SDK MCP Server handles tool discovery and communication.
 * Payment logic is decoupled and handled via strictPayment middleware on resource access.
 */
export class McpService {
    public server: McpServer;
    private transports: Map<string, SSEServerTransport> = new Map();

    constructor() {
        this.server = new McpServer({
            name: "HighStation Gatekeeper",
            version: "2.0.0"
        });

        this.registerPlatformTools();
    }

    private registerPlatformTools() {
        // Tool 1: Search Platform Services
        this.server.tool(
            "search_services",
            {
                query: z.string().describe("Search query for API capabilities (e.g. 'news', 'market data', 'social')"),
                category: z.string().optional().describe("Optional category filter"),
                all: z.boolean().optional().describe("Return all services regardless of query"),
                userId: z.string().optional().describe("Optional User ID to prioritize own services")
            },
            async ({ query, category, all, userId }) => {
                console.log(`[MCP] Tool: search_services('${query}', cat: ${category}, all: ${all}, userId: ${userId})`);

                try {
                    const targetCategory = category;
                    // MCP Search Logic: Respect ALLOW_UNVERIFIED_SERVICES flag
                    const allowedStatuses = APP_CONFIG.ALLOW_UNVERIFIED_SERVICES ? "('verified', 'pending')" : "('verified')";

                    let sql = `
                        SELECT id, slug, name, description, price_wei, category, capabilities, provider_id
                        FROM services 
                        WHERE status IN ${allowedStatuses}
                    `;
                    const params: any[] = [];

                    // [FIX] Support explicit 'all' parameter from agent
                    if (all === true || !query || query.trim() === '') {
                        // Return all services (no Full-Text Search filter)
                        console.log('[MCP] Returning all services (all=true or empty query)');
                    } else {
                        // 1. Full-Text Search (using search_vector)
                        sql += ` AND search_vector @@ plainto_tsquery('english', $${params.length + 1})`;
                        params.push(query);
                    }

                    // 2. Category Filter
                    if (targetCategory) {
                        sql += ` AND (category ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1})`;
                        params.push(`%${targetCategory}%`);
                    }

                    // [NEW] Prioritize logged-in user's services first, then by date, limit 10
                    if (userId) {
                        sql += ` ORDER BY (provider_id = $${params.length + 1}::uuid) DESC, created_at DESC`;
                        params.push(userId);
                    } else {
                        sql += ` ORDER BY created_at DESC`;
                    }

                    sql += ` LIMIT 10`;

                    const result = await dbQuery(sql, params);
                    const data = result.rows;

                    if (!data || data.length === 0) {
                        return { content: [{ type: "text", text: `No services found for '${query}' (Category: ${targetCategory || 'Any'}).` }] };
                    }

                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: "success",
                                results: data.map((s: any) => ({
                                    name: s.name,
                                    slug: s.slug,
                                    category: s.category,
                                    price: s.price_wei,
                                    capabilities: s.capabilities,
                                    description: s.description
                                }))
                            }, null, 2)
                        }]
                    };

                } catch (error) {
                    console.error('[MCP] Search Error:', error);
                    return { content: [{ type: "text", text: "Service search failed. Please try again later." }] };
                }
            }
        );

        // Tool 2: Get Payment Protocol Info
        this.server.tool(
            "get_payment_info",
            {},
            async () => {
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            protocol: "HighStation / x402",
                            network: {
                                name: CHAIN_CONFIG.name,
                                chainId: CHAIN_CONFIG.id,
                                currency: CHAIN_CONFIG.nativeCurrency.symbol
                            },
                            paymentMethod: "x402 (EIP-3009 based)",
                            facilitatorAddress: CHAIN_CONFIG.contracts.paymentHandler,
                            required_sdk: "@crypto.com/facilitator-client",
                            instructions: "Generate an x402 payment header using the Facilitator SDK and include it as 'Authorization: Bearer <token>' in your request to the service endpoint."
                        }, null, 2)
                    }]
                };
            }
        );
    }

    /**
     * Handle SSE Connection for AI Agents
     */
    async handleConnection(req: express.Request, res: express.Response) {
        console.log(`[MCP] New agent connecting from ${req.ip}`);
        const transport = new SSEServerTransport("/mcp/message", res);

        try {
            await this.server.connect(transport);

            const sessionId = (transport as any).sessionId;
            if (sessionId) {
                this.transports.set(sessionId, transport);
                console.log(`[MCP] Session established: ${sessionId}`);
            }
        } catch (error) {
            console.error("[MCP] Connection failed:", error);
            res.status(500).send("Initial MCP connection failed");
        }
    }

    /**
     * Handle MCP Messages (POST)
     */
    async handleMessage(req: express.Request, res: express.Response, sessionId: string) {
        const transport = this.transports.get(sessionId);
        if (!transport) {
            res.status(404).send('MCP Session not found or expired');
            return;
        }
        await transport.handlePostMessage(req, res);
    }
}
