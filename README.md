# Daily Staff Cafeteria Lunch Ordering System — MVP Scaffold

Built from the client's requirements doc. Two portals (Employee, Admin) on a shared
Node/Express + PostgreSQL backend, React frontend.

## Structure

```
lunch-ordering-system/
├── backend/               Express API (Prisma ORM, PostgreSQL)
│   ├── prisma/schema.prisma   Data model
│   ├── prisma/seed.js         Creates admin user + this week's menu
│   └── src/
│       ├── app.js             Security middleware + route wiring
│       ├── server.js          Entry point
│       ├── middleware/auth.js Auth + RBAC enforcement
│       ├── controllers/       Business logic
│       └── routes/            API routes
└── frontend/              React (Vite) app
    └── src/
        ├── pages/employee/     Employee portal
        ├── pages/admin/        Admin portal
        └── context/AuthContext.jsx   Session state
```

## Getting it running locally

**Backend:**
```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL and JWT secrets
npm install
npx prisma migrate dev --name init
npm run seed               # creates admin@example.com / ChangeMe123!
npm run dev                # runs on http://localhost:4000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev                 # runs on http://localhost:5173
```

Log in with the seeded admin account, then **change that password immediately** —
there's no "change password" endpoint yet, so for now update it directly via
`prisma studio` (`npm run prisma:studio`) with a freshly bcrypt-hashed value, or
we can add a proper change-password flow next.

## What's implemented

- Employee: self-register with a company email address (domain-restricted),
  verify via emailed link, login, view today's menu, place/update one order per
  day, view order history
- Admin: login, publish/schedule menus, view daily orders with employee names
  and totals, create vendors, assign a vendor to a day's orders, export daily
  CSV report
- Security: bcrypt password hashing, JWT access/refresh tokens in httpOnly
  cookies, RBAC enforced server-side on every route, login + registration rate
  limiting, account lockout after repeated failed logins, email-verification
  tokens stored as SHA-256 hashes (never the raw token), helmet security
  headers, CORS locked to a known origin, audit log table for admin actions,
  parameterized queries via Prisma (no raw SQL injection surface)
- Deployment: Dockerfile + docker-compose for backend/Postgres, Nginx reverse
  proxy config, GitHub Actions workflow for CI/CD — see `deploy/DEPLOYMENT.md`

## What's not built yet (next steps)

- Password reset flow (separate from email verification)
- Bulk CSV import of existing staff (for anyone who'd rather not self-register)
- Menu scheduling UI (currently API-only; the seed script sets this week's menu)
- Pagination on the admin order table (fine for a few hundred rows now, will
  want it as history grows)
- Automated tests

## Deployment

Full step-by-step guide: [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md).

Summary: **frontend on Cloudflare Pages**, **backend + PostgreSQL on a VPS**
(via Docker Compose, `docker-compose.yml` at the project root), with Cloudflare
proxying the API subdomain too for WAF/DDoS protection — reusing the same
Cloudflare account that already fronts the client's WordPress site. CI/CD is
wired up in `.github/workflows/deploy.yml`.
