#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Pool } = require('pg');

// Load environment variables from .env.local (Next.js default) or .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getDatabaseConnection() {
  // Option 1: Use direct connection string (recommended)
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  if (databaseUrl) {
    return new Pool({ connectionString: databaseUrl });
  }

  // Option 2: Construct from Supabase URL and password
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const dbHost = process.env.SUPABASE_DB_HOST;

  if (supabaseUrl && dbPassword) {
    // Extract project ref from URL if needed
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    const host = dbHost || (projectRef ? `${projectRef}.supabase.co` : null);

    if (host) {
      return new Pool({
        host: host,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: dbPassword,
        ssl: { rejectUnauthorized: false },
      });
    }
  }

  // Check if .env files exist
  const envLocalExists = fs.existsSync(path.join(process.cwd(), '.env.local'));
  const envExists = fs.existsSync(path.join(process.cwd(), '.env'));
  const envFile = envLocalExists ? '.env.local' : envExists ? '.env' : '.env.local';

  log('\n❌ Error: Missing database connection information', colors.red);
  log('\nYou need to add one of the following to your ' + envFile + ' file:', colors.yellow);

  const supabaseUrlExists = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrlExists) {
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.match(
      /https?:\/\/([^.]+)\.supabase\.co/
    )?.[1];
    log('\n📋 Option 1 (Recommended): Add to ' + envFile + ':', colors.cyan);
    log(
      '   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@' +
        (projectRef || '[PROJECT]') +
        '.supabase.co:5432/postgres',
      colors.reset
    );
    log('\n📋 Option 2: Add to ' + envFile + ':', colors.cyan);
    if (projectRef) {
      log('   SUPABASE_DB_HOST=' + projectRef + '.supabase.co', colors.reset);
    } else {
      log('   SUPABASE_DB_HOST=[your-project].supabase.co', colors.reset);
    }
    log('   SUPABASE_DB_PASSWORD=[your-database-password]', colors.reset);
  } else {
    log('\n📋 Option 1 (Recommended): Add to ' + envFile + ':', colors.cyan);
    log('   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres', colors.reset);
    log('\n📋 Option 2: Add to ' + envFile + ':', colors.cyan);
    log('   SUPABASE_DB_HOST=[your-project].supabase.co', colors.reset);
    log('   SUPABASE_DB_PASSWORD=[your-database-password]', colors.reset);
  }

  log('\n🔑 How to get your database connection string:', colors.yellow);
  log('   1. Go to Supabase Dashboard → Your Project', colors.reset);
  log('   2. Navigate to Project Settings → Database', colors.reset);
  log('   3. Scroll to "Connection string" section', colors.reset);
  log('   4. Copy the "URI" connection string (starts with postgresql://)', colors.reset);
  log('      ⚠️  Use "URI" NOT "Connection pooling" for migrations', colors.yellow);
  log('   5. Add it to your .env.local file as DATABASE_URL', colors.reset);
  log("\n   If you don't know your password:", colors.yellow);
  log('   • Go to Project Settings → Database → Reset database password', colors.reset);
  log('   • Then copy the new connection string', colors.reset);
  log('\n');
  process.exit(1);
}

function getMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    log('Error: supabase/migrations directory not found', colors.red);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  return files.map((file) => ({
    name: file,
    path: path.join(migrationsDir, file),
  }));
}

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function questionSingleChar(query) {
  return new Promise((resolve) => {
    // Temporarily pause readline to avoid conflicts
    rl.pause();

    process.stdout.write(query);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (char) => {
      const ch = char.toString().toLowerCase();

      if (ch === '\u0003') {
        // Ctrl+C
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        rl.resume();
        process.exit(0);
      }

      if (ch === 'y' || ch === 'n') {
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        process.stdout.write(ch + '\n');
        // Restore readline for next question
        rl.resume();
        resolve(ch);
      }
    };

    process.stdin.on('data', onData);
  });
}

async function selectMigrations(migrations) {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║          Available Migration Files                ║', colors.bright + colors.cyan);
  log('╚═══════════════════════════════════════════════════╝', colors.bright + colors.cyan);
  console.log('');

  migrations.forEach((migration, index) => {
    const fileSize = fs.statSync(migration.path).size;
    const sizeKB = (fileSize / 1024).toFixed(2);
    log(
      `  [${String(index + 1).padStart(2, ' ')}] ${migration.name.padEnd(35, ' ')} (${sizeKB} KB)`,
      colors.blue
    );
  });

  console.log('\n');
  log('━'.repeat(55), colors.magenta);
  log('Selection Options:', colors.bright + colors.yellow);
  log('  • Enter numbers separated by commas (e.g., 1,2,3)', colors.reset);
  log('  • Enter "all" to run all migrations', colors.reset);
  log('  • Press Enter to cancel', colors.reset);
  log('━'.repeat(55), colors.magenta);
  console.log('');

  const answer = await question(colors.green + 'Select migrations to run: ' + colors.reset);

  if (!answer.trim()) {
    return [];
  }

  if (answer.toLowerCase() === 'all') {
    return migrations;
  }

  const indices = answer
    .split(',')
    .map((s) => parseInt(s.trim()) - 1)
    .filter((i) => !isNaN(i) && i >= 0 && i < migrations.length);

  return indices.map((i) => migrations[i]);
}

