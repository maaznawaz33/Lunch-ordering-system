# Deployment Guide

Target setup: **frontend on Cloudflare Pages**, **backend + PostgreSQL on a VPS**,
with Cloudflare proxying the API subdomain too. This keeps everything decoupled
from the client's existing WordPress site while reusing their Cloudflare account
for DNS, WAF, and DDoS protection on both ends.

## 1. Provision a VPS

Any provider works (DigitalOcean, Linode, AWS Lightsail). For 300+ employees
placing one order/day, a 2 vCPU / 4GB RAM droplet is comfortably enough.

```bash
# On the fresh server:
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y nginx certbot git
```

## 2. Deploy the backend + database with Docker

```bash
sudo mkdir -p /opt/lunch-ordering-system
sudo chown $USER:$USER /opt/lunch-ordering-system
cd /opt/lunch-ordering-system
git clone <your-repo-url> .

cp .env.example .env                     # set POSTGRES_PASSWORD
cp backend/.env.example backend/.env     # set all backend secrets - see below

docker compose build backend
docker compose up -d db
docker compose run --rm backend npx prisma migrate deploy
docker compose run --rm backend npm run seed   # creates admin + this week's menu
docker compose up -d backend
```

**Backend `.env` values that must change for production:**
- `DATABASE_URL` → `postgresql://<user>:<password>@db:5432/<db>?schema=public` (use the `db` service name, not localhost, since it's on the Docker network)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → generate with `openssl rand -base64 48`
- `COOKIE_SECURE=true`
- `CORS_ORIGIN` → your real frontend URL, e.g. `https://lunch.yourcompany.com`
- `ALLOWED_EMAIL_DOMAIN` → the company's email domain
- `FRONTEND_URL` → same as CORS_ORIGIN, used to build verification links
- SMTP settings → real values so verification emails actually send

## 3. Put Nginx in front of the backend

Use `deploy/nginx-backend.conf` as a starting point:

```bash
sudo cp deploy/nginx-backend.conf /etc/nginx/sites-available/lunch-api.conf
sudo ln -s /etc/nginx/sites-available/lunch-api.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

For TLS, either:
- Use a **Cloudflare Origin CA certificate** (free, issued from your Cloudflare
  dashboard, valid for the connection between Cloudflare and your server) — this
  is the recommended option since Cloudflare is already in front, **or**
- Use `certbot --nginx` for a standard Let's Encrypt cert if you'd rather not
  depend on Cloudflare's origin cert.

## 4. Configure Cloudflare DNS

In the same Cloudflare account/zone that hosts the WordPress site:
- Add an **A record** for `api.yourcompany.com` → your VPS's public IP, proxied (orange cloud) so Cloudflare's WAF/DDoS protection applies
- Add a **CNAME** for `lunch.yourcompany.com` → your Cloudflare Pages project's `.pages.dev` domain (Cloudflare Pages walks you through this when you add a custom domain)
- Set SSL/TLS mode to **Full (strict)** in the Cloudflare dashboard, since the origin now has a real cert

## 5. Deploy the frontend to Cloudflare Pages

Easiest path: connect the GitHub repo directly in the Cloudflare dashboard
(Pages → Create a project → Connect to Git), pointing the build at the
`frontend/` directory:
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `VITE_API_URL=https://api.yourcompany.com/api`

Alternatively, use the included GitHub Actions workflow
(`.github/workflows/deploy.yml`), which builds and deploys both the frontend
(to Cloudflare Pages) and backend (to the VPS over SSH) on every push to `main`.

**Secrets to set in the GitHub repo (Settings → Secrets and variables → Actions):**
| Secret | Purpose |
|---|---|
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` | SSH access to the backend server |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Pages deploy |
| `VITE_API_URL` | e.g. `https://api.yourcompany.com/api` |

## 6. Post-deploy checklist

- [ ] Log in with the seeded admin account and change its password
- [ ] Confirm registration rejects non-company email addresses
- [ ] Confirm a verification email actually arrives (check SMTP settings)
- [ ] Confirm `COOKIE_SECURE=true` and cookies are only sent over HTTPS
- [ ] Set up automated PostgreSQL backups (e.g. a nightly `pg_dump` cron job, or your VPS provider's managed backup feature)
- [ ] Set up basic uptime monitoring for `api.yourcompany.com/health`
