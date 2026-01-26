# Supabase Migration Runner

Interactive Node.js script for running Supabase migrations from the `/supabase/migrations` folder.

## Features

- 📋 **Interactive Selection**: Lists all available migration files with file sizes
- ✅ **Multiple Selection**: Select one or more migrations to run, or run all at once
- 👀 **Preview**: Option to preview migration SQL before executing
- 🎨 **Colorful Output**: Clear, colorful terminal output for better readability
- ⚠️ **Safety Confirmations**: Asks for confirmation before executing migrations
- 📊 **Summary Report**: Shows success/failure statistics after execution

## Usage

### Install Dependencies

First, install the required dependencies:

```bash
pnpm install
```

### Run the Script

```bash
pnpm migrate
```

Or directly:

```bash
node scripts/run-migrations.js
```

### Environment Variables

Make sure you have a `.env` file in the root directory with one of the following connection options:

**Option 1 (Recommended)**: Direct connection string:
```env
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

**Option 2**: Separate connection details:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_HOST=your-project.supabase.co
SUPABASE_DB_PASSWORD=your-database-password
```

**How to get your database password:**
1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Database**
3. Find the **Connection string** section
4. Copy the connection string or extract the password from it
5. The password is the part after `postgres:` and before `@` in the connection string

## How It Works

1. **Lists Migrations**: Scans the `supabase/migrations/` directory for `.sql` files
2. **Interactive Selection**: Prompts you to select which migrations to run
   - Enter numbers separated by commas (e.g., `1,2,3`)
   - Type `all` to run all migrations
   - Press Enter to cancel
3. **Preview Option**: Optionally preview the SQL before execution
4. **Confirmation**: Asks for final confirmation before running
5. **Execution**: Runs each selected migration sequentially
6. **Summary**: Shows a detailed summary of results

## Example Session

```
╔═════════════════════════════════════════════════════════╗
║                                                         ║
║     Supabase Interactive Migration Runner v1.0         ║
║                                                         ║
╚═════════════════════════════════════════════════════════╝

Found 1 migration file(s)

╔═══════════════════════════════════════════════════╗
║          Available Migration Files                ║
╚═══════════════════════════════════════════════════╝

  [ 1] 001_initial_schema.sql              (3.82 KB)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Selection Options:
  • Enter numbers separated by commas (e.g., 1,2,3)
  • Enter "all" to run all migrations
  • Press Enter to cancel
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Select migrations to run: 1

Preview migrations before running? (yes/no): no

╔═══════════════════════════════════════════════════╗
║          Selected Migrations for Execution        ║
╚═══════════════════════════════════════════════════╝

  1. 001_initial_schema.sql

⚠️  Warning: These migrations will be executed on your Supabase instance.
   Make sure you have backups if running on production!

Run these migrations? (yes/no): yes
```

## Important Notes

- **Service Role Key Required**: The script needs the service role key (not anon key) to execute DDL statements
- **Sequential Execution**: Migrations run one at a time in the order selected
- **No Rollback**: There's no automatic rollback. Test migrations on a development instance first
- **Backup First**: Always backup your database before running migrations on production

## Troubleshooting

### "Direct execution not available" Error

If you see this error, the script is attempting to use an alternative execution method. For more complex migrations, consider:

1. **Supabase CLI**: Use `pnpm exec supabase db push` if you have the Supabase CLI set up
2. **SQL Editor**: Run migrations manually in the Supabase Dashboard SQL Editor
3. **Direct Connection**: Use a PostgreSQL client with your database connection string

### Permission Errors

Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` and not the anon key. The service role key has admin privileges needed for schema modifications.

## Alternative: Using Supabase CLI

For production use, consider using the official Supabase CLI:

```bash
# Initialize Supabase project
pnpm exec supabase init

# Link to your project
pnpm exec supabase link --project-ref your-project-ref

# Push migrations
pnpm exec supabase db push
```

## License

MIT
