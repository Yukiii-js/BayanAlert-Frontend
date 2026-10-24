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

### 2. Configure Environment (Optional)
If running the backend on a different port than `http://localhost:8000`:
Create `.env` based on `.env.example`:
```env
VITE_API_URL=http://localhost:8000/api
```
*(By default in development, Vite proxies `/api` requests to `http://localhost:8000`)*

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
- **Admin Dashboard**: Live operational overview, record statistics, register groups, and recent hazard reports.
- **Dynamic Register Management**: Dynamic CRUD and table viewer for all BayanAlert tables (Hazard Reports, Users, Barangays, Stations, Evidence, Verifications, etc.).
- **Hazard Categories**: Dedicated management interface for emergency categories.
