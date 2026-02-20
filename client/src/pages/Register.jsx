import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './Auth.css'

const Register = () => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('STUDENT')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Shared profile fields (used by both employer and student)
  const [fullName, setFullName] = useState('')
  
  // Employer profile fields
  const [workEmail, setWorkEmail] = useState('')
  const [employerRole, setEmployerRole] = useState('MANAGER')
  const [organisationName, setOrganisationName] = useState('')
  
  // Student profile fields
  const [universityId, setUniversityId] = useState('')
  const [universityName, setUniversityName] = useState('')
  const [visaType, setVisaType] = useState('Student Visa (Tier 4)')
  const [courseEndDate, setCourseEndDate] = useState('')
  const [maxWeeklyHours, setMaxWeeklyHours] = useState('')
  
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    // Validate employer profile fields if role is EMPLOYER
    if (role === 'EMPLOYER') {
      if (!fullName.trim()) {
        setError('Full name is required')
        return
      }
      if (!workEmail.trim()) {
        setError('Work email is required')
        return
      }
      if (!organisationName.trim()) {
        setError('Organisation name is required')
        return
      }
    }

    // Validate student profile fields if role is STUDENT
    if (role === 'STUDENT') {
      if (!fullName.trim()) {
        setError('Full name is required')
        return
      }
      if (!universityId.trim()) {
        setError('University ID is required')
        return
      }
      if (!universityName.trim()) {
        setError('University name is required')
        return
      }
      if (!visaType) {
        setError('Visa type is required')
        return
      }
      if (!courseEndDate) {
        setError('Course end date is required')
        return
      }

      // Validate course end date is in the future
      const endDate = new Date(courseEndDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (endDate <= today) {
        setError('Course end date must be in the future')
        return
      }

      // Validate maxWeeklyHours if provided
      if (maxWeeklyHours && maxWeeklyHours.trim() !== '') {
        const hours = parseFloat(maxWeeklyHours)
        if (isNaN(hours) || hours < 1 || hours > 168) {
          setError('Maximum weekly hours must be between 1 and 168')
          return
        }
      }
    }

    setLoading(true)

    // Prepare registration data
    const registrationData = {
      email,
      password,
      role,
    }

    // Add employer profile data if role is EMPLOYER
    if (role === 'EMPLOYER') {
      registrationData.employerProfile = {
        fullName: fullName.trim(),
        workEmail: workEmail.trim(),
        role: employerRole,
        organisationName: organisationName.trim(),
      }
    }

    // Add student profile data if role is STUDENT
    if (role === 'STUDENT') {
      registrationData.studentProfile = {
        fullName: fullName.trim(),
        universityId: universityId.trim(),
        universityName: universityName.trim(),
        visaType: visaType,
        courseEndDate: courseEndDate,
        maxWeeklyHours: maxWeeklyHours && maxWeeklyHours.trim() !== '' ? parseFloat(maxWeeklyHours) : undefined,
      }
    }

    const result = await register(registrationData)
    
    if (result.success) {
      // Redirect based on user role
      const savedUser = localStorage.getItem('user')
      if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
        try {
          const user = JSON.parse(savedUser)
          if (user?.role === 'STUDENT') {
            navigate('/student')
          } else if (user?.role === 'EMPLOYER') {
            navigate('/employer')
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
      setError(result.error || 'Registration failed')
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
          <h1>Get Started</h1>
          <p className="auth-subtitle">Create your account to begin</p>
        </div>

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
              placeholder="Create a strong password"
            />
            <small className="form-hint">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </small>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter your password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="role">
              I am a
            </label>
            <select
              id="role"
              className="form-input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              <option value="STUDENT">Student</option>
              <option value="EMPLOYER">Employer</option>
            </select>
          </div>

          {/* Student Profile Fields */}
          {role === 'STUDENT' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Smith"
                />
                <small className="form-hint">
                  Your full name as it appears on official documents
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="universityId">
                  University ID *
                </label>
                <input
                  id="universityId"
                  type="text"
                  className="form-input"
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  required
                  placeholder="Enter your university student ID"
                />
                <small className="form-hint">
                  This is your unique student identifier at your university
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="universityName">
                  University Name *
                </label>
                <input
                  id="universityName"
                  type="text"
                  className="form-input"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  required
                  placeholder="e.g. University of Southampton"
                />
                <small className="form-hint">
                  The name of your university
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="visaType">
                  Visa Type *
                </label>
                <select
                  id="visaType"
                  className="form-input"
                  value={visaType}
                  onChange={(e) => setVisaType(e.target.value)}
                  required
                >
                  <option value="Student Visa (Tier 4)">Student Visa (Tier 4)</option>
                  <option value="Graduate Route Visa">Graduate Route Visa</option>
                  <option value="Skilled Worker Visa">Skilled Worker Visa</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="courseEndDate">
                  Course End Date *
                </label>
                <input
                  id="courseEndDate"
                  type="date"
                  className="form-input"
                  value={courseEndDate}
                  onChange={(e) => setCourseEndDate(e.target.value)}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
                <small className="form-hint">
                  When does your course end? This date must be in the future.
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="maxWeeklyHours">
                  Maximum Weekly Hours (Optional)
                </label>
                <input
                  id="maxWeeklyHours"
                  type="number"
                  className="form-input"
                  value={maxWeeklyHours}
                  onChange={(e) => setMaxWeeklyHours(e.target.value)}
                  min="1"
                  max="168"
                  placeholder="20"
                />
                <small className="form-hint">
                  Maximum hours you can work per week (default is 20 for student visas)
                </small>
              </div>
            </>
          )}

          {/* Employer Profile Fields */}
          {role === 'EMPLOYER' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="John Smith"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="workEmail">
                  Work Email *
                </label>
                <input
                  id="workEmail"
                  type="email"
                  className="form-input"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  required
                  placeholder="john.smith@company.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="employerRole">
                  Role *
                </label>
                <select
                  id="employerRole"
                  className="form-input"
                  value={employerRole}
                  onChange={(e) => setEmployerRole(e.target.value)}
                  required
                >
                  <option value="MANAGER">Manager</option>
                  <option value="HR">HR</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="organisationName">
                  Organisation Name *
                </label>
                <input
                  id="organisationName"
                  type="text"
                  className="form-input"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  required
                  placeholder="Acme Corporation"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
