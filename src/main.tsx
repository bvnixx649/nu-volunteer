import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import '@fontsource-variable/anuphan'
import '@fontsource-variable/geist'
import './styles.css'
import App from './App'
import { reloadForNewBuild } from './ui/ErrorBoundary'

// A tab left open across a deploy asks for page files that are gone. Vite reports it here; one reload gets the new build.
window.addEventListener('vite:preloadError', (e) => {
  if (reloadForNewBuild()) e.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The user runs Reduce Motion on their iPad and still wants every animation. */}
    <MotionConfig reducedMotion="never">
      <App />
      <Toaster position="top-center" theme="dark" />
    </MotionConfig>
  </StrictMode>,
)
