import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept API calls and route them to the configured backend when deployed.
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://attendly.onrender.com' : '');
if (API_URL) {
  const originalFetch = window.fetch;
  window.fetch = (input, init) => {
    let url = input;
    if (typeof input === 'string' && input.startsWith('/api')) {
      url = `${API_URL}${input}`;
    } else if (input instanceof URL && input.pathname.startsWith('/api')) {
      url = new URL(input.pathname + input.search, API_URL);
    }
    return originalFetch(url, init);
  };
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
