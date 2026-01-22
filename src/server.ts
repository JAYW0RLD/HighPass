import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import './utils/env';
import { validateEnv, validateProductionEnv } from './utils/validateEnv';

// Validate Env
validateEnv();
validateProductionEnv();
console.log('[Server] Production Env Validation enabled');

import { PriceService } from './services/PriceService';
import { FeeSettlementEngine } from './services/FeeSettlementEngine';
import { ScoringService } from './services/ScoringService'; // [NEW]
import { ProxyService } from './services/ProxyService';
import { loggerMiddleware } from './middleware/logger';
import { initDB } from './database/db';
import statsRouter from './routes/stats';
import servicesRouter from './routes/services';
import settingsRouter from './routes/settings';
import providerRouter from './routes/provider';
import discoveryRouter from './routes/discovery';
import adminRouter from './routes/admin';
import { strictPaymentGuard } from './middleware/strictPayment';
import { serviceResolver } from './middleware/serviceResolver';
import { domainResolver } from './middleware/domainResolver';
import { authMiddleware } from './middleware/authMiddleware';
import { FEE_CONFIG } from './config/reputation';
// import { publicClient } from './utils/viemClient'; // Removed: Used SDK
// import { formatGwei } from 'viem'; // Removed: Used SDK
import { APP_CONFIG } from './config/app';
import { CHAIN_CONFIG } from './config/chain';
import * as fs from 'fs';
import * as path from 'path';

const app = express();
const port = APP_CONFIG.PORT;
const isProduction = APP_CONFIG.IS_PRODUCTION;
const frontendPath = path.join(process.cwd(), 'dashboard/dist');

// Global Logger (Must be first)
app.use((req, res, next) => {
    console.log(`[Global Debug] ${req.method} ${req.url}`);
    next();
});

// Security & Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // [FIX] Allow Google Fonts
            imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
            connectSrc: ["'self'", APP_CONFIG.SUPABASE.URL || "https://*.supabase.co", "https://api.coinbase.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: isProduction ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

if (isProduction) {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
        const proto = req.header('x-forwarded-proto') || req.protocol;
        if (proto !== 'https') {
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// CORS
const getAllowedOrigins = () => {
    const configured = APP_CONFIG.ALLOWED_ORIGINS;
    if (configured.length > 0 && configured[0] !== '') return configured;

    if (isProduction) {
        return ['https://www.highstation.net', 'https://highstation.net'];
    }
    return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:2000'];
};
app.use(cors({ origin: getAllowedOrigins(), credentials: true, maxAge: 86400 }));
app.use((req, res, next) => {
    console.log(`[Global Debug] ${req.method} ${req.url}`);
    next();
});

app.get('/debug-index', (req, res) => {
    console.log('[Debug] Serving index.html explicitly from TOP');
    const p = path.join(process.cwd(), 'dashboard/dist/index.html');
    console.log(`[Debug] Path: ${p}`);
    res.sendFile(p);
});

app.get('/debug-index', (req, res) => {
    console.log('[Debug] Serving index.html explicitly from TOP');
    const p = path.join(process.cwd(), 'dashboard/dist/index.html');
    console.log(`[Debug] Path: ${p}`);
    res.sendFile(p);
});

// Body Parser (Scoped to API routes)
const jsonParser = express.json({ limit: '2mb' });
app.use('/api', jsonParser);
app.use('/gatekeeper', jsonParser);

// Logging
app.use(isProduction ? morgan('combined') : morgan('dev'));

// Rate Limiting
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const infoLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/gatekeeper', limiter);
app.use('/api', limiter);

// DB Init
initDB().then(() => console.log('[Server] Database initialized')).catch(err => {
    console.error('[Server] Database init failed:', err);
    if (isProduction) process.exit(1);
});

// Nonce Cleanup
const { cleanupExpiredNonces } = require('./database/db');
setInterval(async () => {
    try { await cleanupExpiredNonces(); } catch (err) { console.error('Nonce cleanup failed', err); }
}, 60 * 1000);

// Routes
app.use(loggerMiddleware);
app.use('/api', statsRouter);
app.use('/api/discovery', discoveryRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/services', authMiddleware, servicesRouter);
app.use('/api/provider', authMiddleware, providerRouter);
app.use('/api/admin', authMiddleware, adminRouter);

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development',
        services: { database: 'connected', oracle: 'pyth', blockchain: CHAIN_CONFIG.name }
    });
});

