import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import MobileNavContext from '../contexts/MobileNavContext'
import './Layout.css'

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  // The ☰ button lives here in the navbar, but the drawer lives in the
  // dashboard page, so the open/closed state is shared through context.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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
    <MobileNavContext.Provider value={{ mobileNavOpen, setMobileNavOpen }}>
      <div className="layout">
        <header className="dashboard-header">
          <div className="dashboard-header-content">
            <div className="dashboard-header-left">
              <button
                type="button"
                className="dashboard-menu-button"
                aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileNavOpen(prev => !prev)}
              >
                ☰
              </button>
              <div className="dashboard-logo">
                <div className="logo-icon">
                  <div className="logo-icon-inner">ISC.</div>
                </div>
                <span className="logo-text">ISC Audit</span>
              </div>
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
    </MobileNavContext.Provider>
  )
}

export default Layout
