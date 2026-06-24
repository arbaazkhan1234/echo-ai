import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing          from './pages/Landing'
import SignUp           from './pages/SignUp'
import SignIn           from './pages/SignIn'
import Dashboard        from './pages/Dashboard'
import PWAInstallBanner from './components/PWAInstallBanner'

export default function App() {
  return (
    <BrowserRouter>
      <PWAInstallBanner />
      <Routes>
        {/* Public landing page */}
        <Route path="/"         element={<Landing />} />

        {/* Auth */}
        <Route path="/signup"   element={<SignUp />} />
        <Route path="/signin"   element={<SignIn />} />

        {/* Legacy redirects — old URLs still work */}
        <Route path="/login"    element={<Navigate to="/signin" replace />} />

        {/* Protected — dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Catch-all */}
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
