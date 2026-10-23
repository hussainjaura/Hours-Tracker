import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// this is for pages like /login and /register that only make sense when logged out:
// a student or employer who is already logged in goes straight to their dashboard:
export const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth()

  // this waits until we know if someone is logged in, so the form does not flash first:
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (isAuthenticated && user?.role === 'STUDENT') {
    return <Navigate to="/student" replace />
  }
  if (isAuthenticated && user?.role === 'EMPLOYER') {
    return <Navigate to="/employer" replace />
  }

  return children
}
