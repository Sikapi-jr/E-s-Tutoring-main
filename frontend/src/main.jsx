import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { scheduleAutoReload } from './utils/autoReload'

// Vite fires this specific event when a dynamically-imported chunk (e.g. a
// React.lazy() page) fails to load - almost always because the browser is
// holding an old index.html referencing a chunk hash a newer deploy no
// longer has on disk. Reloading re-fetches a fresh index.html with the
// current hashes and fixes it.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  scheduleAutoReload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
