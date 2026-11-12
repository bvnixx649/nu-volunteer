import { lazy, Suspense, useEffect, useRef } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import Home from './screens/Home'
import Claim from './screens/claim/Claim'
import { RequireStudent, Tabs } from './screens/student/Shell'
import Welcome from './screens/student/Welcome'
import Mine from './screens/student/Mine'
import Me from './screens/student/Me'
import Inbox from './screens/student/Inbox'
import ActivityDetail from './screens/student/ActivityDetail'
import StudentRoster from './screens/roster/StudentRoster'
import { startPendingSync } from './lib/pending'
import { ErrorBoundary } from './ui/ErrorBoundary'

// Kept scans are retried from any screen, so this starts with the app and not with a particular route.
startPendingSync()

// Students arrive on /claim over mobile data, so supervisor screens load only when someone opens them.
const Login = lazy(() => import('./screens/sup/Login'))
const SupHome = lazy(() => import('./screens/sup/SupHome'))
const SupShell = lazy(() => import('./screens/sup/SupShell'))
const SupCalendar = lazy(() => import('./screens/sup/SupCalendar'))
const SupStats = lazy(() => import('./screens/sup/SupStats'))
const SupMe = lazy(() => import('./screens/sup/SupMe'))
const Manage = lazy(() => import('./screens/sup/Manage'))
const QrScreen = lazy(() => import('./screens/sup/QrScreen'))
const SupRoster = lazy(() => import('./screens/sup/SupRoster'))
const Editor = lazy(() => import('./screens/sup/Editor'))

// Camera, chat and settings are opened less often, so they stay out of the first download.
const Scan = lazy(() => import('./screens/student/Scan'))
const Chat = lazy(() => import('./screens/student/Chat'))
const DirectMessage = lazy(() => import('./screens/student/DirectMessage'))
const NotifySettings = lazy(() => import('./screens/student/NotifySettings'))

const Kit = import.meta.env.DEV ? lazy(() => import('./screens/dev/Kit')) : null

/** Opens each new page at the top. Back and forward keep the position the browser restores. */
function ScrollToTop() {
  const { pathname } = useLocation()
  const type = useRef(useNavigationType())
  type.current = useNavigationType()
  useEffect(() => {
    if (type.current !== 'POP') window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ScrollToTop />
        <Suspense>
          <Routes>
            <Route path="/claim" element={<Claim />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route element={<RequireStudent />}>
              <Route element={<Tabs />}>
                <Route path="/" element={<Home />} />
                <Route path="/mine" element={<Mine />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/me" element={<Me />} />
              </Route>
              <Route path="/a/:id" element={<ActivityDetail />} />
              <Route path="/a/:id/roster" element={<StudentRoster />} />
              <Route path="/a/:id/chat" element={<Chat />} />
              <Route path="/a/:id/dm" element={<DirectMessage />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/settings/notify" element={<NotifySettings />} />
            </Route>
            <Route path="/sup/login" element={<Login />} />
            <Route element={<SupShell />}>
              <Route path="/sup" element={<SupHome />} />
              <Route path="/sup/calendar" element={<SupCalendar />} />
              <Route path="/sup/stats" element={<SupStats />} />
              <Route path="/sup/me" element={<SupMe />} />
            </Route>
            {/* The old calendar and statistics page, kept so saved links still work. */}
            <Route path="/sup/overview" element={<Navigate to="/sup/calendar" replace />} />
            <Route path="/sup/new" element={<Editor />} />
            <Route path="/sup/edit/:id" element={<Editor />} />
            <Route path="/sup/a/:id" element={<Manage />} />
            <Route path="/sup/a/:id/qr" element={<QrScreen />} />
            <Route path="/sup/a/:id/roster" element={<SupRoster />} />
            {Kit && <Route path="/kit" element={<Kit />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </ErrorBoundary>
  )
}
