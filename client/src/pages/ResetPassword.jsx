import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'
import './Auth.css'

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      await authAPI.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Invalid Reset Link</h1>
            <p className="auth-subtitle">This password reset link is invalid or has expired.</p>
          </div>
          <Link to="/forgot-password" className="btn btn-primary">
            Request New Reset Link
          </Link>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <p className="auth-footer">
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/login" className="auth-back-button" aria-label="Go back to login">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div className="auth-header">
          <h1>Reset Password</h1>
          <p className="auth-subtitle">Enter your new password below</p>
        </div>

        {success ? (
          <div className="success-message">
            <p>Password has been reset successfully!</p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              Redirecting to login page...
            </p>
          </div>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                />
                <small className="form-hint">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </>
        )}

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-footer">
          Remember your password? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
