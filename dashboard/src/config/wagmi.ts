
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { cronos } from 'wagmi/chains';
import { http } from 'wagmi';

// Project ID usually required for WalletConnect, using a placeholder/public one for now.
// In production, you should get a real Project ID from https://cloud.walletconnect.com
const projectId = 'YOUR_PROJECT_ID';

export const config = getDefaultConfig({
    appName: 'HighStation Dashboard',
    projectId: projectId,
    chains: [cronos],
    transports: {
        [cronos.id]: http(),
    },
});
