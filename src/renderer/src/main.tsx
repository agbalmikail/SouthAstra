import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ibm-plex-sans/400.css'
import '@fontsource/ibm-plex-sans/500.css'
import '@fontsource/ibm-plex-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/noto-sans-symbols/400.css'
import './styles.css'
import App from './App'

// Platform: Mac'te pencere düğmeleri için yer bırak; kısayol yazıları ⌘ / Ctrl
const isMac = /Mac/i.test(navigator.platform || navigator.userAgent)
document.documentElement.dataset.platform = isMac ? 'mac' : 'win'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
