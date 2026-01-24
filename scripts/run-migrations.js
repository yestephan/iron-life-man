#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
require('dotenv/config');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('Error: Missing Supabase credentials in environment variables', colors.red);
    log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY', colors.yellow);
    process.exit(1);
  }

  return createClient(supabaseUrl, supabaseKey);
}

function getMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    log('Error: supabase/migrations directory not found', colors.red);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  return files.map(file => ({
    name: file,
    path: path.join(migrationsDir, file),
  }));
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function selectMigrations(migrations) {
  console.log('\n');
  log('Available Migrations:', colors.bright + colors.cyan);
  log('─'.repeat(50), colors.cyan);

  migrations.forEach((migration, index) => {
    log(`  [${index + 1}] ${migration.name}`, colors.blue);
  });

  console.log('\n');
  log('Selection Options:', colors.yellow);
  log('  • Enter numbers separated by commas (e.g., 1,2,3)', colors.reset);
  log('  • Enter "all" to run all migrations', colors.reset);
  log('  • Press Enter to cancel', colors.reset);
  console.log('\n');

  const answer = await question('Select migrations to run: ');

  if (!answer.trim()) {
    return [];
  }

  if (answer.toLowerCase() === 'all') {
    return migrations;
  }

  const indices = answer.split(',')
    .map(s => parseInt(s.trim()) - 1)
    .filter(i => !isNaN(i) && i >= 0 && i < migrations.length);

  return indices.map(i => migrations[i]);
}

async function runMigration(supabase, migration) {
  log(`\n▸ Running: ${migration.name}`, colors.cyan);

  try {
    const sql = fs.readFileSync(migration.path, 'utf-8');

    // Split by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      if (!statement) continue;

      log(`  Executing statement ${i + 1}/${statements.length}...`, colors.reset);

      const { error } = await supabase.rpc('exec_sql', {
        sql_string: statement + ';'
      }).catch(async () => {
        // If rpc doesn't exist, try direct query
        return await supabase.from('_').select('*').limit(0).then(() => {
          // Fallback: execute raw SQL using PostgREST
          return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql_string: statement + ';' })
          }).then(r => r.json()).then(data => ({ data, error: data.error }));
        });
      });

      if (error) {
        throw error;
      }
    }

    log(`✓ Success: ${migration.name}`, colors.green);
    return { success: true, migration: migration.name };
  } catch (error) {
    log(`✗ Failed: ${migration.name}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
    return { success: false, migration: migration.name, error: error.message };
  }
}

async function confirmRun(selectedMigrations) {
  console.log('\n');
  log('Selected Migrations:', colors.bright + colors.yellow);
  log('─'.repeat(50), colors.yellow);

  selectedMigrations.forEach(migration => {
    log(`  • ${migration.name}`, colors.reset);
  });

  console.log('\n');
  const answer = await question('Run these migrations? (yes/no): ');

  return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
}

async function main() {
  log('\n╔═══════════════════════════════════════════╗', colors.bright + colors.blue);
  log('║   Supabase Interactive Migration Runner   ║', colors.bright + colors.blue);
  log('╚═══════════════════════════════════════════╝\n', colors.bright + colors.blue);

  const migrations = getMigrationFiles();

  if (migrations.length === 0) {
    log('No migration files found in supabase/migrations/', colors.yellow);
    rl.close();
    return;
  }

  const selectedMigrations = await selectMigrations(migrations);

  if (selectedMigrations.length === 0) {
    log('No migrations selected. Exiting.', colors.yellow);
    rl.close();
    return;
  }

  const confirmed = await confirmRun(selectedMigrations);

  if (!confirmed) {
    log('Migration cancelled.', colors.yellow);
    rl.close();
    return;
  }

  log('\n' + '═'.repeat(50), colors.cyan);
  log('Starting Migration Execution', colors.bright + colors.cyan);
  log('═'.repeat(50) + '\n', colors.cyan);

  const supabase = getSupabaseClient();
  const results = [];

  for (const migration of selectedMigrations) {
    const result = await runMigration(supabase, migration);
    results.push(result);
  }

  // Summary
  log('\n' + '═'.repeat(50), colors.cyan);
  log('Migration Summary', colors.bright + colors.cyan);
  log('═'.repeat(50), colors.cyan);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log(`\n  Total: ${results.length}`, colors.reset);
  log(`  ✓ Successful: ${successful}`, colors.green);
  log(`  ✗ Failed: ${failed}`, colors.red);

  if (failed > 0) {
    log('\nFailed migrations:', colors.red);
    results.filter(r => !r.success).forEach(r => {
      log(`  • ${r.migration}: ${r.error}`, colors.red);
    });
  }

  console.log('\n');
  rl.close();
}

main().catch(error => {
  log(`\nFatal error: ${error.message}`, colors.red);
  console.error(error);
  rl.close();
  process.exit(1);
});
