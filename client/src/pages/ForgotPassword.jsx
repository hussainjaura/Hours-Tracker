import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import './Auth.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      await authAPI.forgotPassword(email)
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
        {/* the heading changes once the reset link has been sent: */}
        <div className="auth-header">
          <h1>{success ? 'Check your email' : 'Forgot Password'}</h1>
          <p className="auth-subtitle">
            {success
              ? 'If an account exists for this email, we have sent a link to reset your password'
              : "Enter your email address and we'll send you a link to reset your password"}
          </p>
        </div>

        {success ? (
          <div className="reset-sent">
            {/* this shows the email they typed so they can spot a typo: */}
            <p className="reset-sent-email">{email}</p>
            <p className="reset-sent-hint">
              The link expires in 1 hour. If you can't see it, check your spam folder.
            </p>

            <Link to="/login" className="btn btn-primary auth-submit-btn reset-sent-btn">
              Back to Login
            </Link>

            {/* this takes them back to the form so they can fix the email or send again: */}
            <button type="button" className="reset-sent-retry" onClick={() => setSuccess(false)}>
              Didn't get it? Try again
            </button>
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

        {/* the sign in link is only needed on the form the sent screen has its own button: */}
        {!success && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>

            <p className="auth-footer">
              Remember your password? <Link to="/login">Sign in here</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
