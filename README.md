# Iron Life Man - Ironman Training App

A dynamic Ironman training application that generates personalized 16-week training plans and syncs them to Google Calendar.

## 🏊🚴🏃 Features

### ✅ Implemented (MVP Core)

- **User Authentication**: Sign up and sign in with email/password
- **Onboarding Flow**: Multi-step onboarding to collect user preferences
  - Race date selection
  - Fitness level assessment (beginner/intermediate/advanced)
  - Training availability and preferred workout times
- **Plan Generation**: Intelligent training plan algorithm
  - Phases: Base, Build, Peak, Taper
  - Progressive volume ramping based on fitness level
  - 8 workouts per week (2 swim, 3 bike, 3 run)
  - Week-over-week progression
- **Dashboard**: Beautiful training dashboard
  - Volume tracking by discipline with progress bars
  - Weekly calendar view with all workouts
  - Upcoming workouts list
- **Workout Operations**:
  - Mark workouts as complete
  - Skip workouts
  - Reschedule to different date/time
- **Database**: Supabase PostgreSQL with Row Level Security

### 🚧 In Progress

- Google Calendar Integration (OAuth + sync)
- Rolling plan generation (cron job)
- Settings page

### 📅 Planned

- Automated weekly plan generation
- Profile management and settings
- Mobile responsive polish
- Production deployment to Vercel

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js v5
- **Calendar**: Google Calendar API (coming soon)
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account with project created
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

   ```bash
   git clone <your-repo>
   cd iron-life-man
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

4. Update `.env.local` with your Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
   ```

5. Run the database migration:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy and run the contents of `supabase/migrations/001_initial_schema.sql`
   - Or follow instructions in `supabase/README.md`

6. Start the development server:

   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## 📖 Usage

1. **Sign Up**: Create an account with email/password
2. **Onboarding**: Complete the 4-step onboarding process
   - Enter your race date (must be 12+ weeks away)
   - Select your fitness level
   - Set your training hours and preferred workout times
   - Generate your initial 3-week plan
3. **Dashboard**: View your training plan
   - See volume tracking for swim, bike, and run
   - View workouts on weekly calendar
   - Check upcoming workouts
4. **Manage Workouts**:
   - Click "Complete" to mark a workout done
   - Click "Reschedule" to change date/time
   - Click "Skip" to skip a workout

## 📂 Project Structure

```
iron-life-man/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Auth pages (signin, signup)
│   ├── api/                 # API routes
│   ├── dashboard/           # Dashboard page
│   └── onboarding/          # Onboarding flow
├── components/              # React components
│   ├── dashboard/           # Dashboard-specific components
│   ├── ui/                  # shadcn/ui components
│   └── workouts/            # Workout-related components
├── lib/                     # Utility libraries
│   ├── plan-generation/     # Training plan algorithm
│   └── supabase/            # Database queries
├── supabase/                # Database migrations
└── types/                   # TypeScript type definitions
```

## 🧮 Training Plan Algorithm

The plan generation algorithm uses:

- **Phase Distribution**: 40% base, 35% build, 20% peak, 5% taper
- **Discipline Ratios**: 18% swim, 52% bike, 30% run
- **Fitness Multipliers**: Beginner (0.6x), Intermediate (0.7x), Advanced (0.8x)
- **Progressive Overload**: Volume ramps up through base and build phases
- **Taper**: Volume reduces 60% in final weeks

## 🔒 Security

- Row Level Security (RLS) on all database tables
- Users can only access their own data
- Secure authentication with NextAuth.js
- Environment variables for sensitive credentials

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📝 License

MIT

## 🎯 Roadmap

See the full implementation plan in `.claude/plans/snoopy-booping-pebble.md`

---

Built with ❤️ for Ironman athletes
