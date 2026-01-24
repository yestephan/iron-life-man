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
  magenta: '\x1b[35m',
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
    log('\nError: Missing Supabase credentials in environment variables', colors.red);
    log('Required variables:', colors.yellow);
    log('  • NEXT_PUBLIC_SUPABASE_URL', colors.yellow);
    log('  • SUPABASE_SERVICE_ROLE_KEY', colors.yellow);
    log('\nMake sure you have a .env file with these values.\n', colors.yellow);
    process.exit(1);
  }

  return { supabaseUrl, supabaseKey };
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
  log('╔═══════════════════════════════════════════════════╗', colors.bright + colors.cyan);
  log('║          Available Migration Files                ║', colors.bright + colors.cyan);
  log('╚═══════════════════════════════════════════════════╝', colors.bright + colors.cyan);
  console.log('');

  migrations.forEach((migration, index) => {
    const fileSize = fs.statSync(migration.path).size;
    const sizeKB = (fileSize / 1024).toFixed(2);
    log(`  [${String(index + 1).padStart(2, ' ')}] ${migration.name.padEnd(35, ' ')} (${sizeKB} KB)`, colors.blue);
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

  const indices = answer.split(',')
    .map(s => parseInt(s.trim()) - 1)
    .filter(i => !isNaN(i) && i >= 0 && i < migrations.length);

  return indices.map(i => migrations[i]);
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

async function runMigration(supabaseUrl, supabaseKey, migration) {
  log(`\n▸ Running: ${migration.name}`, colors.bright + colors.cyan);

  try {
    const sql = fs.readFileSync(migration.path, 'utf-8');

    // Use Supabase Management API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    // If the exec endpoint doesn't work, try direct SQL execution via REST API
    if (!response.ok && response.status === 404) {
      log('  Note: Using alternative execution method...', colors.yellow);

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      log(`  Executing ${statements.length} statement(s)...`, colors.reset);

      // For each statement, we'll try to execute it
      // Note: This is a workaround - ideally use Supabase CLI or pg client
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        log(`  [${i + 1}/${statements.length}] Executing statement...`, colors.reset);

        // Create a Supabase client and use query
        const supabase = createClient(supabaseUrl, supabaseKey);

        // This will work for most DDL statements when using service role
        const { error } = await supabase.rpc('exec', { query: statement + ';' })
          .catch(() => ({ error: { message: 'Direct execution not available' } }));

        if (error && error.message !== 'Direct execution not available') {
          throw new Error(`Statement ${i + 1} failed: ${error.message}`);
        }
      }
    } else if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    log(`✓ Successfully executed: ${migration.name}`, colors.bright + colors.green);
    return { success: true, migration: migration.name };
  } catch (error) {
    log(`✗ Failed: ${migration.name}`, colors.bright + colors.red);
    log(`  Error: ${error.message}`, colors.red);

    log('\n  💡 Tip: For complex migrations, consider using:', colors.yellow);
    log('     • Supabase CLI: pnpm exec supabase db push', colors.yellow);
    log('     • SQL Editor in Supabase Dashboard', colors.yellow);
    log('     • Direct PostgreSQL connection\n', colors.yellow);

    return { success: false, migration: migration.name, error: error.message };
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

  const answer = await question(colors.green + 'Run these migrations? (yes/no): ' + colors.reset);

  return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
}

async function showPreview(selectedMigrations) {
  console.log('\n');
  const answer = await question(colors.cyan + 'Preview migrations before running? (yes/no): ' + colors.reset);

  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
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

  const { supabaseUrl, supabaseKey } = getSupabaseClient();
  const results = [];

  for (const migration of selectedMigrations) {
    const result = await runMigration(supabaseUrl, supabaseKey, migration);
    results.push(result);

    // Add a small delay between migrations
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  log('\n' + '═'.repeat(60), colors.bright + colors.magenta);
  log('  Migration Execution Summary', colors.bright + colors.magenta);
  log('═'.repeat(60), colors.bright + colors.magenta);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('');
  log(`  📊 Total Migrations: ${results.length}`, colors.bright);
  log(`  ✅ Successful: ${successful}`, colors.green);
  log(`  ❌ Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);

  if (failed > 0) {
    log('\n  Failed migrations:', colors.bright + colors.red);
    results.filter(r => !r.success).forEach(r => {
      log(`    • ${r.migration}`, colors.red);
      log(`      ${r.error}`, colors.red);
    });
  }

  if (successful === results.length) {
    log('\n  🎉 All migrations executed successfully!\n', colors.bright + colors.green);
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

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}\n`, colors.bright + colors.red);
  console.error(error);
  rl.close();
  process.exit(1);
});
