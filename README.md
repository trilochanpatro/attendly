# Attendly

Attendly is a student attendance management system with a React frontend and an Express backend.

## Project structure

- `backend/` - Node.js Express API, SQLite database, authentication, and attendance routes.
- `frontend/` - React + Vite web app for students, faculty, and administrators.

## Setup

### Backend

```powershell
cd backend
npm install
```

Environment variables:

- `PORT` - optional server port (default `5000`)
- `JWT_SECRET` - secure JWT signing secret (recommended for production)
- `DB_PATH` - optional SQLite path relative to `backend/` (defaults to `database.db`)
- `NODE_ENV=production` - enables static frontend serving in production

Start backend:

```powershell
npm start
```

### Frontend

```powershell
cd frontend
npm install
npm run build
```

In development, the frontend uses a Vite proxy for `/api` requests to the backend.

## Production hosting

1. Build the frontend:

```powershell
cd frontend
npm run build
```

2. Ensure the backend has dependencies installed:

```powershell
cd backend
npm install
```

3. Set environment variables and start the backend:

```powershell
$env:JWT_SECRET='your-production-secret'
$env:NODE_ENV='production'
npm start
```

4. The backend will serve the compiled frontend from `frontend/dist` when running in production mode.

## Notes

- `frontend/vite.config.js` is configured with `base: './'` for relative asset paths in production.
- `backend/auth.js` now supports `JWT_SECRET` from the environment.
- `backend/db.js` can use `DB_PATH` if provided.
- Ignore rules are configured in `.gitignore` for generated files and dependencies.
