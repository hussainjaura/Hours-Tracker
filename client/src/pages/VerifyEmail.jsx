import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'

// this is the page the verification email links to, like /verify-email?token=...:
const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { user, refreshUser } = useAuth()
  const [status, setStatus] = useState(token ? 'checking' : 'error')
  const [message, setMessage] = useState(token ? '' : 'This link is missing its verification code. Please open the link from your email again.')
  // a token only works once, so this stops React sending it twice in development:
  const alreadySent = useRef(false)

  useEffect(() => {
    if (!token || alreadySent.current) return
    alreadySent.current = true

    // this sends the token to the server and shows what happened:
    const verify = async () => {
      try {
        const response = await authAPI.verifyEmail(token)
        setStatus('success')
        setMessage(response.data.message)
        // if they are logged in, reload their account so the banner disappears:
        if (localStorage.getItem('token')) {
          refreshUser()
        }
      } catch (err) {
        setStatus('error')
        setMessage(err.message || 'We could not verify your email. Please try again.')
      }
    }
    verify()
  }, [token])

  // this sends a logged in user back to their own dashboard:
  const dashboardPath = user?.role === 'EMPLOYER' ? '/employer' : '/student'

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Verify Email</h1>
          <p className="auth-subtitle">Confirming that this email address belongs to you</p>
        </div>

        {status === 'checking' && (
          <div className="success-message">
            <p>Checking your link...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="success-message">
            <p style={{ marginBottom: '1rem' }}>{message}</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              You can now share your term dates with employers, or request access to students.
            </p>
            <Link
              to={user ? dashboardPath : '/login'}
              className="btn btn-primary"
              style={{ marginTop: '1rem', display: 'inline-block', textDecoration: 'none' }}
            >
              {user ? 'Go to your dashboard' : 'Log in'}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="error-message">{message}</div>
            <p className="form-hint">
              You can send yourself a new link from the banner at the top of your dashboard after logging in.
            </p>
            <Link
              to={user ? dashboardPath : '/login'}
              className="btn btn-primary auth-submit-btn"
              style={{ display: 'inline-block', textAlign: 'center', marginTop: '1rem', textDecoration: 'none' }}
            >
              {user ? 'Go to your dashboard' : 'Log in'}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default VerifyEmail
