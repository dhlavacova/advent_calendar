import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Admin from './Admin.tsx'
import App from './App.tsx'

const isAdmin = window.location.pathname.replace(/\/$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdmin ? <Admin /> : <App />}</StrictMode>,
)
