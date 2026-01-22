
import { initDB } from './src/database/db';

async function check() {
    const pool = await initDB();
    console.log("Checking DB...");
    const res = await pool.query("SELECT * FROM services WHERE slug = 'crypto-price-oracle'");
    console.log("Service found:", res.rows);
    process.exit(0);
}

check().catch(console.error);
