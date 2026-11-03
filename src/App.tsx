import { lazy, Suspense } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Home from './screens/Home'
import Claim from './screens/claim/Claim'

// Students arrive on /claim over mobile data, so supervisor screens load only when someone opens them.
const Login = lazy(() => import('./screens/sup/Login'))
const SupHome = lazy(() => import('./screens/sup/SupHome'))
const Manage = lazy(() => import('./screens/sup/Manage'))
const QrScreen = lazy(() => import('./screens/sup/QrScreen'))
const Editor = lazy(() => import('./screens/sup/Editor'))

const Kit = import.meta.env.DEV ? lazy(() => import('./screens/dev/Kit')) : null

export default function App() {
  return (
    <HashRouter>
      <Suspense>
        <Routes>
          <Route path="/claim" element={<Claim />} />
          <Route path="/sup/login" element={<Login />} />
          <Route path="/sup" element={<SupHome />} />
          <Route path="/sup/new" element={<Editor />} />
          <Route path="/sup/edit/:id" element={<Editor />} />
          <Route path="/sup/a/:id" element={<Manage />} />
          <Route path="/sup/a/:id/qr" element={<QrScreen />} />
          {Kit && <Route path="/kit" element={<Kit />} />}
          <Route path="*" element={<Home />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
