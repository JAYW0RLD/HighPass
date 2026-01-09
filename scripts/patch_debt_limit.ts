
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load Env
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function patch() {
    console.log('PATCH: Updating global_debt_limit for Grade C developers...');

    // Update all developers with Grade C to have 1.0 limit
    // Or just update all developers who have limit 5.0 to 1.0
    const { data, error } = await supabase
        .from('developers')
        .update({ global_debt_limit: 1.0 })
        .eq('global_debt_limit', 5.0)
        .select();

    if (error) {
        console.error('Patch Failed:', error);
    } else {
        console.log(`Patch Success! Updated ${data.length} rows.`);
    }
}

patch();
