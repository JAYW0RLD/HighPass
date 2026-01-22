import * as dns from 'dns/promises';
import { URL } from 'url';
import { query } from '../database/db';

export class DomainVerificationService {
    private static readonly TXT_PREFIX = 'highstation-verification=';

    /**
     * DNS TXT 레코드를 통한 도메인 소유권 검증
     */
    static async verifyViaDNS(hostname: string, token: string): Promise<boolean> {
        try {
            console.log(`[DNS Verification] Checking TXT records for ${hostname}...`);
            const records = await dns.resolveTxt(hostname);

            // flattened records (dns.resolveTxt returns array of arrays)
            const flatRecords = records.flat();
            const expectedValue = `${this.TXT_PREFIX}${token}`;

            const found = flatRecords.some(record => record === expectedValue || record.includes(expectedValue));

            if (found) {
                console.log(`[DNS Verification] Success! Token found for ${hostname}`);
            } else {
                console.log(`[DNS Verification] Failed: Token not found in records for ${hostname}`);
            }

            return found;
        } catch (error: any) {
            console.error(`[DNS Verification] Error resolving TXT for ${hostname}:`, error.message);
            return false;
        }
    }

    /**
     * DB의 서비스 검증 상태 업데이트
     */
    static async updateVerificationStatus(serviceId: string, isVerified: boolean) {
        const sql = `
            UPDATE services 
            SET status = $1, verified_at = $2
            WHERE id = $3
        `;
        const values = [
            isVerified ? 'verified' : 'pending',
            isVerified ? new Date().toISOString() : null,
            serviceId
        ];

        await query(sql, values);
    }
}
