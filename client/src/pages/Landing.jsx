import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import MenuButton from '../components/MenuButton'
import './Landing.css'

const navLinks = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#statistics', label: 'Statistics' },
  { href: '#compliance-risks', label: 'Compliance Risks' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#features', label: 'Features' },
  { href: '#faq', label: 'FAQs' },
]

const Landing = () => {
  const { isAuthenticated, isEmployer } = useAuth()
  // this sends each person to their own dashboard, so employers don't land on the student one:
  const dashboardPath = isEmployer ? '/employer' : '/student'
  const [menuOpen, setMenuOpen] = useState(false)
  // for toggling and closing the menu button:
  const toggleMenu = () => {
    setMenuOpen(prev => !prev)
  }

  const closeMenu = () => setMenuOpen(false)


  return (
    <div className="landing-page">
      {/* Header Navigation */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="mobile-left">
            {/* Menu button */}
            <MenuButton isOpen={menuOpen} onClose={closeMenu} links={navLinks} onToggle={toggleMenu}  />
            <div className="landing-logo">
              <div className="logo-icon">
                <div className="logo-icon-inner">ISC.</div>
              </div>
              <span className="logo-text">ISC Audit</span>
            </div>
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
              <Link to={dashboardPath} className="btn-start-free">
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
                Know each international student's weekly work limit before you plan their shifts. ISC Audit keeps a dated record of the term dates students declare and the rules employers acknowledge, so you can show the checks you made.
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
                  <Link to={dashboardPath} className="btn-hero-primary">
                    Go to Dashboard
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="hero-right">
            {/* srcSet lets the browser pick the smallest file that's still sharp
                for the screen; sizes tells it how wide the image is shown. */}
            <img
              className="hero-app-image"
              src="/images/landing/app-mobile-480.webp"
              srcSet="/images/landing/app-mobile-300.webp 300w, /images/landing/app-mobile-360.webp 360w, /images/landing/app-mobile-480.webp 480w, /images/landing/app-mobile-600.webp 600w, /images/landing/app-mobile-720.webp 720w, /images/landing/app-mobile-960.webp 960w, /images/landing/app-mobile-1440.webp 1440w, /images/landing/app-mobile-4k.webp 2400w"
              sizes="(max-width: 415px) 300px, (max-width: 1024px) 360px, 480px"
              width="480"
              height="911"
              alt="ISC Audit student dashboard on a phone, showing the 20 hours per week term-time limit"
              fetchPriority="high"
            />
          </div>
        </div>
        <div className="hero-wave-bg"></div>
      </section>

      {/* Main Value Proposition Section */}
      <section className="value-proposition-section">
        <div className="value-prop-container">
          <div className="value-prop-left">
            {/* these are real facts about the rules, not made up user numbers: */}
            {/* the app has no real users yet, so showing user counts or ratings would not be honest: */}
            <div className="value-prop-stats">
              <div className="stat-item">
                <div className="stat-number">20h</div>
                <div className="stat-label">TERM-TIME LIMIT</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">10h</div>
                <div className="stat-label">BELOW DEGREE</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">£60K</div>
                <div className="stat-label">MAX FINE PER WORKER</div>
              </div>
            </div>
            <h2 className="value-proposition-title">
              CLEAR RULES, DATED RECORDS
            </h2>
            <p className="value-proposition-tagline">
              EVERY DECLARATION AND ACKNOWLEDGEMENT IS SAVED WITH A DATE AND TIME
            </p>
            <a href="#features" className="btn-view-reviews">
              View Features
            </a>
          </div>
          <div className="value-prop-right">
            <img
              className="value-prop-app-image"
              src="/images/landing/app-desktop-760.webp"
              srcSet="/images/landing/app-desktop-760.webp 760w, /images/landing/app-desktop-1140.webp 1140w, /images/landing/app-desktop-1520.webp 1520w, /images/landing/app-desktop-2280.webp 2280w, /images/landing/app-desktop-4k.webp 3840w"
              sizes="(max-width: 1024px) 92vw, 760px"
              width="760"
              height="556"
              alt="ISC Audit employer dashboard in a browser, listing acknowledged student workers"
              loading="lazy"
            />
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
                If your business holds a sponsor licence, a fine for illegal working can lead the Home Office to <strong>suspend or revoke your licence</strong>, which stops you sponsoring overseas workers.
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
                Different universities, and even different courses at the same university, have different term dates. <strong>A generic calendar from the internet will not match</strong>, so you need the dates for each student's own course.
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
              <h3 className="risk-title">Visa at Risk</h3>
              <p className="risk-description">
                Working more hours than your visa allows <strong>breaks your visa conditions</strong>. The Home Office can <strong>cancel your visa</strong>, and a breach can lead to removal from the UK and make it harder to get a UK visa in the future.
              </p>
            </div>

            <div className="risk-card risk-card-critical">
              <h3 className="risk-title">Career Protection</h3>
              <p className="risk-description">
                A breach of your visa conditions can <strong>count against you when you apply for the Graduate Route</strong> or another UK visa later. The hours you work now can affect your plans after you graduate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Due Diligence Section */}
      <section className="statutory-excuse-section">
        <div className="container">
          <div className="statutory-excuse-content">
            <h2 className="section-title">Your Solution: A Clear Record of Due Diligence</h2>
            {/* a statutory excuse comes from the Home Office right to work check (share code), which this app does not do: */}
            {/* so we say the app supports that check instead of replacing it: */}
            <p className="section-subtitle">
              ISC Audit records what each student declared, what the employer acknowledged, and when. It supports your right-to-work process, but it does not replace the Home Office right-to-work check that gives you a statutory excuse.
            </p>
            
            <div className="statutory-features-grid">
              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Student Term Declarations</h3>
                <p className="statutory-feature-description">
                  Students declare their academic term dates, creating a timestamped record of when term time begins and ends. This provides clear evidence of declared academic status.
                </p>
              </div>

              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Append-Only Audit Log</h3>
                <p className="statutory-feature-description">
                  Every declaration, confirmation and acknowledgement is saved with the date, time, IP address and browser. The app only adds new entries and never edits or deletes old ones.
                </p>
              </div>

              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Employer Record</h3>
                <p className="statutory-feature-description">
                  Shows that you viewed the student's declared term dates, saw the weekly limit that applied, and acknowledged it. Keep this alongside your right-to-work check.
                </p>
              </div>

              <div className="statutory-feature">
                <h3 className="statutory-feature-title">Dual-Verification</h3>
                <p className="statutory-feature-description">
                  The student confirms their term dates and the employer acknowledges the rules, so both sides have agreed on the same information. If the dates change, the employer is asked to acknowledge them again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase Section */}
      <section id="features" className="feature-showcase-section">
        <div className="container">
          <h2 className="section-title">Features</h2>
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
                Employers can view a student's declared dates and the rules that apply, then acknowledge them with a single click. Each acknowledgement is saved as a dated record.
              </p>
            </div>

            <div className="feature-showcase-item">
              <h3 className="feature-showcase-title">Audit Trails</h3>
              <p className="feature-showcase-description">
                Instantly generate comprehensive audit reports that show all declarations, confirmations, and acknowledgements. Export complete compliance evidence in PDF or JSON format.
              </p>
            </div>

            <div className="feature-showcase-item">
              <h3 className="feature-showcase-title">Change Tracking</h3>
              <p className="feature-showcase-description">
                When a student changes their term dates, the old and new dates are saved in the history, and the employer is asked to acknowledge the new dates.
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
                See your active students, pending requests and each student's limit for today, all in one place.
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
            A clear process for students and employers to manage student work limits together
          </p>
          
          <div className="how-it-works-grid">
            <div className="how-it-works-card">
              <h3 className="how-it-works-title">For International Students</h3>
              <ol className="how-it-works-steps">
                <li>
                  <strong>Sign up</strong> and create your profile
                </li>
                <li>
                  <strong>Declare your information:</strong>
                  <ul>
                    <li>Your university</li>
                    <li>Your visa type</li>
                    <li>Your course end date</li>
                    <li>Your term dates</li>
                  </ul>
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
                  <strong>Search</strong> by the student's university ID
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
                This gives you a dated record of the checks you made.
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
            With the Home Office tightening enforcement, businesses need to take a proactive approach. Here's how ISC Audit can help.
          </p>
          
          <div className="solutions-grid">
            <div className="solution-card">
              <h3 className="solution-title">Review and Update Policies</h3>
              <p className="solution-description">
                ISC Audit shows your team the weekly limit that applies to each student today, worked out from the term dates they declared, so nobody has to guess.
              </p>
              <ul className="solution-benefits">
                <li>Automated compliance rule calculations</li>
                <li>Clear term-time vs holiday distinctions</li>
                <li>Today's limit for each student</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Train Staff Regularly</h3>
              <p className="solution-description">
                Many compliance failures result from human error. ISC Audit explains each rule in plain English, which helps your team avoid costly mistakes.
              </p>
              <ul className="solution-benefits">
                <li>User-friendly dashboard interface</li>
                <li>Clear compliance status indicators</li>
                <li>Plain-English rule explanations</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Conduct Regular Audits</h3>
              <p className="solution-description">
                The audit trail lets you review each student's declarations and your acknowledgements, spot missing or unconfirmed dates, and fix gaps early. Export audit packs as PDF or JSON.
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
                Use the Home Office online service to check a student's right to work, then use ISC Audit to record their term dates and the weekly limit you agreed to follow.
              </p>
              <ul className="solution-benefits">
                <li>Works alongside Home Office checks</li>
                <li>Student-confirmed term dates</li>
                <li>Employer acknowledgement records</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Keep Clear Records</h3>
              <p className="solution-description">
                Good records show what you checked and when. ISC Audit saves every declaration, confirmation and acknowledgement with the date, time and IP address.
              </p>
              <ul className="solution-benefits">
                <li>Append-only audit log</li>
                <li>Timestamped records</li>
                <li>Complete compliance documentation</li>
              </ul>
            </div>

            <div className="solution-card">
              <h3 className="solution-title">Avoid Common Mistakes</h3>
              <p className="solution-description">
                One of the most common mistakes is confusion over term dates and holidays. ISC Audit works out the limit from the declared dates and warns you when dates are missing or unconfirmed.
              </p>
              <ul className="solution-benefits">
                <li>Automated term date calculations</li>
                <li>Clear compliance rule display</li>
                <li>Warnings for missing or unconfirmed dates</li>
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
            <h2 className="section-title">Evidence of Due Diligence</h2>
            <p className="section-subtitle">
              If something goes wrong, the audit trail shows what the student declared, what you acknowledged, and when.
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
                <h3 className="proof-title">How This Helps You</h3>
                <p className="proof-description">
                  This record shows the information you were given and the rules you agreed to follow. If a student goes over their limit, the audit trail shows:
                </p>
                <ul className="proof-list">
                  <li>✓ You relied on student-provided information</li>
                  <li>✓ You acknowledged the correct compliance rules</li>
                  <li>✓ You checked the limit that applied at the time</li>
                  <li>✓ You have documented evidence of due diligence</li>
                </ul>
                <p className="proof-note">
                  <strong>Important:</strong> This platform creates evidence of due diligence. It does not guarantee legal outcomes, and it does not replace the Home Office right-to-work check you need for a statutory excuse.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="key-benefits" className="features-section">
        <div className="container">
          <h2 className="section-title">Key Benefits</h2>
          <div className="benefits-grid">
            <div className="benefits-column">
              <h3 className="benefits-column-title">For Students</h3>
              <ul className="benefits-list">
                <li>✓ Know your weekly limit at any time</li>
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
                <li>✓ Student-confirmed term dates</li>
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
            A few more things ISC Audit does for students and employers.
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
                Download audit packs as a PDF to keep or share, or as a JSON file that other software can read.
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
                Our platform provides comprehensive compliance evidence for student employees and employers. Students can declare their academic terms and create audit trails, while employers can see each student's weekly limit and record their acknowledgements. Both parties benefit from clear compliance rules and complete audit records.
              </p>
            </div>

            <div className="faq-item">
              <h3 className="faq-question">How do students add their information?</h3>
              <p className="faq-answer">
                Students enter their university, visa type, course end date and term dates, or start from a ready-made term template. The system then works out their weekly limit from that information.
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
                The system automatically calculates work hour limits based on student-declared term dates. On a Student visa, the term-time limit is 20 hours per week (10 hours for courses below degree level), and students can work full-time in the holidays. Graduate Route visa holders have no weekly limit. If term dates are missing, the system plays safe and uses the term-time limit.
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
                No. ISC Audit is free to use. Students and employers can create accounts, manage relationships, and export audit trails at no cost. This helps ensure compliance is accessible to everyone who needs it.
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
              Start keeping a clear, dated record of student work limits.
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
              <Link to={dashboardPath} className="btn btn-primary btn-large">
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
                Compliance assurance and audit evidence for student employees. Built for students and employers to manage student work limits together.
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
              {/* the year updates by itself so the footer never looks out of date: */}
              <p>&copy; {new Date().getFullYear()} ISC Audit — International Student Compliance Audit. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
