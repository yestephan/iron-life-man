# Supabase Database Setup

## Running Migrations

You have two options to set up the database schema:

### Option 1: Using Supabase Dashboard (Recommended for quick setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of `migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI (Recommended for version control)

1. Install Supabase CLI if you haven't:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Push the migration:
   ```bash
   supabase db push
   ```

## Database Schema

The migration creates:

### Tables
- **profiles**: User training profiles with race date, fitness level, and preferences
- **workouts**: Individual workout sessions with scheduling and status tracking

### Features
- Row Level Security (RLS) enabled on all tables
- Automatic `updated_at` timestamp updates
- Indexes for optimized queries
- Check constraints for data validation

## Environment Variables

Make sure you have these set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Get these values from your Supabase project settings:
- Go to **Project Settings** → **API**
- Copy the Project URL and anon/public key
- Copy the service_role key (keep this secret!)
