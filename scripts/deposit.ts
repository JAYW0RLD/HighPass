#!/usr/bin/env ts-node
/**
 * Deposit Script - v1.6.0
 * 
 * 예치금을 충전하여 즉시 API를 사용할 수 있습니다.
 * Grade F 에이전트도 온체인 결제 없이 빠르게 호출 가능!
 * 
 * Usage:
 *   npx ts-node scripts/deposit.ts <tx-hash>
 */

import { createWalletClient, http, parseEther } from 'viem';
import { cronoszkEVMTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

const PAYMENT_HANDLER_ADDRESS = '0x7a3642780386762391262d0577908D5950882e39';
const API_ENDPOINT = process.env.API_ENDPOINT || 'https://highstation.vercel.app';

async function main() {
    // Load agent wallet
    const walletPath = path.join(__dirname, '../.agent-wallet.json');

    if (!fs.existsSync(walletPath)) {
        console.error('❌ No agent wallet found!');
        console.log('💡 Run: npx ts-node scripts/create-agent.ts');
        process.exit(1);
    }

    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    const account = privateKeyToAccount(walletData.privateKey as `0x${string}`);

    console.log('👤 Agent Address:', account.address);
    console.log('💰 Depositing to:', PAYMENT_HANDLER_ADDRESS);
    console.log('');

    // Get deposit amount from user
    const depositAmountCRO = process.argv[2] || '0.1';
    const depositWei = parseEther(depositAmountCRO);

    console.log(`📥 Deposit Amount: ${depositAmountCRO} CRO`);
    console.log('');

    // Create wallet client
    const walletClient = createWalletClient({
        account,
        chain: cronoszkEVMTestnet,
        transport: http()
    });

    try {
        // Send deposit transaction
        console.log('🔄 Sending deposit transaction...');

        const hash = await walletClient.sendTransaction({
            to: PAYMENT_HANDLER_ADDRESS,
            value: depositWei
        });

        console.log('✅ Transaction sent!');
        console.log('📝 Tx Hash:', hash);
        console.log('');
        console.log('⏳ Waiting for confirmation...');

        // Wait for transaction (optional, for demo)
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Register deposit via API
        console.log('🔄 Registering deposit with HighStation...');

        const response = await fetch(`${API_ENDPOINT}/api/deposit`, {
            method: 'POST',
            headers: {
                'X-Agent-ID': account.address,
                'X-Tx-Hash': hash
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Deposit registered successfully!');
            console.log('');
            console.log('📊 Deposit Info:');
            console.log('   Amount:', data.deposit.amount, 'wei');
            console.log('   Transaction:', data.deposit.transaction);
            console.log('');
            console.log('🎉 You can now call APIs instantly without 402!');
            console.log('💡 Try: npx ts-node scripts/run-agent.ts');
        } else {
            const error = await response.json();
            console.error('❌ Failed to register deposit:', error.error);
            console.log('💡 You can manually register with tx hash:', hash);
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();
