import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Check the fields ourselves the form has noValidate so the message matches our design:
    const emailMissing = !email.trim();
    const passwordMissing = !password;
    if (emailMissing && passwordMissing) {
      setError('Please enter your email and password.');
      return;
    }
    if (emailMissing) {
      setError('Please enter your email.');
      return;
    }
    if (passwordMissing) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      // redirect based on user role:
      const savedUser = localStorage.getItem('user')
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        try {
          const user = JSON.parse(savedUser)
          if (user?.role === 'STUDENT') {
            navigate('/student')
          } else if (user?.role === 'EMPLOYER') {
            navigate('/employer')
          } else if (user?.role === 'ADMIN') {
            navigate('/admin')
          } else {
            navigate('/')
          }
        } catch (err) {
          console.error('Error parsing user:', err)
          navigate('/')
        }
      } else {
        navigate('/')
      }
    } else {
      setError(result.error || 'Login failed')
    }
    
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/" className="auth-back-button" aria-label="Go back to home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue to your account</p>
        </div>

        {/* red alert box with a small warning icon that makes screen readers read it out: */}
        {error && (
          <div className="error-message" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* noValidate turns off the browser's own fill out this field bubble our handleSubmit checks instead: */}
        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Logging in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create one here</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
