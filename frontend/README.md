# Attendly Frontend

This is the React client-side application for **Attendly**, a modern Student Attendance Management System. It is built using React, Vite, and styled with vanilla CSS.

## Features

- **Multi-role Dashboards**: Customized interfaces for Students, Faculty, and Administrators.
- **Attendance Tracking**: Real-time attendance submission, updating, and analytics.
- **Reporting & Exporting**: Generate comprehensive attendance reports and export them as Excel files or PDFs.
- **Clean Design**: Premium, responsive user interface featuring light and dark theme modes.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

In development mode, Vite is configured to proxy API requests `/api` to the backend server at `http://localhost:5000`.

## Production Build & Deployment

To build the static assets for production:
```bash
npm run build
```
The compiled files will be output to the `dist/` directory.

### Deployment on Vercel
1. Set the **Root Directory** to `frontend`.
2. Add the environment variable `VITE_API_URL` pointing to your deployed backend (e.g., `https://your-backend-api.com`).
3. Deploy!
