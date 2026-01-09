
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { initDB } from "./database/db";
import { ethers } from "ethers";

// Create an MCP server
const server = new McpServer({
    name: "HighStation Market Data",
    version: "1.0.0",
});

// Resource: List of all services (Static-ish data)
server.resource(
    "services",
    "services://list",
    async (uri) => {
        const db = await initDB();
        if (!db) throw new Error("Database connection failed");

        const { data: services, error } = await db
            .from("services")
            .select("id, name, description, price_wei, slug, status")
            .eq("status", "verified");

        if (error) throw new Error(`Database error: ${error.message}`);

        const formatted = services.map(s => ({
            ...s,
            price: `${ethers.formatEther(s.price_wei || '0')} CRO`,
            url: `https://highstation.cronos/proxy/${s.slug}`
        }));

        return {
            contents: [{
                uri: uri.href,
                text: JSON.stringify(formatted, null, 2),
            }],
        };
    }
);

// Tool: Search for services (Dynamic Query)
server.tool(
    "search_services",
    { query: z.string() },
    async ({ query }) => {
        const db = await initDB();
        if (!db) return { content: [{ type: "text", text: "Database error" }] };

        const { data: services, error } = await db
            .from("services")
            .select("id, name, description, price_wei, slug")
            .eq("status", "verified")
            .ilike("name", `%${query}%`); // Simple ILIKE search

        if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
        if (!services || services.length === 0) return { content: [{ type: "text", text: "No services found." }] };

        const result = services.map(s =>
            `- [${s.name}](${s.slug}): ${ethers.formatEther(s.price_wei)} CRO - ${s.description}`
        ).join("\n");

        return {
            content: [{ type: "text", text: result }],
        };
    }
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("HighStation MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
