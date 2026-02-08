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
            <div className="logo-icon">
              <div className="logo-icon-inner">ISC.</div>
            </div>
            <span className="logo-text">ISC Audit</span>
          </div>
          <nav className="landing-nav-center">
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#statistics" className="nav-link">Statistics</a>
            <a href="#compliance-risks" className="nav-link">Compliance Risks</a>
            <a href="#solutions" className="nav-link">Solutions</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#faq" className="nav-link">FAQs</a>
          </nav>
          <div className="landing-nav-right">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="nav-link-login">Log in</Link>
                <Link to="/register" className="btn-start-free">
                  Start for free
                  <span className="btn-arrow">→</span>
                </Link>
              </>
            ) : (
              <Link to="/student" className="btn-start-free">
                Go to Dashboard
                <span className="btn-arrow">→</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-left">
            <h1 className="hero-title">
              <span className="hero-title-main">STOP GUESSING</span>
              <span className="hero-title-accent">STUDENT WORK HOURS</span>
            </h1>
            <div className="hero-content-box">
              <p className="hero-description">
                Protect your business from £60,000 Right-to-Work fines. Automated compliance audit trails for student workers — built on student declarations, employer acknowledgements, and immutable records that support your Statutory Excuse.
              </p>
              <div className="hero-cta">
                {!isAuthenticated ? (
                  <>
                    <Link to="/register" className="btn-hero-primary">
                      Get Started
                    </Link>
                    <Link to="/register" className="btn-hero-secondary">
                      Employer Access
                    </Link>
                  </>
                ) : (
                  <Link to="/student" className="btn-hero-primary">
                    Go to Dashboard
                  </Link>
                )}
              </div>
              <div className="hero-app-info">
                <p className="app-availability">The platform is available now</p>
                <div className="app-store-icons">
                  <div className="app-icon-placeholder">App Store</div>
                  <div className="app-icon-placeholder">Google Play</div>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-image-placeholder">
              <div className="image-placeholder-content">
                <p>Dashboard Screenshot</p>
                <p className="placeholder-subtitle">Add your dashboard image here</p>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-wave-bg"></div>
      </section>

      {/* Main Value Proposition Section */}
      <section className="value-proposition-section">
        <div className="value-prop-container">
          <div className="value-prop-left">
            <div className="value-prop-stats">
              <div className="stat-item">
                <div className="stat-number">1K+</div>
                <div className="stat-label">ACTIVE USERS</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">COMPLIANCE CHECKS</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">4.9+</div>
                <div className="stat-label">USER RATING</div>
              </div>
            </div>
            <h2 className="value-proposition-title">
              IMMENSE COMPLIANCE PROTECTION
            </h2>
            <p className="value-proposition-tagline">
              WE TURN YOUR COMPLIANCE WORRIES INTO AUDIT-READY EVIDENCE
            </p>
            <Link to="/register" className="btn-view-reviews">
              View Features
            </Link>
          </div>
          <div className="value-prop-right">
            <div className="value-prop-image-placeholder">
              <div className="image-placeholder-content">
                <p>Platform Screenshot</p>
                <p className="placeholder-subtitle">Add your platform image here</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section - Based on Home Office Report */}
      <section id="statistics" className="statistics-section">
        <div className="container">
          <h2 className="section-title">The Compliance Reality: What the Research Shows</h2>
          <p className="section-subtitle">
            A 2024 Home Office-commissioned study surveyed 2,152 businesses across various industries. The findings reveal critical gaps in Right to Work compliance that put employers at serious risk.
          </p>
          
          <div className="statistics-grid">
            <div className="statistic-card">
              <div className="statistic-number">89%</div>
              <h3 className="statistic-title">High Awareness, Patchy Understanding</h3>
              <p className="statistic-description">
                While 89% of employers claim to be aware of RTW checks, far fewer understand exactly how to conduct them correctly. The biggest confusion? Rules around agency and zero-hours workers.
              </p>
            </div>

            <div className="statistic-card">
              <div className="statistic-number">81%</div>
              <h3 className="statistic-title">Over-Reliance on Third Parties</h3>
              <p className="statistic-description">
                81% of businesses using agency workers incorrectly assumed recruitment agencies were responsible for conducting checks. This misunderstanding exposes employers to significant compliance risk.
              </p>
            </div>

            <div className="statistic-card">
              <div className="statistic-number">79%</div>
              <h3 className="statistic-title">Confusion Over Digital Checks</h3>
              <p className="statistic-description">
                Despite available technology, 79% still rely primarily on manual methods. Only 37% use the Home Office online service and 23% use Identity Service Providers (IDSPs).
              </p>
            </div>

            <div className="statistic-card">
              <div className="statistic-number">62%</div>
              <h3 className="statistic-title">Small Businesses Struggle Most</h3>
              <p className="statistic-description">
                Alarmingly, 62% of micro and small employers incorrectly believed a driving licence was a valid RTW document, compared to 42% of medium and large sponsors. SMEs often lack resources or expertise.
              </p>
            </div>

            <div className="statistic-card">
              <div className="statistic-number">41%</div>
              <h3 className="statistic-title">Construction Industry at Risk</h3>
              <p className="statistic-description">
                The construction industry showed the biggest knowledge gaps around acceptable RTW documents and re-checks. 41% of surveyed businesses in the sector believed illegal working was common.
              </p>
            </div>

            <div className="statistic-card">
              <div className="statistic-number">91%</div>
              <h3 className="statistic-title">Employers Prioritize Compliance</h3>
              <p className="statistic-description">
                91% cited preventing illegal working, 88% focused on avoiding penalties, and 87% said they were simply "doing the right thing." Intent is there—execution needs improvement.
              </p>
            </div>
          </div>

          <div className="statistics-note">
            <p>
              <strong>Source:</strong> Home Office-commissioned study by Verian, September 2024. Survey of 2,152 businesses with 30 follow-up interviews.
            </p>
          </div>
        </div>
      </section>

      {/* Compliance Risks Section - What's at Stake */}
      <section id="compliance-risks" className="compliance-risks-section">
        <div className="container">
          <h2 className="section-title">What's at Stake: The Real Cost of Non-Compliance</h2>
          <p className="section-subtitle">
            Failing to meet Right to Work obligations can have devastating consequences for your business. The penalties have tripled, and enforcement is tightening.
          </p>
          
          <div className="stake-grid">
            <div className="stake-card stake-card-financial">
              <h3 className="stake-title">Financial Penalties</h3>
              <div className="stake-amount">Up to £60,000</div>
              <p className="stake-description">
                Fines of up to <strong>£60,000 per illegal worker</strong> (tripled from £20,000 in 2024). A single mistake can cost your business tens of thousands, and repeat offences face maximum penalties.
              </p>
            </div>

            <div className="stake-card stake-card-legal">
              <h3 className="stake-title">Criminal Liability</h3>
              <p className="stake-description">
                Employers face <strong>criminal liability</strong> for knowingly hiring workers who do not have the right to work, or having reasonable grounds to believe that is the case. This can result in prosecution and criminal records.
              </p>
            </div>

            <div className="stake-card stake-card-reputation">
              <h3 className="stake-title">Reputational Damage</h3>
              <p className="stake-description">
                Non-compliance leads to <strong>bad press and loss of contracts</strong>. Both public and private procurement functions are increasingly strict on compliance. One violation can destroy years of reputation.
              </p>
            </div>

            <div className="stake-card stake-card-licence">
              <h3 className="stake-title">Sponsorship Licence Risks</h3>
              <p className="stake-description">
                Non-compliance could lead to <strong>licence revocation</strong>, forcing businesses to dismiss sponsored workers and preventing them from obtaining more. This can effectively shut down international hiring operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Risks for Employers Section */}
      <section className="risks-section risks-employers">
        <div className="container">
          <h2 className="section-title">Why Employers Need This</h2>
          <p className="section-subtitle">
            The stakes are higher than ever. Protect your business from devastating penalties and licence revocation.
          </p>
          
          <div className="risks-grid">
            <div className="risk-card risk-card-critical">
              <h3 className="risk-title">Sky-High Fines</h3>
              <p className="risk-description">
                As of February 2024, the Home Office increased civil penalties to <strong>£45,000 per worker</strong> for a first breach and <strong>£60,000 for repeat offences</strong>. A single mistake can cost your business tens of thousands.
              </p>
            </div>

            <div className="risk-card risk-card-critical">
              <h3 className="risk-title">Licence at Risk</h3>
              <p className="risk-description">
                Even a single hour over the 20-hour limit can lead to the <strong>revocation of your Sponsor Licence</strong>, halting your ability to hire international talent and potentially shutting down your business operations.
              </p>
            </div>

            <div className="risk-card risk-card-warning">
              <h3 className="risk-title">The "Monday-Sunday" Trap</h3>
              <p className="risk-description">
                The Home Office defines a "week" specifically as <strong>Monday to Sunday</strong>. Your payroll week might differ, leading to accidental breaches that you didn't even realize were happening.
              </p>
            </div>

            <div className="risk-card risk-card-warning">
              <h3 className="risk-title">Complex Term Dates</h3>
              <p className="risk-description">
                Different universities—and even different courses within the same university—have varying term dates. <strong>Relying on a student's word or a generic website is not a valid defence</strong> in a Home Office audit.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Risks for Students Section */}
      <section className="risks-section risks-students">
        <div className="container">
          <h2 className="section-title">Why Students Need This</h2>
          <p className="section-subtitle">
            Understand the serious consequences of breaching work hour limits. Protect your future in the UK.
          </p>
          
          <div className="risks-grid">
            <div className="risk-card risk-card-critical">
              <h3 className="risk-title">Deportation Risk</h3>
              <p className="risk-description">
                Exceeding 20 hours is a <strong>criminal offence</strong>. It can lead to immediate visa cancellation, a fine of <strong>£5,000</strong>, and a <strong>permanent ban from returning to the UK</strong>. Your entire future in the UK can be destroyed by a single mistake.
              </p>
            </div>

            <div className="risk-card risk-card-critical">
              <h3 className="risk-title">Career Protection</h3>
              <p className="risk-description">
                Breaching rules can <strong>disqualify you from the Graduate Route</strong> (Post-Study Work visa), making all your years of study "meaningless". You could lose the opportunity to work in the UK after graduation, regardless of your qualifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statutory Excuse Protection Section */}
      <section className="statutory-excuse-section">
        <div className="container">
          <div className="statutory-excuse-content">
            <h2 className="section-title">Your Solution: Statutory Excuse Protection</h2>
            <p className="section-subtitle">
              Our platform provides the evidence of "Statutory Excuse" required by the Home Office to prove you took all reasonable steps to prevent illegal working.
            </p>
            
            <div className="statutory-features-grid">
              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Student Term Declarations</h3>
                <p className="statutory-feature-description">
                  Students declare their academic term dates, creating a timestamped record of when term time begins and ends. This provides clear evidence of declared academic status.
                </p>
              </div>

              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Immutable Audit Log</h3>
                <p className="statutory-feature-description">
                  Creates a time-stamped, unchangeable record of all declarations, confirmations, and acknowledgements. Every action is logged with IP address, user agent, and timestamp for complete audit evidence.
                </p>
              </div>

              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Employer Shield</h3>
                <p className="statutory-feature-description">
                  Provides documented proof that employers performed prescribed right-to-work checks, viewed student declarations, and acknowledged compliance rules. This evidence supports your Statutory Excuse defence.
                </p>
              </div>

              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Dual-Verification</h3>
                <p className="statutory-feature-description">
                  Both student and employer must confirm declarations and acknowledgements, ensuring students cannot claim they were "asked" to work more. Creates mutual accountability and clear audit trails.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <section className="feature-showcase-section">
        <div className="container">
          <div className="feature-showcase-grid">
            <div className="feature-showcase-item">
              <h3 className="feature-showcase-title">Term Declarations</h3>
              <p className="feature-showcase-description">
                Students can declare their academic term dates in minutes. Our intuitive interface makes it easy to add and confirm term periods, ensuring accurate compliance calculations.
              </p>
            </div>

            <div className="feature-showcase-item">
              <h3 className="feature-showcase-title">Employer Acknowledgements</h3>
              <p className="feature-showcase-description">
                Employers can acknowledge student declarations and view compliance rules. Set clear work hour limits and create an audit trail of due diligence with a single click.
              </p>
            </div>

            <div className="feature-showcase-item">
              <h3 className="feature-showcase-title">Audit Trails</h3>
              <p className="feature-showcase-description">
                Instantly generate comprehensive audit reports that show all declarations, confirmations, and acknowledgements. Export complete compliance evidence in PDF or JSON format.
              </p>
            </div>

            <div className="feature-showcase-item">
              <h3 className="feature-showcase-title">Compliance Alerts</h3>
              <p className="feature-showcase-description">
                Stay informed about important compliance updates. Receive notifications when term dates change, acknowledgements are required, or compliance rules are updated.
              </p>
            </div>

            <div className="feature-showcase-item">
              <h3 className="feature-showcase-title">Eligibility Checks</h3>
              <p className="feature-showcase-description">
                Employers can quickly check student eligibility and view calculated work hour limits. See term-time vs holiday rules instantly with clear, actionable information.
              </p>
            </div>

            <div className="feature-showcase-item">
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

      {/* Solutions Section - How to Improve Compliance */}
      <section id="solutions" className="solutions-section">
        <div className="container">
          <h2 className="section-title">How Employers Can Improve Compliance</h2>
          <p className="section-subtitle">
            With the Home Office tightening enforcement, businesses need to take a proactive approach. Here's how ISC Audit — International Student Compliance Audit helps you stay compliant.
          </p>
          
          <div className="solutions-grid">
            <div className="solution-card">
              <h3 className="solution-title">Review and Update Policies</h3>
              <p className="solution-description">
                Our platform ensures your HR teams understand the latest RTW check guidance. We provide clear, up-to-date compliance rules based on student-declared term dates, eliminating guesswork and confusion.
              </p>
              <ul className="solution-benefits">
                <li>Automated compliance rule calculations</li>
                <li>Clear term-time vs holiday distinctions</li>
                <li>Real-time eligibility status</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Train Staff Regularly</h3>
              <p className="solution-description">
                Many compliance failures result from human error. Our platform provides an intuitive interface that guides employers through the compliance process, reducing training needs and preventing costly mistakes.
              </p>
              <ul className="solution-benefits">
                <li>User-friendly dashboard interface</li>
                <li>Clear compliance status indicators</li>
                <li>Built-in guidance and tooltips</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Conduct Regular Audits</h3>
              <p className="solution-description">
                Our comprehensive audit trail feature allows you to review RTW records regularly, spot gaps, and correct issues before a Home Office audit. Export complete audit packs in PDF or JSON format.
              </p>
              <ul className="solution-benefits">
                <li>Complete audit trail logging</li>
                <li>Exportable compliance evidence</li>
                <li>Change history tracking</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Use the Right Technology</h3>
              <p className="solution-description">
                Our platform follows the statutory excuse process and provides digital verification of student declarations. We ensure all checks are properly documented and meet Home Office requirements.
              </p>
              <ul className="solution-benefits">
                <li>Digital verification system</li>
                <li>Statutory excuse documentation</li>
                <li>Compliance with Home Office standards</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Keep Clear Records</h3>
              <p className="solution-description">
                Retaining copies of RTW documents is essential for proving compliance. Our platform maintains immutable records of all declarations, confirmations, and acknowledgements with timestamps and IP addresses.
              </p>
              <ul className="solution-benefits">
                <li>Immutable audit logs</li>
                <li>Timestamped records</li>
                <li>Complete compliance documentation</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Avoid Common Mistakes</h3>
              <p className="solution-description">
                Our platform prevents the most common compliance failures: incorrect document checks, missed re-checks, and confusion over term dates. We automate calculations and provide clear compliance rules.
              </p>
              <ul className="solution-benefits">
                <li>Automated term date calculations</li>
                <li>Clear compliance rule display</li>
                <li>Prevents document confusion</li>
              </ul>
            </div>
          </div>

          <div className="solutions-cta">
            <p className="solutions-cta-text">
              <strong>The Bottom Line:</strong> While most UK employers fully intend to comply with RTW requirements, many fall short on execution. As penalties rise, businesses hiring student workers—particularly in construction, hospitality and healthcare—must ensure they fully understand RTW obligations. A small investment in compliance today could prevent huge financial and legal headaches down the line.
            </p>
          </div>
        </div>
      </section>

      {/* Proof of Fault Section */}
      <section className="proof-of-fault-section">
        <div className="container">
          <div className="proof-of-fault-content">
            <h2 className="section-title">Proof of Fault: Your Legal Defense</h2>
            <p className="section-subtitle">
              If a student lies about their hours or works multiple jobs, our platform creates a comprehensive compliance audit trail that acts as your legal defense.
            </p>
            
            <div className="proof-grid">
              <div className="proof-card">
                <h3 className="proof-title">What Our Audit Trail Shows</h3>
                <ul className="proof-list">
                  <li>✓ Student-declared term dates with timestamps</li>
                  <li>✓ Student confirmations of accuracy</li>
                  <li>✓ Employer acknowledgements of compliance rules</li>
                  <li>✓ System-generated compliance calculations</li>
                  <li>✓ Complete change history if dates are updated</li>
                  <li>✓ IP addresses and user agents for all actions</li>
                </ul>
              </div>

              <div className="proof-card">
                <h3 className="proof-title">How This Protects You</h3>
                <p className="proof-description">
                  This evidence demonstrates that you performed the prescribed right-to-work checks and monitored compliance in good faith. If a student breaches their work limit, the audit trail shows:
                </p>
                <ul className="proof-list">
                  <li>✓ You relied on student-provided information</li>
                  <li>✓ You acknowledged the correct compliance rules</li>
                  <li>✓ You took reasonable steps to prevent illegal working</li>
                  <li>✓ You have documented evidence of due diligence</li>
                </ul>
                <p className="proof-note">
                  <strong>Important:</strong> This platform creates evidence of due diligence. It does not guarantee legal outcomes, but provides the documentation needed to support your Statutory Excuse defense.
                </p>
              </div>
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
          <h2 className="section-title">Do even more with ISC Audit — International Student Compliance Audit</h2>
          <p className="section-subtitle">
            Connect with your workflow and customize your setup to match your unique compliance needs. Our platform helps teams discover efficient ways of working, saving time and reducing risk without compromising compliance.
          </p>
          
          <div className="capabilities-grid">
            <div className="capability-card">
              <h3 className="capability-title">Relationship Management</h3>
              <p className="capability-description">
                Set up student-employer relationships and manage access permissions. Quickly share compliance data and collaborate with ease.
              </p>
            </div>

            <div className="capability-card">
              <h3 className="capability-title">Export & Integration</h3>
              <p className="capability-description">
                Export complete audit packs in PDF or JSON format. Integrate compliance data with your existing HR and payroll systems.
              </p>
            </div>

            <div className="capability-card">
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
              <h3 className="faq-question">What can I get out of using ISC Audit — International Student Compliance Audit?</h3>
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
              <h3 className="faq-question">Do I have to pay to use ISC Audit — International Student Compliance Audit?</h3>
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
              <h4 className="footer-title">ISC Audit — International Student Compliance Audit</h4>
              <p className="footer-text">
                Compliance assurance and audit evidence for student employees. Built for students and employers to manage right-to-work compliance together.
              </p>
            </div>
            <div className="footer-section">
              <h4 className="footer-title">Product</h4>
              <ul className="footer-links">
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#statistics">Statistics</a></li>
                <li><a href="#compliance-risks">Compliance Risks</a></li>
                <li><a href="#solutions">Solutions</a></li>
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
                <strong>Important Disclaimer:</strong> International Student Compliance Audit (operating as "ISC Audit") supports compliance by recording student declarations and confirmations. It does not provide legal advice or determine immigration status. Responsibility remains with the student and employer.
              </p>
            </div>
            <div className="footer-copyright">
              <p>&copy; 2024 ISC Audit — International Student Compliance Audit. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
