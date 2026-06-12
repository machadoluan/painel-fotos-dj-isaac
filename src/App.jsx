import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import UploadPage from './components/UploadPage'
import UploadRedirect from './components/UploadRedirect'
import Carousel from './components/Carousel'
import AdminPanel from './components/AdminPanel'
import EventManager from './components/EventManager'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/upload" element={<UploadRedirect />} />
        <Route path="/evento/:slug" element={<UploadPage />} />
        <Route path="/telao/:slug" element={<Carousel />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route
          path="/admin/evento/:id"
          element={
            <ProtectedRoute>
              <EventManager />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
