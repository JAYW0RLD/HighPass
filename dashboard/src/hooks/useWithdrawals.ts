import { useState, useEffect, useCallback } from 'react';
import { authenticatedFetch } from '../utils/apiClient';

export interface Withdrawal {
    id: string;
    amount_wei: string;
    to_address: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
    tx_hash?: string;
    rejection_reason?: string;
    created_at: string;
    completed_at?: string;
}

export function useWithdrawals() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchWithdrawals = useCallback(async () => {
        try {
            const res = await authenticatedFetch('/api/settings/withdrawals');
            if (res.ok) {
                const data = await res.json();
                setWithdrawals(data.withdrawals || []);
            }
        } catch (err) {
            console.error('Failed to fetch withdrawals:', err);
        }
    }, []);

    const requestWithdrawal = async (amountWei: string, toAddress: string) => {
        setLoading(true);
        try {
            const res = await authenticatedFetch('/api/provider/withdraw/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amountWei, toAddress })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to request withdrawal');
            }

            await fetchWithdrawals();
            return { success: true };
        } catch (err: any) {
            console.error('Withdrawal error:', err);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, [fetchWithdrawals]);

    return {
        withdrawals,
        requestWithdrawal,
        loading,
        refresh: fetchWithdrawals
    };
}
