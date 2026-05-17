import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('❌ DATABASE_URL is not set in .env.local');
  process.exit(1);
}

void (async () => {
  const sql = postgres(url, { max: 1, ssl: 'require' });
  try {
    const result = await sql`SELECT 1 AS ok`;
    console.log('✅ DB connection OK:', result[0]);
  } catch (err) {
    console.error('❌ DB connection FAILED:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
