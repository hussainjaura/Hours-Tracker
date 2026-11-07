import { Link } from 'react-router-dom'

function MenuButton({ isOpen, onClose, links, onToggle, isAuthenticated, dashboardPath }) {

    return (
    <>
      {/* three thin lines drawn with css instead of the menu character: */}
      <button type="button" className="mobile-landing-menu" onClick={onToggle} aria-label="Open menu">
        <span className="menu-lines" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    {/* if true the menu button will slide open: */}
      {isOpen && (
        <div className="landing-drawer-overlay" onClick={onClose}>
          <aside className="landing-drawer" onClick={e => e.stopPropagation()} aria-label="Site menu">
            <div className="landing-drawer-header">
                {/* same logo as the header so the menu feels part of the site: */}
                <div className="landing-drawer-brand">
                    <div className="logo-icon">
                      <div className="logo-icon-inner">ISC.</div>
                    </div>
                    <span className="landing-drawer-name">ISC Audit</span>
                </div>
                <button className="landing-drawer-close" onClick={onClose} aria-label="Close menu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
            </div>

            {/* small grey label above the links like a section heading: */}
            <p className="landing-drawer-label">On this page</p>
            <nav className="landing-drawer-nav">
              {links.map(link => (
                <a key={link.href} href={link.href} onClick={onClose}>{link.label}</a>
              ))}
            </nav>

            {/* account links, logged in people just get a link back to their dashboard: */}
            <p className="landing-drawer-label">Account</p>
            <nav className="landing-drawer-nav">
              {isAuthenticated ? (
                <Link to={dashboardPath} onClick={onClose}>Go to Dashboard</Link>
              ) : (
                <>
                  <Link to="/login" onClick={onClose}>Log in</Link>
                  <Link to="/register" onClick={onClose}>Get started</Link>
                </>
              )}
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}

export default MenuButton
