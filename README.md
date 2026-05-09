# ArtPortrait Studio

AI-powered portrait art generation platform.

## Stack

- **Framework**: Next.js 14 App Router + TypeScript
- **Auth**: Clerk
- **Database**: PostgreSQL + Drizzle ORM
- **Payments**: Stripe
- **Background jobs**: Inngest
- **Email**: Resend
- **Storage**: Cloudflare R2 (S3-compatible)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 3. Set up the database

```bash
npm run db:push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run Inngest Dev Server (for background jobs)

```bash
npx inngest-cli@latest dev
```

## Project Structure

```
artportrait-studio/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Sign-in / Sign-up pages (Clerk)
│   ├── (dashboard)/        # Protected user area
│   ├── (marketing)/        # Public landing pages
│   └── api/                # API routes (webhooks, inngest, upload)
├── lib/                    # Server-side singletons
│   ├── db/                 # Drizzle client
│   ├── stripe/             # Stripe client
│   ├── r2/                 # S3/R2 client
│   └── resend/             # Resend email client
├── inngest/                # Background job functions
├── drizzle/                # Schema + migrations
├── components/             # React components
├── content/                # Static / MDX content
└── public/                 # Static assets
```

## Database commands

| Command | Description |
|---|---|
| `npm run db:generate` | Generate migration files |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run db:studio` | Open Drizzle Studio UI |
