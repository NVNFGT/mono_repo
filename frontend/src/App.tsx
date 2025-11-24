import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider, useSelector } from 'react-redux'
import { store } from './store'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ThemeProvider } from './hooks/useTheme'
import type { RootState } from './store'

function RootRedirect() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const token = useSelector((state: RootState) => state.auth.token)
  
  // If authenticated, redirect to dashboard, otherwise to login
  return <Navigate to={token && isAuthenticated ? "/dashboard" : "/login"} replace />
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/" element={<RootRedirect />} />
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App
