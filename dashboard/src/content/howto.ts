export const howToUseContent = {
    title: "📖 How to Use",
    subtitle: "Detailed guide to all features of HighStation.",

    sections: [
        {
            id: "openseal",
            title: "Applying OpenSeal",
            items: [
                {
                    subtitle: "What is OpenSeal?",
                    content: "A system that proves code integrity. Through Merkle Tree-based hash verification, it guarantees 'running code = published source code'."
                },
                {
                    subtitle: "How to Apply",
                    code: `# 1. Install openseal-cli
npm install -g @highstation/openseal-cli

# 2. Build from project root
openseal build

# 3. Verify openseal.json generation
cat openseal.json

# 4. Push to GitHub
git add openseal.json
git commit -m "Add OpenSeal integrity proof"
git push

# 5. Enter Repo URL in dashboard and verify`
                },
                {
                    subtitle: "Verified Badge",
                    bullets: [
                        "✅ 'Verified' badge automatically displayed",
                        "Trust Score automatically increases (+40 points)",
                        "Higher trust leads to more agent requests"
                    ]
                }
            ]
        },
        {
            id: "pricing",
            title: "Setting Pricing Policy",
            items: [
                {
                    subtitle: "How to Input Price",
                    content: "Enter in ETH units during service registration - it's automatically converted to Wei. USD equivalent price is displayed in real-time."
                },
                {
                    subtitle: "Recommended Price Ranges",
                    bullets: [
                        "Text Processing: 0.0001 ~ 0.001 ETH",
                        "Image Generation: 0.01 ~ 0.1 ETH",
                        "Complex LLM: 0.001 ~ 0.01 ETH"
                    ]
                }
            ]
        },
        {
            id: "trust-score",
            title: "Understanding Trust Score",
            items: [
                {
                    subtitle: "Score Ranges",
                    bullets: [
                        "F (0-40): Limited access",
                        "C (40-60): Standard access",
                        "B (60-80): Priority access",
                        "A (80-100): Premium access"
                    ]
                },
                {
                    subtitle: "How to Increase Score",
                    bullets: [
                        "✅ Apply OpenSeal verification (+40 points)",
                        "✅ Maintain high success rate (99%+ recommended)",
                        "✅ Keep low latency (< 100ms average)",
                        "✅ Stable long-term operation (30+ days)"
                    ]
                }
            ]
        },
        {
            id: "withdrawal",
            title: "How to Withdraw Revenue",
            items: [
                {
                    subtitle: "Prerequisites",
                    bullets: [
                        "MetaMask or WalletConnect wallet connected",
                        "Sufficient gas fee (~0.001 ETH)",
                        "Minimum withdrawal: 0.01 ETH"
                    ]
                },
                {
                    subtitle: "Withdrawal Process",
                    bullets: [
                        "1. Check 'Accumulated Revenue' on Dashboard",
                        "2. Click 'Withdraw' button",
                        "3. Approve wallet signature request",
                        "4. Wait for transaction completion (~1 minute)",
                        "5. View history in 'Transaction Log'"
                    ]
                },
                {
                    subtitle: "Important Notes",
                    bullets: [
                        "Platform fee: 5%",
                        "Gas fees paid separately",
                        "Withdrawal processed immediately (excluding blockchain confirmation time)"
                    ]
                }
            ]
        }
    ]
};
