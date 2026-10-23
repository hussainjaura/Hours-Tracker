import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'
import './NotFound.css'

// this is the page shown for any address the website does not know, like /does-not-exist:
// it uses the same card as the login page so it looks like part of the site:
const NotFound = () => {
  const { user } = useAuth()
  const location = useLocation()

  // a logged in user gets a button back to their own dashboard, everyone else goes home:
  const dashboardPath = user?.role === 'EMPLOYER' ? '/employer' : '/student'

  return (
    <div className="auth-container">
      <div className="auth-card not-found-card">
        {/* the same black ISC. logo as the header and the PDFs: */}
        <div className="not-found-logo">
          <div className="not-found-logo-icon">ISC.</div>
          <span className="not-found-logo-text">ISC Audit</span>
        </div>

        <div className="not-found-code">404</div>
        <h1 className="not-found-title">Page not found</h1>
        <p className="not-found-text">
          We could not find <span className="not-found-path">{location.pathname}</span>. The link may be old, or the address may have a typo.
        </p>

        {/* the main button depends on whether someone is logged in: */}
        <div className="not-found-actions">
          {user ? (
            <Link to={dashboardPath} className="btn btn-primary">Go to your dashboard</Link>
          ) : (
            <Link to="/login" className="btn btn-primary">Log in</Link>
          )}
          <Link to="/" className="btn btn-secondary">Go to the home page</Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
