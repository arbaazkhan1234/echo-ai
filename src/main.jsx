import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Restore session-only tokens (Remember Me = off) before Supabase initialises
Object.keys(sessionStorage)
  .filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  .forEach(k => localStorage.setItem(k, sessionStorage.getItem(k)))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
