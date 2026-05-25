
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { NotificacionesProvider } from './components/NotificacionesContext.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NotificacionesProvider>
        <App />
      </NotificacionesProvider>
    </BrowserRouter>
  </StrictMode>
)