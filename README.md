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

### 2. Start the Backend
Start Apache and MySQL in Laragon. With the backend checked out at
`C:\laragon\www\BayanAlert-Backend`, Vite proxies `/api` requests to
`http://localhost/BayanAlert-Backend/public/api`.

Import the BayanAlert database schema and configure the backend `.env` if your
MySQL settings differ from the local defaults.

### 3. Configure Environment (Optional)
The default `VITE_API_URL=/api` uses the Vite proxy above. If the backend is
served from a different URL, create `.env` based on `.env.example` and set:
```env
VITE_API_URL=http://localhost:8000/api
```

### 4. Start Development Server
```bash
npm run dev
```
The app will be running at `http://localhost:5173`.

### 5. Build for Production
```bash
npm run build
```
Build output will be generated in `dist/`.

## Key Features
- **Authentication**: JWT token storage, automatic authorization header injection, protected routes.
- **Admin Dashboard**: Auto-refreshing operational overview, report status monitoring, register availability checks, categorized register filters, and recent hazard reports.
- **Dynamic Register Management**: Dynamic CRUD and table viewer for all BayanAlert tables (Hazard Reports, Users, Barangays, Stations, Evidence, Verifications, etc.).
- **Hazard Categories**: Dedicated management interface for emergency categories.
- **Resident Reports**: Loads the signed-in resident's saved reports and active categories/stations from LavaLust, supports report creation/updates and evidence uploads, and uses the shared API client configured by `VITE_API_URL`.

The admin dashboard refreshes monitoring data every minute and supports manual refresh. Register categories are configured by group in the backend admin table registry; unavailable database tables are called out without preventing the rest of the dashboard from loading.
