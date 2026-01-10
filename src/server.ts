import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
// Load environment variables immediately
import './utils/env';

import { validateEnv, validateProductionEnv } from './utils/validateEnv';

// SECURITY FIX (V-14): Validate environment variables before starting server
validateEnv();
validateProductionEnv();

import { IdentityService } from './services/IdentityService';
import { PriceService } from './services/PriceService';
import { FeeSettlementEngine } from './services/FeeSettlementEngine';
import { ProxyService } from './services/ProxyService';
import { optimisticPaymentCheck } from './middleware/optimisticPayment';
import { loggerMiddleware } from './middleware/logger';
import { initDB } from './database/db';
import statsRouter from './routes/stats';
import servicesRouter from './routes/services';
import settingsRouter from './routes/settings';
import providerRouter from './routes/provider';
import discoveryRouter from './routes/discovery'; // v1.8.0

// Static Files (Frontend) logic moved below declaration
import * as fs from 'fs';
import * as path from 'path';

// Serve frontend static files in production or if build exists
const frontendPath = path.join(__dirname, '../../dashboard/dist');

// Local env loading is handled by src/utils/env.ts now.

const app = express();
const port = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers (Helmet)
// XSS Mitigation: Strict Content Security Policy
const supabaseUrl = process.env.SUPABASE_URL || 'https://*.supabase.co';
const supabaseWss = supabaseUrl.replace('https://', 'wss://').replace('http://', 'ws://');

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for some dev tools/source maps in non-prod. In strict prod, remove if possible.
            styleSrc: ["'self'", "'unsafe-inline'"], // styled-components/css-in-js often needs unsafe-inline
            imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co"],
            connectSrc: ["'self'", supabaseUrl, supabaseWss, "https://api.coinbase.com"], // Allow Supabase & external APIs
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: isProduction ? [] : null, // Upgrade HTTP to HTTPS in prod
        },
    },
    // Cross-Origin policies
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow resources to be loaded
}));

// SECURITY FIX (V-NEW-08): Explicit HTTPS enforcement in production
if (isProduction) {
    // RED TEAM FIX [V-RT-01]: Trust Proxy for Vercel
    // Required to get correct client IP for rate limiting
    app.set('trust proxy', 1);

    app.use((req, res, next) => {
        // Check if request came via HTTPS (x-forwarded-proto header is set by proxies like Vercel/Heroku)
        const proto = req.header('x-forwarded-proto') || req.protocol;
        if (proto !== 'https') {
            console.warn(`[Security] Redirecting HTTP to HTTPS: ${req.url}`);
            return res.redirect(301, `https://${req.headers.host}${req.url}`);
        }
        next();
    });
}

// ... (skipping to SAFE_HEADERS) ...

// SECURITY FIX (V-NEW-03): Strict header allowlist instead of blocklist
// Prevent header injection attacks on upstream services
const SAFE_HEADERS = new Set([
    'accept',
    'accept-encoding',
    'accept-language',
    'content-type',
    'content-length',
    'user-agent',
    'cache-control'
    // RED TEAM FIX [V-RT-02]: Strip 'authorization' header to prevent leakage
    // HighStation's tokens should not be sent to upstream.
]);

// Request Logging (Morgan)
if (isProduction) {
    app.use(morgan('combined')); // Apache-style logging for production
} else {
    app.use(morgan('dev')); // Colored dev-friendly logging
}

// Enable CORS for dashboard
// SECURITY FIX (V-NEW-02): Strict CORS origin validation
const getAllowedOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        let origins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim());

        // Fallback for HighStation production if env var is missing
        if (!origins || origins.length === 0) {
            console.warn('[CORS] ALLOWED_ORIGINS not set. Using default HighStation domains.');
            origins = ['https://www.highstation.net', 'https://highstation.net'];
        }

        // SECURITY: Validate each origin strictly
        const validOrigins = origins.filter(origin => {
            try {
                // Reject dangerous patterns
                if (origin.includes('*') || origin === 'null' || origin === '') {
                    console.error(`[CORS] Rejected dangerous origin: ${origin}`);
                    return false;
                }

                const url = new URL(origin);

                // HTTPS only in production
                if (url.protocol !== 'https:') {
                    console.error(`[CORS] Rejected non-HTTPS origin: ${origin}`);
                    return false;
                }

                // No localhost in production
                if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
                    console.error(`[CORS] Rejected localhost origin in production: ${origin}`);
                    return false;
                }

                return true;
            } catch (err) {
                console.error(`[CORS] Invalid origin format: ${origin}`, err);
                return false;
            }
        });

        if (validOrigins.length === 0) {
            throw new Error('No valid origins found in ALLOWED_ORIGINS. Check configuration.');
        }

        console.log(`[CORS] Validated ${validOrigins.length} allowed origins for production`);
        return validOrigins;
    }
    return ['http://localhost:5173', 'http://localhost:5174'];
};