async function previewMigration(migration) {
  const sql = fs.readFileSync(migration.path, 'utf-8');
  const lines = sql.split('\n');
  const preview = lines.slice(0, 10).join('\n');
  const hasMore = lines.length > 10;

  log(`\n  Preview of ${migration.name}:`, colors.cyan);
  log('  ' + '─'.repeat(50), colors.cyan);
  console.log('  ' + preview.split('\n').join('\n  '));
  if (hasMore) {
    log(`  ... (${lines.length - 10} more lines)`, colors.yellow);
  }
  log('  ' + '─'.repeat(50), colors.cyan);
}

async function runMigration(pool, migration) {
  log(`\n▸ Running: ${migration.name}`, colors.bright + colors.cyan);

  const client = await pool.connect();

  try {
    const sql = fs.readFileSync(migration.path, 'utf-8');

    // Execute the entire migration as a single transaction
    await client.query('BEGIN');

    try {
      // Execute the SQL - pg handles multiple statements automatically
      await client.query(sql);
      await client.query('COMMIT');

      log(`✓ Successfully executed: ${migration.name}`, colors.bright + colors.green);
      return { success: true, migration: migration.name };
    } catch (queryError) {
      await client.query('ROLLBACK');
      throw queryError;
    }
  } catch (error) {
    log(`✗ Failed: ${migration.name}`, colors.bright + colors.red);

    // Provide helpful error messages for common issues
    if (error.code === '28P01') {
      log(`  Error: Password authentication failed`, colors.red);
      log('\n  🔑 This usually means:', colors.yellow);
      log('     • The password in DATABASE_URL is incorrect', colors.reset);
      log('     • You might be using the wrong connection string', colors.reset);
      log('\n  💡 Solutions:', colors.cyan);
      log('     1. Get the correct connection string from Supabase Dashboard:', colors.reset);
      log('        Project Settings → Database → Connection string', colors.reset);
      log('     2. Make sure you\'re using the "URI" (not "Connection pooling")', colors.reset);
      log("     3. If you don't know your password, reset it:", colors.reset);
      log('        Project Settings → Database → Reset database password', colors.reset);
      log('     4. Alternatively, use Supabase CLI:', colors.reset);
      log('        pnpm exec supabase db push', colors.reset);
    } else if (error.code === '42P07' || error.message.includes('already exists')) {
      // Table/relation already exists - treat as success since migration is idempotent
      log(`  ⚠️  Warning: ${error.message}`, colors.yellow);
      log(`  ℹ️  This object already exists - skipping (migration is idempotent)`, colors.cyan);
      log('', colors.reset);
      return { success: true, migration: migration.name, skipped: true };
    } else if (error.code === '42P01' && migration.name.includes('drop')) {
      // Relation does not exist - expected for drop migrations, treat as success
      log(`  ℹ️  ${error.message}`, colors.cyan);
      log(`  ✓ This is expected for drop migrations when objects don't exist`, colors.green);
      log('', colors.reset);
      return { success: true, migration: migration.name, skipped: true };
    } else {
      log(`  Error: ${error.message}`, colors.red);
      if (error.code) {
        log(`  Code: ${error.code}`, colors.reset);
      }
      log('\n  💡 Tip: For complex migrations, consider using:', colors.yellow);
      log('     • Supabase CLI: pnpm exec supabase db push', colors.yellow);
      log('     • SQL Editor in Supabase Dashboard', colors.yellow);
      log('', colors.reset);
    }

    return { success: false, migration: migration.name, error: error.message };
  } finally {
    client.release();
  }
}

async function confirmRun(selectedMigrations) {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════╗', colors.bright + colors.yellow);
  log('║          Selected Migrations for Execution        ║', colors.bright + colors.yellow);
  log('╚═══════════════════════════════════════════════════╝', colors.bright + colors.yellow);
  console.log('');

  selectedMigrations.forEach((migration, idx) => {
    log(`  ${idx + 1}. ${migration.name}`, colors.reset);
  });

  console.log('\n');
  log('⚠️  Warning: These migrations will be executed on your Supabase instance.', colors.yellow);
  log('   Make sure you have backups if running on production!\n', colors.yellow);

  const answer = await questionSingleChar(
    colors.green + 'Run these migrations? (y/n): ' + colors.reset
  );

  return answer === 'y';
}

