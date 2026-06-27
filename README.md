# Attendly

Attendly is a student attendance management system with a React frontend and an Express backend.

## Project structure

- `backend/` - Node.js Express API, SQLite database, authentication, and attendance routes.
- `frontend/` - React + Vite web app for students, faculty, and administrators.


In development, the frontend uses a Vite proxy for `/api` requests to the backend.


## Notes

- `frontend/vite.config.js` is configured with `base: './'` for relative asset paths in production.
- `backend/auth.js` now supports `JWT_SECRET` from the environment.
- `backend/db.js` can use `DB_PATH` if provided.
- Ignore rules are configured in `.gitignore` for generated files and dependencies.
