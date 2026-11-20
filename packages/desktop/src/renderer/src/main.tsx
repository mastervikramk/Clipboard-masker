import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { setupBrowserDriver } from './mock-driver'
import './styles/globals.css'

// Initialize in-browser driver if running directly in a web browser
setupBrowserDriver()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
