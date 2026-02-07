import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import './Layout.css'

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleDisplay = (role) => {
    const roles = {
      STUDENT: 'Student',
      EMPLOYER: 'Employer',
      ADMIN: 'Admin',
    }
    return roles[role] || role
  }

  return (
    <div className="layout">
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-logo">
            <div className="logo-icon">
              <div className="logo-icon-inner"></div>
            </div>
            <span className="logo-text">RTW Compliance Audit</span>
          </div>
          <div className="dashboard-header-spacer"></div>
          <div className="dashboard-header-actions">
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
              <span className="user-role">{getRoleDisplay(user?.role)}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout
