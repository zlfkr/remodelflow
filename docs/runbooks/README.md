# RemodelFlow

A production-ready remodeling project management platform built with Next.js, Supabase, and TypeScript.

## Overview

RemodelFlow is a web application that connects business owners with their customers to manage remodeling projects. The platform supports two user roles:

- **Owner**: Business owners who manage customers and projects
- **Customer**: Clients who can view their assigned projects, review designs, approve work, and request changes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Security**: Row Level Security (RLS)
- **Storage**: Supabase Storage
- **AI**: OpenAI API (for future features)
- **Deployment**: Vercel (Next.js) + Supabase Hosted

## Phase 1 Features (Current)

✅ **Authentication**
- Email/password signup and login
- Session management
- Protected routes with middleware
- Profile onboarding with role selection

✅ **Role Management**
- Profiles table with owner/customer roles
- Automatic profile creation on signup via database trigger
- Role-based access control

✅ **Owner Dashboard**
- Create and manage customers
- Create and manage projects (linked to customers)
- Generate invite links for customers

✅ **Customer Portal**
- View assigned projects
- Project detail pages with status timeline
- Basic project information display

✅ **Security**
- Row Level Security (RLS) enabled on all tables
- Policies ensuring users can only access their own data
- Owners can only access their customers/projects
- Customers can only access projects assigned to them

✅ **CI/CD**
- GitHub Actions workflow for linting and type checking
- Environment variable management

## Project Structure

```
remodelflow/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── customer/           # Customer portal pages
│   │   ├── owner/              # Owner dashboard pages
│   │   ├── login/              # Auth pages
│   │   ├── signup/
│   │   ├── onboarding/
│   │   └── invite/[token]/     # Invite acceptance page
│   ├── components/             # React components
│   ├── lib/
│   │   └── supabase/          # Supabase client configuration
│   └── middleware.ts          # Route protection middleware
├── supabase/
│   └── migrations/            # Database migrations
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 20+ and npm
- A Supabase account and project
- Git

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd remodelflow

# Install dependencies
npm install
```

### Step 2: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Run the migrations in order:
   - Copy and run `supabase/migrations/001_initial_schema.sql`
   - Copy and run `supabase/migrations/002_rls_policies.sql`

### Step 3: Configure Environment Variables

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy your project URL and anon key
3. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important**: Never commit `.env.local` to version control. The `.env.example` file is provided as a template.

### Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 5: Test the Application

1. **Sign up** as a new user
2. **Complete onboarding** - choose either "Customer" or "Owner" role
3. **If Owner**:
   - Create a customer
   - Create a project linked to that customer
   - Generate an invite link
4. **If Customer**:
   - View your assigned projects
   - Click on a project to see details

## Database Schema

### Tables

- **profiles**: User profiles with role information
- **customers**: Customer records managed by owners
- **projects**: Projects linked to customers
- **project_invites**: Invite tokens for customer access

### Security

All tables have Row Level Security (RLS) enabled with policies that ensure:
- Users can only view/update their own profile
- Owners can only manage their own customers and projects
- Customers can only view projects assigned to them

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

### Supabase

Your Supabase database is already hosted. Make sure your migrations are applied in production.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Run type checker
npm run typecheck
```

## Roadmap

### ✅ Phase 1 (Current) - Auth + Portals
- [x] Authentication system
- [x] Role-based access control
- [x] Owner dashboard
- [x] Customer portal
- [x] RLS policies
- [x] CI/CD setup

### 🔜 Phase 2 - Cabinets + Countertops Foundation
- [ ] Design entities (designs, design_items tables)
- [ ] 2D layout editor
- [ ] Parametric data storage
- [ ] Save/load designs

### 🔜 Phase 3 - Manufacturing Pack MVP
- [ ] CutList generation
- [ ] BOM generation
- [ ] DXF export per part
- [ ] Countertop template DXF
- [ ] Dimensioned PDF
- [ ] ZIP bundle creation
- [ ] Manufacturing jobs table

## Important Notes

- **Manufacturing outputs are deterministic** - AI will NOT decide measurements or geometry
- **AI usage is limited to**: inspiration images, summarizing requirements, proposal text
- All sensitive operations use server-side routes
- All database operations are validated with Zod schemas (to be added in Phase 2)

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure linting and type checking pass
4. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please open an issue in the GitHub repository.
