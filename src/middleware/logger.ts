import { Request, Response, NextFunction } from 'express';
import { logRequest } from '../database/db';

export const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // We hook into 'finish' event to get final status
    res.on('finish', () => {
        const agentId = req.headers['x-agent-id'] as string;

        // Try to parse error if sent in JSON? 
        // Hard to capture response body without monkeypatching res.send.
        // For now, we trust status code.

        // If it was a 402, did we send 'WWW-Authenticate'? 
        // If it was a 200, we assume paid? 

        // We can extract TxHash from Authorization header if present
        const authHeader = req.headers['authorization'];
        let txHash: string | undefined;
        if (authHeader && authHeader.startsWith('Token ')) {
            txHash = authHeader.split(' ')[1];
        }

        logRequest({
            endpoint: req.originalUrl,
            status: res.statusCode,
            agentId: agentId,
            txHash: txHash,
            amount: res.locals.paymentAmount || '0',
            creditGrade: res.locals.creditGrade,
            latencyMs: res.locals.telemetry?.latencyMs,
            responseSizeBytes: res.locals.telemetry?.responseSizeBytes,
            gasUsed: res.locals.telemetry?.gasUsed,
            contentType: res.locals.telemetry?.contentType,
            integrityCheck: res.locals.telemetry?.integrityCheck
        }).catch(err => console.error("Logging failed", err));
    });

    next();
};
