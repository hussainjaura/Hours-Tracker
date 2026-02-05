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
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#features" className="nav-link">Benefits</a>
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
            Work Hour Compliance Made Simple
            <span className="hero-title-accent"> for International Students & Employers</span>
          </h1>
          <p className="hero-description">
            Track, calculate, and record student work eligibility with confidence — built around student declarations and employer due diligence.
          </p>
          <p className="hero-supporting-text">
            This platform helps international students and employers manage weekly working limits by combining student-declared academic status, automated calculations, and clear audit trails. The system supports compliance — it does not replace legal responsibility.
          </p>
          <div className="hero-cta">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  Get Started as a Student
                </Link>
                <Link to="/register" className="btn btn-secondary btn-large">
                  Employer / Manager Access
                </Link>
              </>
            ) : (
              <Link to="/student" className="btn btn-primary btn-large">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="features-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            A clear process for students and employers to manage work hour compliance together
          </p>
          
          <div className="how-it-works-grid">
            <div className="how-it-works-card">
              <h3 className="how-it-works-title">For International Students</h3>
              <ol className="how-it-works-steps">
                <li>
                  <strong>Log in</strong> and create your profile
                </li>
                <li>
                  <strong>Declare your information:</strong>
                  <ul>
                    <li>Your university</li>
                    <li>Course start & end dates</li>
                    <li>Term and holiday dates</li>
                  </ul>
                </li>
                <li>
                  <strong>Optional:</strong> Upload your right-to-work share code
                </li>
                <li>
                  The system <strong>calculates automatically:</strong>
                  <ul>
                    <li>Term-time vs vacation rules</li>
                    <li>Maximum allowed weekly hours</li>
                  </ul>
                </li>
                <li>
                  <strong>Confirm your information regularly</strong> to maintain accurate records
                </li>
              </ol>
              <p className="how-it-works-note">
                <strong>Key point:</strong> You remain legally responsible for the accuracy of your declarations.
              </p>
            </div>

            <div className="how-it-works-card">
              <h3 className="how-it-works-title">For Employers / Managers</h3>
              <ol className="how-it-works-steps">
                <li>
                  <strong>Search</strong> by student email or generated ID
                </li>
                <li>
                  <strong>View student information:</strong>
                  <ul>
                    <li>Student-declared eligibility</li>
                    <li>Calculated weekly hour limits</li>
                    <li>Confirmation timestamps</li>
                    <li>Historical records</li>
                  </ul>
                </li>
                <li>
                  <strong>Log work hours</strong> for your students
                </li>
                <li>
                  Students <strong>confirm worked hours weekly</strong>
                </li>
              </ol>
              <p className="how-it-works-note">
                This gives you documented proof of due diligence in your compliance process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Confirmation Required Section */}
      <section className="confirmation-section">
        <div className="container">
          <div className="confirmation-content">
            <h2 className="section-title">Why Student Confirmation Is Required</h2>
            <p className="confirmation-main-text">
              The platform does not determine or guarantee legal work rights. Only the student can confirm their current academic status, whether term dates are accurate, and whether any changes have occurred.
            </p>
            <p className="confirmation-benefit-text">
              By confirming regularly, the student acknowledges responsibility, creates a dated record, and protects both themselves and the employer.
            </p>
            <div className="confirmation-statement">
              <p>
                "Eligibility is calculated based on student-declared information and confirmed by the student. Employers rely on these confirmations as part of their compliance process."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What It Is / Is Not Section */}
      <section className="what-it-is-section">
        <div className="container">
          <h2 className="section-title">What This Platform Is (And Is Not)</h2>
          <div className="what-it-is-grid">
            <div className="what-it-is-card what-it-is-card-positive">
              <h3 className="what-it-is-title">What It IS</h3>
              <ul className="what-it-is-list">
                <li>✓ A compliance support tool</li>
                <li>✓ A calculation and record-keeping system</li>
                <li>✓ An audit trail for employers</li>
                <li>✓ A transparency tool for students</li>
              </ul>
            </div>
            <div className="what-it-is-card what-it-is-card-negative">
              <h3 className="what-it-is-title">What It Is NOT</h3>
              <ul className="what-it-is-list">
                <li>✗ A legal authority</li>
                <li>✗ A visa decision-maker</li>
                <li>✗ A guarantee of compliance</li>
                <li>✗ A replacement for employer checks</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Key Benefits</h2>
          <div className="benefits-grid">
            <div className="benefits-column">
              <h3 className="benefits-column-title">For Students</h3>
              <ul className="benefits-list">
                <li>✓ Avoid accidental visa breaches</li>
                <li>✓ Understand weekly work limits clearly</li>
                <li>✓ Keep a personal work history</li>
                <li>✓ Share eligibility information with employers easily</li>
              </ul>
            </div>
            <div className="benefits-column">
              <h3 className="benefits-column-title">For Employers</h3>
              <ul className="benefits-list">
                <li>✓ Documented due diligence</li>
                <li>✓ Clear eligibility snapshots</li>
                <li>✓ Weekly confirmation records</li>
                <li>✓ Reduced compliance risk</li>
              </ul>
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
              Start managing work hour compliance with confidence. This platform helps you prove you did the right thing.
            </p>
            {!isAuthenticated ? (
              <div className="hero-cta">
                <Link to="/register" className="btn btn-primary btn-large">
                  Get Started as a Student
                </Link>
                <Link to="/register" className="btn btn-secondary btn-large">
                  Employer Access
                </Link>
              </div>
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
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#features">Benefits</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Information</h4>
              <ul className="footer-links">
                <li><a href="#how-it-works">For Students</a></li>
                <li><a href="#how-it-works">For Employers</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-disclaimer">
              <p className="disclaimer-text">
                <strong>Important Disclaimer:</strong> This platform supports compliance by recording student declarations and confirmations. It does not provide legal advice or determine immigration status. Responsibility remains with the student and employer.
              </p>
            </div>
            <p>&copy; 2024 Work Hours Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
