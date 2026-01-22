export const securityContent = {
    title: "🔒 Security Specifications",
    subtitle: "HighStation protects both Providers and Agents with a 3-layer security mechanism.",

    layers: [
        {
            title: "Layer 1: OpenSeal Integrity Proof",
            icon: "🛡️",
            description: "Ensures code integrity through Merkle Tree-based hash verification of running code.",
            details: [
                {
                    subtitle: "How It Works",
                    bullets: [
                        "Entire source code hashed into Merkle Tree",
                        "Root Hash stored in openseal.json",
                        "Real-time verification at runtime"
                    ]
                },
                {
                    subtitle: "Attacks Prevented",
                    bullets: [
                        "❌ Code Tampering",
                        "❌ Backdoor Injection",
                        "❌ Shadow Application"
                    ]
                },
                {
                    subtitle: "Limitations",
                    alert: "warning",
                    content: "⚠️ Integrity ≠ Honesty\n\nOpenSeal proves 'code is not tampered with', but does not guarantee 'code is not malicious'. Always choose trusted Providers."
                }
            ]
        },
        {
            title: "Layer 2: Trust Score System",
            icon: "⭐",
            description: "Scores Provider trustworthiness by combining various metrics.",
            details: [
                {
                    subtitle: "Evaluation Metrics",
                    bullets: [
                        "OpenSeal verification: +40 points",
                        "Success rate: (Success Rate - 90) × 0.5 (max +5 points)",
                        "Response speed: Latency ≤ 100ms → +10 points",
                        "Operation period: 30+ days → +5 points"
                    ]
                },
                {
                    subtitle: "Dynamic Adjustment",
                    bullets: [
                        "Real-time performance monitoring",
                        "Automatic score updates (hourly)",
                        "Alerts on sharp declines"
                    ]
                }
            ]
        },
        {
            title: "Layer 3: Withdrawal Signature Mechanism",
            icon: "✍️",
            description: "Prevents unauthorized withdrawals through wallet signatures.",
            details: [
                {
                    subtitle: "Threats Defended",
                    bullets: [
                        "Unauthorized withdrawal attempts",
                        "Man-in-the-middle attacks (MITM)",
                        "Session hijacking"
                    ]
                },
                {
                    subtitle: "Signature Process",
                    code: `// 1. Generate message
const message = \`Withdraw \${amount} wei to \${address}\`;

// 2. Sign with private key (wallet)
const signature = await wallet.signMessage(message);

// 3. Backend verification
const recovered = ethers.utils.verifyMessage(message, signature);
if (recovered !== address) throw new Error('Invalid signature');`
                }
            ]
        }
    ],

    additional: {
        title: "Additional Security Features",
        items: [
            {
                title: "ZK Proof (Zero-Knowledge Proof)",
                description: "Operates ZK Checkpoint system to protect transaction privacy and reduce on-chain costs.",
                bullets: [
                    "Daily midnight UTC: Generate all transaction batches",
                    "Create proof with ZK Circuit",
                    "On-chain Anchor (Cronos)"
                ]
            },
            {
                title: "Audit Trail",
                description: "Records all critical events for future verification.",
                bullets: [
                    "All API call records",
                    "Payment transaction logs",
                    "Withdrawal request history",
                    "Hot Storage: 30 days / Cold Archive: 1 year"
                ]
            }
        ]
    }
};