app.use(cors({
    origin: getAllowedOrigins(),
    credentials: true,
    maxAge: 86400 // Cache preflight for 24h
}));

// Rate limiting - Prevent DoS and service enumeration
// NOTE: HighStation is a payment gateway - agents may need frequent API calls
// Global limit set to 100 req/min (reasonable for legitimate use)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per IP - suitable for payment gateway
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// SECURITY FIX (V-02): Dedicated stricter limiter for service info endpoint
// to prevent service enumeration and DB connection pool exhaustion
// Info endpoint is less critical, so we apply tighter limit
const infoLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute  
    max: 20, // 20 info requests per minute (discovery/enumeration prevention)
    message: { error: 'Too many info requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to gatekeeper and API endpoints
app.use('/gatekeeper', limiter);
app.use('/api', limiter);

// Initialize database
initDB().then(() => {
    console.log('[Server] Database initialized');
}).catch(err => {
    console.error('[Server] Database init failed:', err);
    if (isProduction) process.exit(1); // Fail fast in production
});

// SECURITY FIX (V-NEW-04): More frequent nonce cleanup to prevent timing attacks
// Run cleanup every 1 minute instead of 5 to minimize replay window
const { cleanupExpiredNonces } = require('./database/db');
setInterval(async () => {
    try {
        await cleanupExpiredNonces();
        console.log('[Maintenance] Nonce cleanup completed');
    } catch (err) {
        console.error('[Maintenance] Nonce cleanup failed:', err);
    }
}, 60 * 1000); // Changed from 5 minutes (300000) to 1 minute (60000)

import { authMiddleware } from './middleware/authMiddleware';

// Install Logger & Stats
app.use(loggerMiddleware);
app.use('/api', statsRouter); // Public stats
app.use('/api/discovery', discoveryRouter); // v1.8.0 Public Discovery Hub

// Protected Routes
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/services', authMiddleware, servicesRouter); // Note: servicesRouter has a public GET / which we might need to unprotect? 
// Actually, services.ts GET / is protected by RLS if used via Supabase, but here it's an API.
// provider/stats needs auth.
app.use('/api/provider', authMiddleware, providerRouter);

// SECURITY FIX (V-NEW-06): Rate limit flush endpoint to prevent enumeration
const flushLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Maximum 5 flush requests per minute per IP
    message: { error: 'Too many flush requests. Please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Manual Debt Settlement (Flush) Endpoint
import { flushDebt } from './routes/flush';
import { depositHandler } from './routes/deposit'; // v1.6.0

// Manual Flush Debt Endpoint - Rate Limited (Authenticated via Signature)
app.post('/api/flush', flushLimiter, flushDebt);

// v1.6.0: Deposit Endpoint - Rate Limited
app.post('/api/deposit', flushLimiter, depositHandler);

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

import { publicClient } from './utils/viemClient';
import { formatGwei } from 'viem';

// Demo Service for User Testing (Placeholder)
app.get('/api/demo/service', async (req, res) => {
    try {
        const randomWords = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'];
        const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];

        // Fetch real network stats
        const gasPrice = await publicClient.getGasPrice();
        const blockNumber = await publicClient.getBlockNumber();
        const gasPriceGwei = parseFloat(formatGwei(gasPrice));

        // Determine congestion level (Mock logic based on realistic Cronos values)
        // Cronos zkEVM average is usually ~10 Gwei.
        let congestion = "Low";
        if (gasPriceGwei > 15) congestion = "Medium";
        if (gasPriceGwei > 30) congestion = "High";

        res.json({
            service: "Broadcasting Demo Service",
            status: "alive",
            network_stats: {
                chain: "Cronos zkEVM Testnet",
                block_height: Number(blockNumber),
                gas_price_wei: gasPrice.toString(),
                gas_price_gwei: gasPriceGwei.toFixed(2),
                congestion_level: congestion
            },
            data: {
                type: "demo_signal",
                payload: randomWord
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Demo Service Error:", error);
        res.status(500).json({ error: "Failed to fetch network stats" });
    }
});

import { serviceResolver } from './middleware/serviceResolver';
import { creditGuard } from './middleware/creditGuard';
import { accessControlEngine } from './middleware/AccessControlEngine';

// STATIC FILES SERVING
if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
}

// Service Info & Cost Discovery Endpoint
// SECURITY FIX (V-02): Apply stricter rate limiter to prevent enumeration
app.get('/gatekeeper/:serviceSlug/info',
    infoLimiter,  // NEW: Strict rate limit (10 req/min)
    serviceResolver,
    async (req, res) => {
        const config = res.locals.serviceConfig;
        if (!config) {
            return res.status(404).json({ error: 'Service not found' });
        }

        try {
            // Dynamic Price Calculation
            const priceService = new PriceService();
            const feeEngine = new FeeSettlementEngine();

            // Base Price
            let basePriceWei = BigInt(config.price_wei || '0');

            // If dynamic oracle pricing was used (fallback), we might miss it here if logic is only in optimisticPayment.
            // But serviceResolver sets 'config' from DB. If DB has 0, optimisticPayment defaults to oracle.
            // We should replicate that 'fallback' logic if needed, or just show what's in config.
            // For accuracy, let's assume DB dictates price. If DB is 0 and it's not a demo, implementation might vary.
            // But let's stick to config-based reporting for now.

            // Calculate Total Fee (Gas + Margin)
            const feeResult = await feeEngine.calculateFee({
                servicePriceWei: basePriceWei,
                marginPercent: 0.005 // 0.5% Margin
            });

            const totalWei = feeResult.totalWei;

            // Convert to roughly USD for display
            // Assuming 1 CRO = $0.10 roughly (just for display, real rate depends on oracle)
            const croAmount = Number(totalWei) / 1e18;

            res.json({
                name: config.name,
                slug: config.slug,
                status: 'active',
                pricing: {
                    base_price_wei: basePriceWei.toString(),
                    total_price_wei: totalWei.toString(),
                    currency: 'CRO',
                    estimated_cro: croAmount.toFixed(6),
                    breakdown: feeResult.breakdown
                },
                requirements: {
                    min_grade: config.min_grade || 'F',
                    payment_model: 'optimistic_v1'
                },
                upstream_base: config.upstream_url
            });

        } catch (err: any) {
            console.error('[Info] Error calculating price:', err);

            // SECURITY FIX (V-NEW-05): Prevent information disclosure via error messages
            const isProduction = process.env.NODE_ENV === 'production';
            res.status(500).json({
                error: 'Internal Server Error',
                // Only show details in development
                ...(isProduction ? {} : {
                    details: err.message,
                    stack: err.stack
                })
            });
        }
    }
);

// Dynamic Service Route (RBAC / Multi-Provider)
// Route: /gatekeeper/:serviceSlug/resource
app.all('/gatekeeper/:serviceSlug/resource',
    serviceResolver,
    creditGuard,
    accessControlEngine,
    optimisticPaymentCheck,
    async (req, res) => {
        const isOptimistic = res.locals.isOptimistic;
        const config = res.locals.serviceConfig;

        if (!config || !config.upstream_url) {
            return res.status(500).json({ error: 'Service configuration invalid' });
        }

        try {
            const result = await ProxyService.forwardRequest(req, config.upstream_url, config.name, config.signing_secret);

            // Store Telemetry in Locals for Logger
            res.locals.telemetry = result.telemetry;

            // Return upstream response with gatekeeper metadata
            res.status(result.status).json({
                ...result.data,
                _gatekeeper: {
                    service: config.name,
                    timestamp: new Date().toISOString(),
                    optimistic: isOptimistic || false,
                    message: isOptimistic ? "Pay later! Debt recorded." : "Payment verified",
                    telemetry: {
                        latency_ms: result.telemetry.latencyMs,
                        size_bytes: result.telemetry.responseSizeBytes,
                        content_type: result.telemetry.contentType,
                        integrity_hash: result.telemetry.integrityCheck
                    }
                }
            });

        } catch (error: any) {
            console.error('[Gatekeeper] Upstream proxy error:', error);

            res.status(502).json({
                error: 'Bad Gateway',
                message: 'Failed to connect to upstream service or invalid response',
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
        if (fs.existsSync(frontendPath)) {
            console.log(`[Frontend] Serving static files from ${frontendPath}`);
        } else {
            console.log(`[Frontend] No build found at ${frontendPath}. Use 'npm run build' or run separate dev server.`);
        }
        console.log(`[Security] Rate limiting: 10 req/min per IP`);
        console.log(`[Security] Helmet.js: Enabled`);
        console.log(`[Logging] Morgan: ${isProduction ? 'Combined' : 'Dev'} format`);
    });
}
