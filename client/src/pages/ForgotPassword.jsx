import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import './Auth.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const response = await authAPI.forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
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
          <h1>Forgot Password</h1>
          <p className="auth-subtitle">Enter your email address and we'll send you a link to reset your password</p>
        </div>

        {success ? (
          <div className="success-message" style={{ marginBottom: '1.5rem' }}>
            <p style={{ marginBottom: '1rem' }}>
              If an account with that email exists, a password reset link has been sent.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Please check your email and click the link to reset your password. The link will expire in 1 hour.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              <strong>Note:</strong> In development mode, check the server console for the reset link.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
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
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
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

export default ForgotPassword