async function showPreview(selectedMigrations) {
  console.log('\n');
  const answer = await questionSingleChar(
    colors.cyan + 'Preview migrations before running? (y/n): ' + colors.reset
  );

  if (answer === 'y') {
    for (const migration of selectedMigrations) {
      await previewMigration(migration);
      console.log('');
    }
  }
}

async function main() {
  console.log('');
  log('╔═════════════════════════════════════════════════════════╗', colors.bright + colors.blue);
  log('║                                                         ║', colors.bright + colors.blue);
  log('║     Supabase Interactive Migration Runner v1.0         ║', colors.bright + colors.blue);
  log('║                                                         ║', colors.bright + colors.blue);
  log('╚═════════════════════════════════════════════════════════╝', colors.bright + colors.blue);

  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    log('\n⚠️  No migration files found in supabase/migrations/', colors.yellow);
    log('   Create .sql files in that directory to get started.\n', colors.yellow);
    rl.close();
    return;
  }

  log(`\nFound ${migrations.length} migration file(s)`, colors.green);

  const selectedMigrations = await selectMigrations(migrations);

  if (selectedMigrations.length === 0) {
    log('\n❌ No migrations selected. Exiting.\n', colors.yellow);
    rl.close();
    return;
  }

  await showPreview(selectedMigrations);

  const confirmed = await confirmRun(selectedMigrations);

  if (!confirmed) {
    log('\n❌ Migration cancelled by user.\n', colors.yellow);
    rl.close();
    return;
  }

  log('\n' + '═'.repeat(60), colors.bright + colors.cyan);
  log('  Starting Migration Execution', colors.bright + colors.cyan);
  log('═'.repeat(60) + '\n', colors.bright + colors.cyan);

  const pool = getDatabaseConnection();
  const results = [];

  try {
    // Test connection first
    log('🔌 Testing database connection...', colors.cyan);
    const testClient = await pool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
    log('✓ Connection successful\n', colors.green);

    for (const migration of selectedMigrations) {
      const result = await runMigration(pool, migration);
      results.push(result);

      // Add a small delay between migrations
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    if (error.code === '28P01') {
      log('\n❌ Connection failed: Password authentication error', colors.bright + colors.red);
      log('\n  🔑 This usually means:', colors.yellow);
      log('     • The password in DATABASE_URL is incorrect', colors.reset);
      log('     • You might be using the wrong connection string', colors.reset);
      log('\n  💡 Solutions:', colors.cyan);
      log('     1. Get the correct connection string from Supabase Dashboard:', colors.reset);
      log('        Project Settings → Database → Connection string', colors.reset);
      log('     2. Make sure you\'re using the "URI" (not "Connection pooling")', colors.reset);
      log("     3. If you don't know your password, reset it:", colors.reset);
      log('        Project Settings → Database → Reset database password', colors.reset);
      log('     4. Then update DATABASE_URL in your .env.local file', colors.reset);
      log('\n');
    } else {
      log(`\n❌ Connection error: ${error.message}`, colors.bright + colors.red);
      log(`   Code: ${error.code || 'N/A'}\n`, colors.red);
    }
  } finally {
    await pool.end();
  }

  // Summary
  log('\n' + '═'.repeat(60), colors.bright + colors.magenta);
  log('  Migration Execution Summary', colors.bright + colors.magenta);
  log('═'.repeat(60), colors.bright + colors.magenta);

  const successful = results.filter((r) => r.success && !r.skipped).length;
  const skipped = results.filter((r) => r.success && r.skipped).length;
  const failed = results.filter((r) => !r.success).length;

  console.log('');
  log(`  📊 Total Migrations: ${results.length}`, colors.bright);
  log(`  ✅ Successful: ${successful}`, colors.green);
  if (skipped > 0) {
    log(`  ⏭️  Skipped (already exists): ${skipped}`, colors.yellow);
  }
  log(`  ❌ Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);

  if (failed > 0) {
    log('\n  Failed migrations:', colors.bright + colors.red);
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        log(`    • ${r.migration}`, colors.red);
        log(`      ${r.error}`, colors.red);
      });
  }

  if (successful + skipped === results.length) {
    log('\n  🎉 All migrations completed successfully!\n', colors.bright + colors.green);
  } else {
    log('\n  ⚠️  Some migrations failed. Check the errors above.\n', colors.yellow);
  }

  rl.close();
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n❌ Migration cancelled by user (Ctrl+C)\n', colors.yellow);
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}\n`, colors.bright + colors.red);
  console.error(error);
  rl.close();
  process.exit(1);
});
