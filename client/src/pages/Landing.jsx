import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Landing.css'

const Landing = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="landing-page">
      {/* Header Navigation */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <span className="logo-icon">WH</span>
            <span className="logo-text">Work Hours Tracker</span>
          </div>
          <nav className="landing-nav">
            <a href="#features" className="nav-link">Features</a>
            <a href="#about" className="nav-link">About</a>
            {!isAuthenticated && (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="btn btn-primary nav-btn">
                  Get Started
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link to="/student" className="btn btn-primary nav-btn">
                Go to Dashboard
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Track Your Work Hours
            <span className="hero-title-accent"> Effortlessly</span>
          </h1>
          <p className="hero-description">
            Manage your work hours, stay compliant with visa regulations, and keep track of your weekly limits all in one place. 
            Built for students and employers to work together seamlessly.
          </p>
          <div className="hero-cta">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Sign In
                </Link>
              </>
            ) : (
              <Link to="/student" className="btn btn-primary btn-large">
                Go to Dashboard
              </Link>
            )}
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Compliance</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">Easy</div>
              <div className="stat-label">To Use</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Us</h2>
          <p className="section-subtitle">
            Everything you need to manage work hours and stay compliant
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Real-Time Tracking</h3>
              <p className="feature-description">
                Track your work hours in real-time with automatic calculations and weekly summaries.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3 className="feature-title">Compliance Monitoring</h3>
              <p className="feature-description">
                Stay compliant with visa regulations. Get alerts when approaching limits and violations.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3 className="feature-title">Easy Collaboration</h3>
              <p className="feature-description">
                Employers can log hours, students can confirm. Simple workflow for everyone.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3 className="feature-title">Modern Interface</h3>
              <p className="feature-description">
                Clean, intuitive design that makes managing work hours a breeze.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Secure & Private</h3>
              <p className="feature-description">
                Your data is secure with industry-standard encryption and privacy protection.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-title">Detailed Reports</h3>
              <p className="feature-description">
                View comprehensive reports, work history, and compliance summaries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Get Started?</h2>
            <p className="cta-description">
              Join students and employers who are already using Work Hours Tracker to stay compliant and organized.
            </p>
            {!isAuthenticated ? (
              <Link to="/register" className="btn btn-primary btn-large">
                Create Free Account
              </Link>
            ) : (
              <Link to="/student" className="btn btn-primary btn-large">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4 className="footer-title">Work Hours Tracker</h4>
              <p className="footer-text">
                The easiest way to track work hours and stay compliant.
              </p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Quick Links</h4>
              <ul className="footer-links">
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
                <li><a href="#features">Features</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Support</h4>
              <ul className="footer-links">
                <li><a href="#about">About Us</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Work Hours Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
