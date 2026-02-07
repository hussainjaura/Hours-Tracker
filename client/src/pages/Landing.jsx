import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
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
            <span className="logo-text">Right to Work Compliance</span>
          </div>
          <nav className="landing-nav">
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#faq" className="nav-link">FAQs</a>
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
            Right-to-Work Compliance Evidence
            <span className="hero-title-accent"> for Student Employees & Employers</span>
          </h1>
          <p className="hero-description">
            Right-to-work compliance evidence for student employees. Built around student declarations and employer due diligence to create audit-ready compliance records.
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

      {/* Main Value Proposition Section */}
      <section className="value-proposition-section">
        <div className="container">
          <div className="value-proposition-content">
            <h2 className="value-proposition-title">
              Empower your team to maintain compliance with confidence
            </h2>
            <p className="value-proposition-description">
              Right to Work Compliance is a comprehensive platform that allows you to digitize all elements of your student employee compliance process. As a compliance management system, our platform lets students declare their academic status, employers verify eligibility, and both parties maintain complete audit trails – all from one easy-to-use application.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <section className="feature-showcase-section">
        <div className="container">
          <div className="feature-showcase-grid">
            <div className="feature-showcase-item">
              <div className="feature-showcase-icon">📋</div>
              <h3 className="feature-showcase-title">Term Declarations</h3>
              <p className="feature-showcase-description">
                Students can declare their academic term dates in minutes. Our intuitive interface makes it easy to add and confirm term periods, ensuring accurate compliance calculations.
              </p>
            </div>

            <div className="feature-showcase-item">
              <div className="feature-showcase-icon">✅</div>
              <h3 className="feature-showcase-title">Employer Acknowledgements</h3>
              <p className="feature-showcase-description">
                Employers can acknowledge student declarations and view compliance rules. Set clear work hour limits and create an audit trail of due diligence with a single click.
              </p>
            </div>

            <div className="feature-showcase-item">
              <div className="feature-showcase-icon">📊</div>
              <h3 className="feature-showcase-title">Audit Trails</h3>
              <p className="feature-showcase-description">
                Instantly generate comprehensive audit reports that show all declarations, confirmations, and acknowledgements. Export complete compliance evidence in PDF or JSON format.
              </p>
            </div>

            <div className="feature-showcase-item">
              <div className="feature-showcase-icon">🔔</div>
              <h3 className="feature-showcase-title">Compliance Alerts</h3>
              <p className="feature-showcase-description">
                Stay informed about important compliance updates. Receive notifications when term dates change, acknowledgements are required, or compliance rules are updated.
              </p>
            </div>

            <div className="feature-showcase-item">
              <div className="feature-showcase-icon">🔍</div>
              <h3 className="feature-showcase-title">Eligibility Checks</h3>
              <p className="feature-showcase-description">
                Employers can quickly check student eligibility and view calculated work hour limits. See term-time vs holiday rules instantly with clear, actionable information.
              </p>
            </div>

            <div className="feature-showcase-item">
              <div className="feature-showcase-icon">📈</div>
              <h3 className="feature-showcase-title">Compliance Dashboard</h3>
              <p className="feature-showcase-description">
                Get real-time visibility into your compliance status. View active relationships, pending confirmations, and compliance summaries all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="features-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            A clear process for students and employers to manage right-to-work compliance together
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
                    <li>Term-time vs Holiday rules</li>
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
                  <strong>View student-declared compliance information</strong> including term dates and work hour rules
                </li>
                <li>
                  <strong>Acknowledge student declarations</strong> to create an audit trail of due diligence
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
                <li>✓ Create compliance evidence records</li>
                <li>✓ Share compliance information with employers easily</li>
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

      {/* Additional Capabilities Section */}
      <section className="capabilities-section">
        <div className="container">
          <h2 className="section-title">Do even more with Right to Work Compliance</h2>
          <p className="section-subtitle">
            Connect with your workflow and customize your setup to match your unique compliance needs. Our platform helps teams discover efficient ways of working, saving time and reducing risk without compromising compliance.
          </p>
          
          <div className="capabilities-grid">
            <div className="capability-card">
              <div className="capability-icon">👥</div>
              <h3 className="capability-title">Relationship Management</h3>
              <p className="capability-description">
                Set up student-employer relationships and manage access permissions. Quickly share compliance data and collaborate with ease.
              </p>
            </div>

            <div className="capability-card">
              <div className="capability-icon">🔗</div>
              <h3 className="capability-title">Export & Integration</h3>
              <p className="capability-description">
                Export complete audit packs in PDF or JSON format. Integrate compliance data with your existing HR and payroll systems.
              </p>
            </div>

            <div className="capability-card">
              <div className="capability-icon">📱</div>
              <h3 className="capability-title">Mobile-First Design</h3>
              <p className="capability-description">
                Access your compliance dashboard from anywhere. Our responsive design works seamlessly on desktop, tablet, and mobile devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          
          <div className="faq-grid">
            <div className="faq-item">
              <h3 className="faq-question">What can I get out of using Right to Work Compliance?</h3>
              <p className="faq-answer">
                Our platform provides comprehensive compliance evidence for student employees and employers. Students can declare their academic terms and create audit trails, while employers can verify eligibility and document due diligence. Both parties benefit from clear compliance rules and complete audit records.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Can I import my existing student information?</h3>
              <p className="faq-answer">
                Yes! Students can easily add their university information, course details, and term dates through our intuitive interface. The system automatically calculates compliance rules based on your declared information.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Can I create professional audit reports?</h3>
              <p className="faq-answer">
                Absolutely! Our platform generates comprehensive audit packs that include all declarations, confirmations, acknowledgements, and compliance rules. Export complete evidence in PDF or JSON format for your records.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">How does the system calculate work hour limits?</h3>
              <p className="faq-answer">
                The system automatically calculates work hour limits based on student-declared term dates. During term time, the limit is 20 hours per week. Outside term time (holidays), students can work full-time. The system clearly displays which rules apply and when.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Is this platform a legal authority?</h3>
              <p className="faq-answer">
                No. This platform is a compliance support tool that records student declarations and creates audit trails. It does not provide legal advice or determine immigration status. Responsibility remains with the student and employer to ensure compliance with UK visa regulations.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">Do I have to pay to use Right to Work Compliance?</h3>
              <p className="faq-answer">
                Currently, our platform is free to use. Students and employers can create accounts, manage relationships, and export audit trails at no cost. This helps ensure compliance is accessible to everyone who needs it.
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
              Start managing right-to-work compliance with confidence. This platform helps you create audit-ready compliance evidence.
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
              <h4 className="footer-title">Right to Work Compliance</h4>
              <p className="footer-text">
                Compliance assurance and audit evidence for student employees. Built for students and employers to manage right-to-work compliance together.
              </p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#features">Features</a></li>
                <li><Link to="/register">Get Started</Link></li>
                <li><Link to="/login">Login</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Support</h4>
              <ul className="footer-links">
                <li><a href="#faq">FAQs</a></li>
                <li><a href="#how-it-works">For Students</a></li>
                <li><a href="#how-it-works">For Employers</a></li>
                <li><a href="#features">Benefits</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Resources</h4>
              <ul className="footer-links">
                <li><a href="#how-it-works">Documentation</a></li>
                <li><a href="#features">Compliance Guide</a></li>
                <li><a href="#faq">Help Center</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Company</h4>
              <ul className="footer-links">
                <li><a href="#about">About</a></li>
                <li><a href="#legal">Legal</a></li>
                <li><a href="#privacy">Privacy</a></li>
                <li><a href="#terms">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-disclaimer">
              <p className="disclaimer-text">
                <strong>Important Disclaimer:</strong> This platform supports compliance by recording student declarations and confirmations. It does not provide legal advice or determine immigration status. Responsibility remains with the student and employer.
              </p>
            </div>
            <div className="footer-copyright">
              <p>&copy; 2024 Right to Work Compliance. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
