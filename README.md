# Stock Market Mumbai Admin Portal (Render.com Ready)

Secure lead & inquiry management dashboard for **Stock Market Mumbai** (`https://stockmarketmumbai.in`), built with **Next.js 16**, **Tailwind CSS v4**, HMAC-SHA256 stateless cookie auth, and **MySQL (`mysql2`)**, optimized for **GitHub -> Render.com** deployment.

---

## Features
- **Live Lead Sync (`/api/leads/ingest`):** Receives real-time Popup Form and Contact Us Form leads from your Hostinger website (`https://stockmarketmumbai.in`) secured by `x-smm-ingest-secret`.
- **Render Health Check (`/api/health`):** Ready for Render zero-downtime health checks and uptime pings.
- **Lead Management:** Search, filter by source (`Popup Form` / `Contact Us`), status (`New`, `Contacted`, `Enrolled`, `Not Interested`, `Invalid`), single/range IST date filters, counselor notes, Call/WhatsApp buttons, delete, and Excel CSV export (`/api/export-csv`).
- **Flexible Storage:** Supports shared **MySQL** (`DB_HOST` — e.g., Hostinger Remote MySQL or TiDB Cloud), **Render Persistent Disk** (`DATA_DIR`), or local preview JSON fallback.

---

## Deploy on Render.com (Step-by-Step)

1. Push `d:\Stock Market Mumbai Admin` to a GitHub repository.
2. Go to **Render Dashboard → New → Web Service** (or **Blueprint** using `render.yaml`) and connect your GitHub repository.
3. Verify Render Settings:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start` *(runs `node server.js`, binding cleanly to `0.0.0.0:$PORT`)*
   - **Health Check Path:** `/api/health`
4. Set **Environment Variables** in Render:
   - `NODE_ENV` = `production`
   - `ADMIN_USERNAME` = `admin`
   - `ADMIN_PASSWORD` = `Mumbai@2026#Admin` *(change to your own strong password)*
   - `AUTH_SECRET` = strong random string
   - `ADMIN_INGEST_SECRET` = `SMM_Admin_Ingest_2026_Secret_Key` *(must match Hostinger website)*
   - `ALLOWED_ORIGIN` = `https://stockmarketmumbai.in`
   - **Database (Strongly Recommended on Render Free Tier):** Set `DB_HOST`, `DB_PORT` (`3306`), `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_SSL` (`false` for Hostinger Remote MySQL, `true` for TiDB Cloud).
   > *Why MySQL on Render Free Tier?* Render's free filesystem resets on sleep/redeploy. Connecting your Hostinger Remote MySQL (hPanel → Databases → Remote MySQL → allow `%` or Render IPs) or free TiDB Cloud keeps all leads permanently saved and shared between Hostinger and Render!
5. After Render deploys, copy your live Render URL (e.g. `https://stock-market-mumbai-admin.onrender.com`) and put it in your **Hostinger Website's** `ADMIN_PORTAL_URL` environment variable!