// MCP Implementation (Agent Interface)
import { McpService } from './services/McpService';
const mcpService = new McpService();

// SSE Endpoint (Agent Connect)
app.get('/mcp/sse', async (req, res) => {
    console.log(`[MCP] New Connection Request from ${req.ip}`);
    await mcpService.handleConnection(req, res);
});
console.log('[Server] MCP Routes Registered at /mcp/sse and /mcp/message');

// Message Endpoint (Agent Interaction)
app.post('/mcp/message', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
        res.status(400).send('Missing sessionId');
        return;
    }
    await mcpService.handleMessage(req, res, sessionId);
});

// Demo Services (Testing) - [REMOVED FOR CLEANUP]

// GATEKEEPER: Protected Resource (Simple)
app.get('/gatekeeper/resource', strictPaymentGuard, (req, res) => {
    res.status(200).json({ data: "Access Granted: Paid Resource", timestamp: new Date().toISOString() });
});

// GATEKEEPER: Info
app.get('/gatekeeper/:serviceSlug/info', infoLimiter, serviceResolver, async (req, res) => {
    const config = res.locals.serviceConfig;
    if (!config) return res.status(404).json({ error: 'Service not found' });

    try {
        const feeEngine = new FeeSettlementEngine();
        // [FIX] Use Fixed USD Service Price for Demo ($0.01)
        const servicePriceUsd = 0.01;
        const feeResult = await feeEngine.calculateFee({ servicePriceUsd, marginPercent: FEE_CONFIG.GAS_MARGIN_PERCENT });

        res.json({
            name: config.name,
            slug: config.slug,
            status: 'active',
            verified: config.status === 'verified', // [NEW] Boolean verification flag
            verification_status: config.status, // [NEW] Raw status (verified/pending)
            pricing: {
                base_price_usd: servicePriceUsd.toString(),
                total_price_units: feeResult.totalUnits.toString(),
                currency: 'USDC',
                breakdown: feeResult.breakdown
            },
            requirements: { payment_model: 'strict_x402' },
            capabilities: config.capabilities, // [NEW] Expose endpoints & schemas
            // upstream_base removed for security (Keep provider endpoints private)
            // [NEW] Trust Signal Exposure
            trust_signal: await new ScoringService().computeTrustSignal(config.slug)
        });
    } catch (err: any) {
        console.error('[Gatekeeper Info] Handler Error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: isProduction ? undefined : err.message });
    }
});

// [HACKATHON] UNIVERSAL PROXY: Domain-based routing (Custom Domain Support)
// This replaces the legacy /gatekeeper/:slug pattern with flexible domain-based routing
app.use(domainResolver); // Apply domain-based service resolution globally

// GATEKEEPER: STRICT x402 PROXY (Wildcard Support Added)
// GATEKEEPER: STRICT x402 PROXY (Robust Path Matching)
app.all(/^\/gatekeeper\/([^/]+)\/resource(\/.*)?$/,
    (req, res, next) => {
        req.params.serviceSlug = req.params[0];
        const rawSplat = req.params[1] || '';
        req.params.splat = rawSplat.startsWith('/') ? rawSplat.substring(1) : rawSplat;
        next();
    },
    serviceResolver,
    strictPaymentGuard,
    async (req, res) => {
        const config = res.locals.serviceConfig;
        if (!config || !config.upstream_url) return res.status(500).json({ error: 'Service configuration invalid' });

        try {
            const result = await ProxyService.forwardRequest(req as any, config.upstream_url, config.name, req.params.splat || '', config.signing_secret, config.openseal_root_hash);
            res.locals.telemetry = result.telemetry;
            res.status(result.status).json({
                ...result.data,
                _gatekeeper: {
                    service: config.name,
                    timestamp: new Date().toISOString(),
                    mode: "Strict x402",
                    telemetry: {
                        latency_ms: result.telemetry.latencyMs,
                    }
                }
            });

            // [NEW] Compute Scoring for Request Logging
            res.locals.trustSignal = await new ScoringService().computeTrustSignal(config.slug);

        } catch (error: any) {
            res.status(502).json({ error: 'Bad Gateway', details: error.message });
        }
    });

// [HACKATHON] UNIVERSAL DOMAIN-BASED PROXY
// Handles all requests that were resolved by domainResolver
// Supports: Custom Domains, Subdomains, and catch-all routing
app.all(/(.*)/, async (req, res, next) => {
    const config = res.locals.serviceConfig;

    // If no service matched, pass to static file handler
    if (!config) {
        return next();
    }

    // Skip if already handled by specific route
    if (req.path.startsWith('/gatekeeper')) {
        return next();
    }

    // Apply payment guard
    return strictPaymentGuard(req, res, async () => {
        try {
            // Use stripped path if legacy route, otherwise use full path
            const subPath = res.locals.strippedPath || req.path;

            const result = await ProxyService.forwardRequest(
                req as any,
                config.upstream_url,
                config.name,
                subPath,
                config.signing_secret,
                config.openseal_root_hash
            );

            res.locals.telemetry = result.telemetry;
            res.status(result.status).json({
                ...result.data,
                _gatekeeper: {
                    service: config.name,
                    timestamp: new Date().toISOString(),
                    mode: "Domain-based x402",
                    source: res.locals.serviceSource,
                    telemetry: {
                        latency_ms: result.telemetry.latencyMs,
                    }
                }
            });

            // Compute Scoring for Request Logging
            res.locals.trustSignal = await new ScoringService().computeTrustSignal(config.slug);

        } catch (error: any) {
            res.status(502).json({ error: 'Bad Gateway', details: error.message });
        }
    });
});

// Static Files
console.log(`[Server] Checking Frontend Path: ${frontendPath}`);
if (fs.existsSync(frontendPath)) {
    console.log(`[Server] Frontend found. Serving static files...`);
    app.use(express.static(frontendPath));

    app.get('/debug-index', (req, res) => {
        console.log('[Debug] Serving index.html explicitly');
        res.sendFile(path.join(frontendPath, 'index.html'));
    });

    // SPA Catch-all for non-API routes
    // [NEW] API Health/Debug Route
    app.get('/api/debug/ping', async (req, res) => {
        try {
            const { initDB } = await import('./database/db');
            await initDB();
            res.json({
                status: 'ok',
                env: process.env.NODE_ENV,
                vercel: !!process.env.VERCEL,
                db_url_present: !!process.env.DATABASE_URL
            });
        } catch (e: any) {
            res.status(500).json({ status: 'error', message: e.message });
        }
    });

    app.get(/(.*)/, (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/gatekeeper') || req.path.startsWith('/mcp')) {
            return next();
        }
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
} else {
    console.warn(`[Server] Frontend build not found at ${frontendPath}`);
}


// Global Error Handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server] Unhandled error:', err);
    res.status(500).json({ error: isProduction ? 'Internal server error' : err.message });
});

export default app;

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const server = app.listen(port, () => {
        console.log(`Gatekeeper API listening at http://localhost:${port}`);
        console.log(`Strict Payment Mode: ENABLED`);
    });

    // Setup Terminal WebSocket
    import('./lib/terminal-pty').then(({ setupTerminalWebSocket }) => {
        setupTerminalWebSocket(server);
    });
}
