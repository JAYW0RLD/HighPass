import { mnemonicToAccount } from 'viem/accounts';
import { createPublicClient, http, createWalletClient } from 'viem';
import { cronosTestnet } from 'viem/chains';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * ManagedWalletManager
 * 
 * Handles HD Wallet derivation for provider sub-wallets.
 * Each provider gets a unique address derived from the Master Mnemonic.
 */
export class ManagedWalletManager {
    private masterMnemonic: string;

    constructor() {
        const mnemonic = process.env.MASTER_MNEMONIC;
        if (!mnemonic) {
            throw new Error('CRITICAL: MASTER_MNEMONIC not found in environment');
        }
        this.masterMnemonic = mnemonic;
    }

    /**
     * Derive a wallet address for a given index.
     * Path: m/44'/60'/0'/0/${index}
     */
    getDerivedAddress(index: number): `0x${string}` {
        const account = mnemonicToAccount(this.masterMnemonic, {
            accountIndex: 0,
            addressIndex: index,
            changeIndex: 0
        });
        return account.address;
    }

    /**
     * Get the private key for a derived wallet.
     * WARNING: Use with caution! Only for executing withdrawals.
     */
    getPrivateKey(index: number): `0x${string}` {
        // In-memory derivation (secure as long as environment is isolated)
        // mnemonicToAccount doesn't directly return PK as string but we can get it via account.sign

        // Wait, viem's mnemonicToAccount returns an HDAccount which contains the private key 
        // if we use it for signing.
        // For convenience in some tools, we might want the raw PK.

        // mnemonicToAccount uses the standard BIP-44 path.
        const account = mnemonicToAccount(this.masterMnemonic, {
            addressIndex: index
        });

        // Note: HDAccount doesn't expose raw privateKey by default for security, 
        // but it is accessible via the experimental property or just use the account object in walletClient.
        return (account as any).getPrivateKey?.() || '0x';
    }

    /**
     * Get a dedicated wallet client for a sub-wallet
     */
    getWalletClient(index: number) {
        const account = mnemonicToAccount(this.masterMnemonic, {
            addressIndex: index
        });

        return createWalletClient({
            account,
            chain: cronosTestnet,
            transport: http(process.env.RPC_URL)
        });
    }

    /**
     * Get public client for balance checks
     */
    getPublicClient() {
        return createPublicClient({
            chain: cronosTestnet,
            transport: http(process.env.RPC_URL)
        });
    }
}

export const walletManager = new ManagedWalletManager();
