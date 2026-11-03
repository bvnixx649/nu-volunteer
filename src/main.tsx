import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import '@fontsource-variable/anuphan'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* The user runs Reduce Motion on their iPad and still wants every animation. */}
    <MotionConfig reducedMotion="never">
      <App />
      <Toaster position="top-center" />
    </MotionConfig>
  </StrictMode>,
)
