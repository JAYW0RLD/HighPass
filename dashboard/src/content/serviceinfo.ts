export const serviceInfoContent = {
    title: "ℹ️ Service Information",
    subtitle: "Check HighStation platform's vision, fee policy, supported networks, and roadmap.",

    vision: {
        title: "About HighStation",
        tagline: "Realizing autonomous agent economy through verifiable AI infrastructure.",
        values: [
            {
                icon: "✅",
                title: "Verifiable",
                description: "Code integrity guaranteed by OpenSeal"
            },
            {
                icon: "🔓",
                title: "Permissionless",
                description: "Anyone can become a Provider"
            },
            {
                icon: "⚖️",
                title: "Fair",
                description: "Transparent fee policy"
            }
        ]
    },

    fees: {
        title: "Fee Policy",
        table: [
            { item: "Service Registration", fee: "Free", note: "Slug reservation" },
            { item: "API Call Mediation", fee: "5%", note: "Based on transaction amount" },
            { item: "Withdrawal Fee", fee: "Free", note: "Only gas fees" },
            { item: "OpenSeal Verification", fee: "Free", note: "Open source" }
        ]
    },

    networks: {
        title: "Supported Networks",
        mainnet: {
            name: "Cronos",
            chainId: 25,
            rpc: "https://evm.cronos.org",
            explorer: "https://cronoscan.com"
        },
        testnet: {
            name: "Cronos Testnet",
            chainId: 338,
            rpc: "https://evm-t3.cronos.org",
            faucet: "https://cronos.org/faucet"
        }
    },

    techStack: {
        title: "Core Technologies & Tech Stack",
        categories: [
            {
                name: "Blockchain & Web3",
                items: ["Cronos (Mainnet/Testnet)", "Wagmi & Viem", "MetaMask SDK", "Ethers.js"]
            },
            {
                name: "Security & Integrity",
                items: ["OpenSeal (Merkle Tree Integrity)", "Zero-Knowledge Proofs", "ECDSA Wallet Signing"]
            },
            {
                name: "Frontend",
                items: ["React (Vite)", "TypeScript", "Tailwind CSS", "Recharts"]
            },
            {
                name: "Backend & Infra",
                items: ["Node.js & Express", "PostgreSQL (Supabase)", "High-Performance Proxy Gateway"]
            }
        ]
    },

    api: {
        title: "API Specifications",
        baseUrls: {
            production: "https://highstation.net",
            development: "http://localhost:3000"
        },
        endpoints: [
            { method: "GET", path: "/api/provider/services", description: "List my services" },
            { method: "POST", path: "/api/provider/services", description: "Register service" },
            { method: "GET", path: "/api/provider/analytics", description: "Analytics" },
            { method: "POST", path: "/api/provider/withdraw", description: "Withdraw" },
            { method: "GET", path: "/api/provider/withdrawals", description: "Withdrawal history" }
        ]
    },

    roadmap: {
        title: "Roadmap",
        quarters: [
            {
                period: "Q1 2026",
                status: "completed",
                items: [
                    "OpenSeal integration",
                    "ZK Checkpoint",
                    "Dashboard UI overhaul"
                ]
            },
            {
                period: "Q2 2026",
                status: "inProgress",
                items: [
                    "Multi-chain support (Ethereum, Polygon)",
                    "Dynamic Pricing",
                    "Agent SDK v2"
                ]
            },
            {
                period: "Q3 2026",
                status: "planned",
                items: [
                    "Governance Token",
                    "DAO transition",
                    "Global CDN"
                ]
            }
        ]
    },

    support: {
        title: "Customer Support",
        channels: [
            { icon: "📧", label: "Email", value: "support@highstation.net" },
            { icon: "💬", label: "Discord", value: "discord.gg/highstation", link: "https://discord.gg/highstation" },
            { icon: "🐦", label: "Twitter", value: "@HighStationHQ", link: "https://twitter.com/highstationhq" }
        ],
        responseTime: [
            "Urgent: Within 4 hours",
            "General: Within 24 hours"
        ]
    },

    license: {
        title: "License",
        repo: "github.com/highstation/highstation",
        license: "MIT"
    }
};
