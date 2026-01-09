import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
const localEnvPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: localEnvPath, override: true });
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials for auth middleware');
}

// Create a client for auth verification (Anon key is sufficient for getUser with token)
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Invalid Authorization header format' });
        }

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            console.warn('[Auth] Invalid token:', error?.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach user to locals
        res.locals.user = user;
        next();

    } catch (error) {
        console.error('[Auth] Middleware error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
