# BayanAlert - Frontend (React + Tailwind CSS)

Modern single-page application (SPA) frontend for **BayanAlert**, connecting to the LavaLust PHP REST API backend.

## Tech Stack
- **Framework:** React 18
- **Bundler:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Routing:** React Router v6

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
For local development, the default Vite proxy forwards `/api` requests to
`http://127.0.0.1:3000`. If the backend is elsewhere, create `.env` from
`.env.example` and set:

```env
VITE_API_URL=http://127.0.0.1:3000/api
```

For production, set `VITE_API_URL` in the frontend host's build environment to
the public backend API base URL, such as `https://your-backend.example/api`.
The URL must point to the PHP backend, not the frontend's static/SPA host. The
value is embedded at build time, so rebuild and redeploy after changing it. The
deployed endpoint `GET {VITE_API_URL}/external/resident-feed` must return JSON.
USGS Earthquake and GDACS feeds are public and do not require API keys.

Do not set a production frontend base URL unless the PHP backend is deployed and
its route rewrites send `/api/*` requests through `public/index.php`.

### 3. Start Development Server
```bash
npm run dev
```
The app will be running at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```
Build output will be generated in `dist/`.

## Key Features
- **Authentication**: JWT token storage, automatic authorization header injection, protected routes.
- **Admin Dashboard**: Auto-refreshing operational overview, report status monitoring, register availability checks, categorized register filters, and recent hazard reports.
- **Dynamic Register Management**: Dynamic CRUD and table viewer for all BayanAlert tables (Hazard Reports, Users, Barangays, Stations, Evidence, Verifications, etc.).
- **Hazard Categories**: Dedicated management interface for emergency categories.
- **PDF Reports**: Admins can choose a date range and preview either a hazard report or a barangay activity report with resident totals, status summaries, and report history.
- **BayanAlert Branding**: The supplied transparent logo is used across public, resident, and admin pages, as well as the browser tab icon.
- **Resident Reports**: Loads the signed-in resident's saved reports and active categories/stations from LavaLust, supports report creation/updates and evidence uploads, and uses the shared API client configured by `VITE_API_URL`.

The admin dashboard refreshes monitoring data every minute and supports manual refresh. Register categories are configured by group in the backend admin table registry; unavailable database tables are called out without preventing the rest of the dashboard from loading.
