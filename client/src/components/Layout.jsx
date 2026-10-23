import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import MobileNavContext from '../contexts/MobileNavContext'
import NoticeProvider from './NoticeProvider'
import { authAPI } from '../services/api'
import './Layout.css'

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  // The ☰ button lives here in the navbar, but the drawer lives in the
  // dashboard page, so the open/closed state is shared through context.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // these hold the state of the "send a new link" button in the verify banner:
  const [resendState, setResendState] = useState('idle')
  const [resendMessage, setResendMessage] = useState('')

  // the banner only shows when the server says the email is not verified yet:
  const needsVerification = user && user.emailVerifiedAt === null

  // this asks the server to email a fresh verification link:
  const handleResendVerification = async () => {
    setResendState('sending')
    try {
      const response = await authAPI.resendVerification()
      setResendState('sent')
      setResendMessage(response.data.message)
    } catch (err) {
      setResendState('idle')
      setResendMessage(err.message || 'We could not send the email. Please try again.')
    }
  }

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
        {/* this banner asks new users to verify their email before sharing anything: */}
        {needsVerification && (
          <div className="verify-email-banner" role="status">
            <div className="verify-email-banner-content">
              <div className="verify-email-banner-text">
                <strong>Please verify your email address.</strong>
                <span>
                  We sent a link to {user.email}. Until you open it, you cannot share term dates, request access or acknowledge a student.
                </span>
                {resendMessage && <span className="verify-email-banner-note">{resendMessage}</span>}
              </div>
              <button
                type="button"
                className="verify-email-banner-button"
                onClick={handleResendVerification}
                disabled={resendState !== 'idle'}
              >
                {resendState === 'sending' ? 'Sending...' : resendState === 'sent' ? 'Email sent' : 'Send a new link'}
              </button>
            </div>
          </div>
        )}
        {/* the notice provider lets the dashboards show messages and confirm boxes instead of browser pop-ups: */}
        <main className="main-content">
          <NoticeProvider>
            {children}
          </NoticeProvider>
        </main>
      </div>
    </MobileNavContext.Provider>
  )
}

export default Layout
