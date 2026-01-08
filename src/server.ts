import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { IdentityService } from './services/IdentityService';
import { optimisticPaymentCheck } from './middleware/optimisticPayment';
import { loggerMiddleware } from './middleware/logger';
import { initDB } from './database/db';
import statsRouter from './routes/stats';
import servicesRouter from './routes/services';
import settingsRouter from './routes/settings';
import providerRouter from './routes/provider';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const localEnvPath = path.join(__dirname, '../../.env.local');
if (fs.existsSync(localEnvPath)) {
    dotenv.config({ path: localEnvPath, override: true });
    console.log('[Server] Loaded local environment configuration');
}
dotenv.config({ path: path.join(__dirname, '../../.env') });

const app = express();
const port = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers (Helmet)
app.use(helmet({
    contentSecurityPolicy: false, // Allow dashboard requests
    crossOriginEmbedderPolicy: false
}));

// Request Logging (Morgan)
if (isProduction) {
    app.use(morgan('combined')); // Apache-style logging for production
} else {
    app.use(morgan('dev')); // Colored dev-friendly logging
}

// Enable CORS for dashboard
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

// Rate limiting - 10 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per IP
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to gatekeeper endpoints
app.use('/gatekeeper', limiter);

// Initialize database
initDB().then(() => {
    console.log('[Server] Database initialized');
}).catch(err => {
    console.error('[Server] Database init failed:', err);
    if (isProduction) process.exit(1); // Fail fast in production
});

// Install Logger & Stats
app.use(loggerMiddleware);
app.use('/api', statsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/provider', providerRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development',
        services: {
            database: 'connected',
            oracle: 'pyth',
            blockchain: 'cronos-zkevm-testnet'
        }
    });
});

// Demo Echo Service for User Testing
app.get('/api/demo/echo', (req, res) => {
    const randomWords = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
    const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];

    res.json({
        service: "Demo Echo API",
        status: "alive",
        random_word: randomWord,
        timestamp: new Date().toISOString(),
        your_query: req.query
    });
});

import { serviceResolver } from './middleware/serviceResolver';
import { creditGuard } from './middleware/creditGuard';

// Dynamic Service Route (RBAC / Multi-Provider)
// Route: /gatekeeper/:serviceSlug/resource
app.all('/gatekeeper/:serviceSlug/resource',
    serviceResolver,
    creditGuard,
    optimisticPaymentCheck,
    async (req, res) => {
        const isOptimistic = res.locals.isOptimistic;
        const config = res.locals.serviceConfig;

        if (!config || !config.upstream_url) {
            return res.status(500).json({ error: 'Service configuration invalid' });
        }

        try {
            // Forward request to upstream service
            const upstreamUrl = config.upstream_url;

            // Prepare headers (exclude host and connection-related headers)
            const forwardHeaders: Record<string, string> = {};
            Object.keys(req.headers).forEach(key => {
                if (!['host', 'connection', 'x-agent-id', 'x-agent-signature', 'x-auth-timestamp'].includes(key.toLowerCase())) {
                    forwardHeaders[key] = req.headers[key] as string;
                }
            });

            // Add gatekeeper metadata header
            forwardHeaders['x-forwarded-by'] = 'highstation';
            forwardHeaders['x-service-name'] = config.name;

            // Forward the request
            const upstreamResponse = await fetch(upstreamUrl, {
                method: req.method,
                headers: forwardHeaders,
                body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
            });

            const upstreamData = await upstreamResponse.json();

            // Return upstream response with gatekeeper metadata
            res.status(upstreamResponse.status).json({
                ...upstreamData,
                _gatekeeper: {
                    service: config.name,
                    timestamp: new Date().toISOString(),
                    optimistic: isOptimistic || false,
                    message: isOptimistic ? "Pay later! Debt recorded." : "Payment verified"
                }
            });

        } catch (error: any) {
            console.error('[Gatekeeper] Upstream proxy error:', error);
            res.status(502).json({
                error: 'Bad Gateway',
                message: 'Failed to connect to upstream service',
                details: error.message
            });
        }
    }
);

// Protected Resource with Optimistic Payment (Legacy/Default)
app.get('/gatekeeper/resource', creditGuard, optimisticPaymentCheck, (req, res) => {
    const isOptimistic = res.locals.isOptimistic;
    res.status(200).json({
        data: "Access Granted: Secret Agent Data",
        timestamp: new Date().toISOString(),
        ...(isOptimistic && { optimistic: true, message: "Pay later! Debt recorded." })
    });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server] Unhandled error:', err);
    const errorMessage = isProduction
        ? 'Internal server error'
        : err.message;
    res.status(500).json({ error: errorMessage });
});

// Export for Vercel Serverless Functions
export default app;

// Only listen on port if running locally (not in Vercel)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Gatekeeper API listening at http://localhost:${port}`);
        console.log(`Health check available at http://localhost:${port}/health`);
        console.log(`[Environment] ${isProduction ? 'Production' : 'Development'} mode`);
        console.log(`[Security] Rate limiting: 10 req/min per IP`);
        console.log(`[Security] Helmet.js: Enabled`);
        console.log(`[Logging] Morgan: ${isProduction ? 'Combined' : 'Dev'} format`);
    });
}
