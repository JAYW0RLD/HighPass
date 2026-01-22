export const quickStartContent = {
    title: "🚀 Get Started in 5 Minutes",
    subtitle: "HighStation is a verifiable infrastructure platform connecting AI services to the decentralized economy.",

    steps: [
        {
            number: 1,
            title: "Login with GitHub",
            description: "Click the \"Login with GitHub\" button in the top right. After completing OAuth authentication, you'll be automatically redirected to the dashboard.",
            bullets: [
                "GitHub account required",
                "Email access permission will be requested",
                "Provider profile automatically created after login"
            ]
        },
        {
            number: 2,
            title: "Register Your API Service",
            description: "Connect your existing API server to HighStation. Make sure your API server is already running and accessible.",
            bullets: [
                "Click 'API Services' in the sidebar",
                "Click 'Provision New Service' button",
                "Switch to 'Custom Service' tab",
                "Enter your service details:",
                "  • Service Name: Display name for your API",
                "  • Slug: Unique identifier (e.g., 'my-api' → my-api.highstation.net)",
                "  • Upstream URL: Your actual API server address (e.g., https://api.myservice.com)",
                "  • Price per Call: Set your pricing in ETH"
            ]
        },
        {
            number: 3,
            title: "Test Connection & Deploy",
            description: "Verify your API server is reachable and deploy your service to HighStation.",
            bullets: [
                "Click 'Test Connection' to verify upstream URL",
                "Ensure you see a success message",
                "Click 'Deploy Service' to go live",
                "Your service is now accessible via HighStation gateway"
            ]
        },
        {
            number: 4,
            title: "Check Your Gateway Endpoint",
            description: "View your public HighStation endpoint that agents will use to call your API.",
            bullets: [
                "Navigate to 'API Services' page",
                "Click on your newly registered service",
                "Copy the External Endpoint (e.g., https://my-api.highstation.net/v1/resource)",
                "This is the URL agents will use - it proxies to your upstream server"
            ]
        },
        {
            number: 5,
            title: "Monitor Revenue & Withdraw",
            description: "Track real-time earnings as agents call your API and withdraw funds to your wallet.",
            bullets: [
                "Navigate to the Dashboard page",
                "Check accumulated revenue in 'Accumulated Revenue' section",
                "Each API call generates revenue based on your pricing",
                "Click 'Withdraw' button to transfer funds to your wallet (MetaMask required)",
                "View detailed transaction history in 'Transaction Log' menu"
            ]
        }
    ],

    nextSteps: [
        {
            title: "Apply OpenSeal Verification",
            description: "Increase your Trust Score by proving your code integrity with OpenSeal. Learn how to build and verify your service.",
            link: "/guide/howto"
        },
        {
            title: "Understand Security",
            description: "Explore HighStation's 3-layer security mechanism and how Trust Score affects your service visibility.",
            link: "/guide/security"
        },
        {
            title: "Service Information",
            description: "Check fee policy (5% platform fee), supported networks, and API specifications.",
            link: "/guide/info"
        }
    ]
};
