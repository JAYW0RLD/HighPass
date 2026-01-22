const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to DB');

        const migrationPath = path.join(__dirname, 'migrations/001_add_openseal_columns.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration...');
        await client.query(sql);
        console.log('Migration applied successfully!');

    } catch (err) {
        if (err.message.includes('already exists')) {
            console.log('Columns already exist, skipping migration.');
        } else {
            console.error('Migration failed:', err);
            process.exit(1);
        }
    } finally {
        await client.end();
    }
}

migrate();
