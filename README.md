# Mkulima Farm Management

Simple, fast, and secure farm management for three roles:

- `creator`: manages farms, packages, approvals, and system-wide access
- `admin`: manages one farm, payroll, workers, crops, livestock, education, and marketplace access
- `worker`: views duties, schedules, learning content, production records, and premium marketplace access

## Stack

- `frontend/`: React + Vite
- `backend/`: Node.js + Express
- Database: PostgreSQL
- Auth: JWT + RBAC
- Images: S3-compatible storage, with compressed uploads

## Project Structure

```text
backend/
  .env.example
  package.json
  src/
    app.js
    server.js
    config/
    db/
    lib/
    middleware/
    modules/
    services/
    utils/

frontend/
  .env.example
  package.json
  vite.config.js
  src/
```

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Install dependencies:

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

4. Apply the schema in [backend/src/db/schema.sql](/H:/House%20Aurelius/Mkulima/backend/src/db/schema.sql).
5. Start the backend:

```powershell
cd backend
npm run dev
```

6. Start the frontend:

```powershell
cd frontend
npm run dev
```

## Production Environment Variables

### Backend

Use these in your backend host:

```env
NODE_ENV=production
PORT=4000
APP_ORIGIN=https://your-frontend-domain.com
PUBLIC_ASSET_BASE_URL=https://your-backend-domain.com
PUBLIC_APP_URL=https://your-frontend-domain.com
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
S3_REGION=us-east-1
S3_BUCKET=mkulima-assets
S3_ENDPOINT=https://your-s3-endpoint.com
S3_ACCESS_KEY=replace-me
S3_SECRET_KEY=replace-me
S3_PUBLIC_BASE_URL=https://your-public-cdn-or-bucket-url.com
MAX_IMAGE_SIZE_MB=12
```

Notes:

- `APP_ORIGIN` supports comma-separated frontend domains.
- `PUBLIC_ASSET_BASE_URL` should be the live backend URL.
- `PUBLIC_APP_URL` should be the live frontend URL used by QR codes.
- In production, image uploads expect real S3-compatible storage values.
- Do not reuse the local development `.env`.

### Frontend

Use this in your frontend host:

```env
VITE_API_URL=https://your-backend-domain.com
```

## Deployment Notes

### Frontend

- Framework preset: `Vite` if available, otherwise `Other`
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

### Vercel

This repo includes [vercel.json](/H:/House%20Aurelius/Mkulima/vercel.json) so Vercel can build the frontend from the repo root without using `react-scripts`.

If you configure the project manually in Vercel:

- Production branch: `main`
- Build command: `cd frontend && npm run build`
- Install command: `cd frontend && npm install`
- Output directory: `frontend/dist`
- Environment variable: `VITE_API_URL=https://your-backend-domain.com`

### Backend

- Root directory: `backend`
- Start command: `npm start`
- Node version: current LTS is recommended

### Render

This repo now includes [render.yaml](/H:/House%20Aurelius/Mkulima/render.yaml) so Render can create:

- `mkulima-api` from `backend/`
- `mkulima-web` from `frontend/`

If you create services manually in Render, use:

- Backend root directory: `backend`
- Backend build command: `npm install`
- Backend start command: `npm start`
- Frontend root directory: `frontend`
- Frontend build command: `npm install && npm run build`
- Frontend publish directory: `dist`

## Core API Areas

- `/auth`
- `/farms`
- `/workers`
- `/logs`
- `/crops`
- `/livestock`
- `/education`
- `/packages`
- `/marketplace`
- `/dashboard`
