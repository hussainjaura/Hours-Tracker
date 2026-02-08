import { useState, useEffect } from 'react'
import { employerAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import './Dashboard.css'

const EmployerDashboard = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [employerProfile, setEmployerProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  
  // Student search state
  const [searchUniversityId, setSearchUniversityId] = useState('')
  const [searchedStudent, setSearchedStudent] = useState(null)
  const [searching, setSearching] = useState(false)

  // Eligibility checker state
  const [eligibilityCheck, setEligibilityCheck] = useState({
    universityId: ''
  })
  const [eligibilityResult, setEligibilityResult] = useState(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)

  useEffect(() => {
    loadDashboardData()
    loadEmployerProfile()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      const [studentsRes] = await Promise.allSettled([
        employerAPI.getStudents().catch(() => ({ data: [] })),
      ])

      if (studentsRes.status === 'fulfilled') {
        const studentsData = studentsRes.value?.data || []
        setStudents(studentsData)
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadEmployerProfile = async () => {
    try {
      setProfileLoading(true)
      const response = await employerAPI.getProfile()
      setEmployerProfile(response.data)
    } catch (err) {
      // 404 means profile doesn't exist - this shouldn't happen if registration worked correctly
      if (err.status !== 404 && err.response?.status !== 404) {
        console.error('Error loading employer profile:', err)
      }
      setEmployerProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleAcknowledgeStudent = async (relationshipId) => {
    if (!window.confirm('By acknowledging, you confirm that you have reviewed the student\'s declared term dates and understand the compliance rules. This creates an audit trail for compliance purposes.')) {
      return
    }
    
    try {
      await employerAPI.acknowledgeStudent(relationshipId)
      alert('Student declarations acknowledged successfully. This has been recorded in the audit trail.')
      loadDashboardData()
    } catch (err) {
      setError(err.message || 'Failed to acknowledge student declarations')
    }
  }

  const handleCheckEligibility = async (e) => {
    e.preventDefault()
    try {
      setCheckingEligibility(true)
      setError('')
      
      const res = await employerAPI.checkEligibility(
        eligibilityCheck.universityId,
        null
      )
      
      setEligibilityResult(res.data)
    } catch (err) {
      setError(err.message || 'Failed to check eligibility')
      setEligibilityResult(null)
    } finally {
      setCheckingEligibility(false)
    }
  }

  const handleRequestAccess = async (universityId) => {
    try {
      await employerAPI.requestAccess(universityId)
      alert('Access request sent! Waiting for student approval.')
      loadDashboardData()
      setSearchedStudent(null)
      setSearchUniversityId('')
    } catch (err) {
      // Handle 409 Conflict - relationship already exists
      if (err.status === 409) {
        const relationship = err.relationship || err.response?.data?.relationship || err.response?.data?.error?.relationship
        const status = relationship?.status || 'existing'
        const message = `You already have a ${status.toLowerCase()} relationship with this student. Check your "My Students" tab.`
        setError(message)
        // Reload to show the existing relationship
        loadDashboardData()
      } else {
        setError(err.message || 'Failed to request access')
      }
    }
  }

  const handleSearchStudent = async (e) => {
    e.preventDefault()
    try {
      setSearching(true)
      setError('')
      setSearchedStudent(null)
      
      const res = await employerAPI.searchStudent(searchUniversityId.trim())
      setSearchedStudent(res.data)
    } catch (err) {
      // Handle different error types
      if (err.status === 403 || err.response?.status === 403) {
        setError('Access denied. Please make sure you are logged in as an employer.')
      } else if (err.status === 404 || err.response?.status === 404) {
        setError('Student not found. Please check the University ID and try again.')
      } else {
        setError(err.message || 'Failed to search for student')
      }
      setSearchedStudent(null)
    } finally {
      setSearching(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatHours = (hours) => {
    return parseFloat(hours).toFixed(2)
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    )
  }

  const activeStudents = students.filter(s => s.status === 'ACTIVE')
  const pendingRequests = students.filter(s => s.status === 'PENDING')

  return (
    <div className="dashboard-container">
      {error && (
        <div className="dashboard-error">
          {error}
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="dashboard-page-header">
        <div>
          <h1>Employer Dashboard</h1>
          <p className="dashboard-subtitle">RTW Compliance Audit - Evidence & Audit Assurance</p>
        </div>
        <div className="dashboard-stats-quick">
          <div className="stat-box">
            <div className="stat-value">{activeStudents.length}</div>
            <div className="stat-label">Active Students</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{pendingRequests.length}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={activeTab === 'overview' ? 'tab-active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'compliance' ? 'tab-active' : ''}
          onClick={() => setActiveTab('compliance')}
        >
          Compliance Rules
        </button>
        <button
          className={activeTab === 'students' ? 'tab-active' : ''}
          onClick={() => setActiveTab('students')}
        >
          My Students
        </button>
        <button
          className={activeTab === 'eligibility' ? 'tab-active' : ''}
          onClick={() => setActiveTab('eligibility')}
        >
          Check Eligibility
        </button>
        <button
          className={activeTab === 'find-students' ? 'tab-active' : ''}
          onClick={() => setActiveTab('find-students')}
        >
          Find Students
        </button>
        <button
          className={activeTab === 'profile' ? 'tab-active' : ''}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={activeTab === 'audit' ? 'tab-active' : ''}
          onClick={() => setActiveTab('audit')}
        >
          Audit Trail
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          {/* Welcome Banner */}
          <div className="overview-banner banner-employer">
            <div className="banner-content">
              <div className="banner-text">
                <h2>Compliance Assurance Dashboard</h2>
                <p>Manage student compliance information and create audit-ready records for right-to-work compliance.</p>
              </div>
              <div className="banner-stat">
                <div className="banner-stat-value">{activeStudents.length}</div>
                <div className="banner-stat-label">Active Students</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="overview-stats-grid">
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">{students.length}</div>
                <div className="stat-card-label">Total Students</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">{activeStudents.length}</div>
                <div className="stat-card-label">Active Relationships</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">{pendingRequests.length}</div>
                <div className="stat-card-label">Pending Requests</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">
                  {activeStudents.filter(s => s.acknowledgedAt).length}
                </div>
                <div className="stat-card-label">Acknowledged</div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="overview-two-column">
            {/* Left Column */}
            <div className="overview-column">
              {/* Active Students */}
              {activeStudents.length > 0 ? (
                <div className="dashboard-card">
                  <h3>Active Students</h3>
                  <div className="students-list">
                    {activeStudents.slice(0, 5).map((rel) => (
                      <div key={rel.id} className="student-card">
                        <div className="student-header">
                          <div>
                            <div className="student-id">University ID: {rel.student.universityId}</div>
                            <div className="student-email">
                              {rel.student.user?.email || 'N/A'}
                            </div>
                            <div className="student-meta">
                              Linked: {formatDate(rel.linkedAt)}
                            </div>
                          </div>
                          <span className="status-badge status-active">Active</span>
                        </div>
                        {rel.acknowledgedAt ? (
                          <div className="acknowledgement-badge-small" style={{ marginTop: '0.5rem' }}>
                            Acknowledged on {formatDate(rel.acknowledgedAt)}
                          </div>
                        ) : (
                          <div className="acknowledgement-badge-small pending" style={{ marginTop: '0.5rem' }}>
                            Pending Acknowledgement
                          </div>
                        )}
                      </div>
                    ))}
                    {activeStudents.length > 5 && (
                      <div className="view-all-link" onClick={() => setActiveTab('students')}>
                        View all {activeStudents.length} active students →
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="dashboard-card">
                  <h3>Active Students</h3>
                  <div className="empty-state">
                    <p className="text-secondary">No active student relationships yet.</p>
                    <p className="text-secondary">Use "Find Students" to search and request access.</p>
                  </div>
                </div>
              )}

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="dashboard-card alert-card">
                  <h3>Action Required</h3>
                  <div className="alert-content">
                    <div className="alert-text">
                      <strong>{pendingRequests.length} pending access request{pendingRequests.length > 1 ? 's' : ''}</strong>
                      <p>Waiting for student approval</p>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveTab('students')}
                    >
                      View
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="overview-column">
              {/* Compliance Summary */}
              <div className="dashboard-card">
                <h3>Compliance Overview</h3>
                <div className="compliance-summary-box">
                  <div className="compliance-summary-item">
                    <div className="summary-content">
                      <div className="summary-title">Your Role</div>
                      <div className="summary-description">
                        As an employer, you can view student-declared compliance information and acknowledge their declarations to create audit trails.
                      </div>
                    </div>
                  </div>
                  <div className="compliance-summary-item">
                    <div className="summary-content">
                      <div className="summary-title">Acknowledged Students</div>
                      <div className="summary-description">
                        {activeStudents.filter(s => s.acknowledgedAt).length} of {activeStudents.length} active students acknowledged
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="dashboard-card">
                <h3>Quick Actions</h3>
                <div className="quick-actions-list">
                  <button
                    className="quick-action-btn"
                    onClick={() => setActiveTab('find-students')}
                  >
                    <span className="action-text">Find Students</span>
                  </button>
                  <button
                    className="quick-action-btn"
                    onClick={() => setActiveTab('eligibility')}
                  >
                    <span className="action-text">Check Eligibility</span>
                  </button>
                  <button
                    className="quick-action-btn"
                    onClick={() => setActiveTab('compliance')}
                  >
                    <span className="action-text">View Compliance Rules</span>
                  </button>
                </div>
              </div>

              {/* Important Information */}
              <div className="dashboard-card info-card">
                <h3>Important Information</h3>
                <div className="info-list">
                  <div className="info-item">
                    <div className="info-content">
                      <strong>Compliance Evidence:</strong> This platform helps you create audit-ready records by acknowledging student-declared information.
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-content">
                      <strong>Term Time Rules:</strong> During term time, students can work a maximum of 20 hours per week. During holidays, full-time work is allowed.
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-content">
                      <strong>Acknowledgement:</strong> Acknowledging student declarations creates a timestamped audit trail for compliance purposes.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>My Profile</h2>
            <p className="text-secondary">View and manage your employer profile information.</p>
            
            {profileLoading ? (
              <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading profile...</p>
              </div>
            ) : employerProfile ? (
              <div className="profile-details">
                <div className="profile-section">
                  <h3>Profile Information</h3>
                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <div className="profile-info-label">Full Name</div>
                      <div className="profile-info-value">{employerProfile.fullName}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Work Email</div>
                      <div className="profile-info-value">{employerProfile.workEmail}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Role</div>
                      <div className="profile-info-value">{employerProfile.role}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Organisation Name</div>
                      <div className="profile-info-value">{employerProfile.organisationName}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Account Created</div>
                      <div className="profile-info-value">
                        {employerProfile.user?.createdAt ? formatDate(employerProfile.user.createdAt) : formatDate(employerProfile.createdAt)}
                      </div>
                    </div>
                    {employerProfile.lastLogin && (
                      <div className="profile-info-item">
                        <div className="profile-info-label">Last Login</div>
                        <div className="profile-info-value">{formatDate(employerProfile.lastLogin)}</div>
                      </div>
                    )}
                    {employerProfile.lastLoginIp && (
                      <div className="profile-info-item">
                        <div className="profile-info-label">Last Login IP Address</div>
                        <div className="profile-info-value">{employerProfile.lastLoginIp}</div>
                      </div>
                    )}
                    {employerProfile.lastLoginUserAgent && (
                      <div className="profile-info-item">
                        <div className="profile-info-label">Last Login User Agent</div>
                        <div className="profile-info-value" style={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>
                          {employerProfile.lastLoginUserAgent}
                        </div>
                      </div>
                    )}
                    {employerProfile.acknowledgementIps && Array.isArray(employerProfile.acknowledgementIps) && employerProfile.acknowledgementIps.length > 0 && (
                      <div className="profile-info-item" style={{ gridColumn: '1 / -1' }}>
                        <div className="profile-info-label">IP Addresses for Acknowledgements</div>
                        <div className="profile-info-value">
                          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                            {employerProfile.acknowledgementIps.map((ip, idx) => (
                              <li key={idx}>{ip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-secondary">Profile not found. If you just registered, please refresh the page or contact support if the issue persists.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compliance Rules Tab */}
      {activeTab === 'compliance' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>Compliance Rules & Student Information</h2>
            <p className="text-secondary">
              View student-declared term dates and compliance rules. This information is provided by students and must be acknowledged.
            </p>
            
            {activeStudents.length > 0 ? (
              <div className="compliance-students-list">
                {activeStudents.map((rel) => {
                  const student = rel.student
                  return (
                    <div key={rel.id} className="compliance-student-card">
                      <div className="compliance-student-header">
                        <div>
                          <h3>University ID: {student.universityId}</h3>
                          <div className="student-info">
                            <div><strong>Visa Type:</strong> {student.visaType}</div>
                            <div><strong>Course End Date:</strong> {formatDate(student.courseEndDate)}</div>
                            {rel.acknowledgedAt ? (
                              <div className="acknowledgement-status acknowledged">
                                Acknowledged on {formatDate(rel.acknowledgedAt)}
                              </div>
                            ) : (
                              <div className="acknowledgement-status pending">
                                Pending Acknowledgement
                              </div>
                            )}
                          </div>
                        </div>
                        {!rel.acknowledgedAt && (
                          <button
                            className="btn btn-primary"
                            onClick={() => handleAcknowledgeStudent(rel.id)}
                          >
                            Acknowledge Declarations
                          </button>
                        )}
                      </div>
                      
                      <div className="compliance-rules">
                        <h4>Compliance Rules</h4>
                        <div className="rules-list">
                          <div className="rule-item">
                            <strong>During Term Time:</strong> Maximum 20 hours per week
                          </div>
                          <div className="rule-item">
                            <strong>Outside Term Time:</strong> Full-time allowed (no weekly limit)
                          </div>
                        </div>
                      </div>
                      
                      {student.terms && student.terms.length > 0 ? (
                        <div className="student-terms">
                          <h4>Student-Declared Term Dates</h4>
                          <div className="terms-list">
                            {student.terms.map((term) => (
                              <div key={term.id} className="term-info-card">
                                <div className="term-info-header">
                                  <div>
                                    <div className="term-name">{term.name}</div>
                                    {term.academicYear && (
                                      <div className="term-academic-year">Academic Year: {term.academicYear}</div>
                                    )}
                                    <div className="term-dates">
                                      {formatDate(term.startDate)} - {formatDate(term.endDate)}
                                    </div>
                                  </div>
                                  {term.confirmedAt ? (
                                    <span className="confirmation-badge confirmed">
                                      Confirmed
                                    </span>
                                  ) : (
                                    <span className="confirmation-badge pending">
                                      Not Confirmed
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="no-terms">
                          <p className="text-secondary">Student has not declared any term dates yet.</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-secondary">No active student relationships. Find students and request access to view their compliance information.</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Legacy Log Hours Tab - REMOVED */}
      {false && activeTab === 'log-hours' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>Log Work Hours</h2>
            <p className="text-secondary">This feature has been removed. Use your payroll system to track hours.</p>
            
            <form onSubmit={handleLogHours} className="log-hours-form">
              <div className="form-group">
                <label className="form-label" htmlFor="studentUniversityId">
                  Student University ID *
                </label>
                <input
                  id="studentUniversityId"
                  type="text"
                  className="form-input"
                  value={logHoursForm.studentUniversityId}
                  onChange={(e) => {
                    setLogHoursForm({ ...logHoursForm, studentUniversityId: e.target.value })
                    setTimeout(handleCheckEligibilityForLogging, 500)
                  }}
                  required
                  placeholder="Enter student's university ID"
                />
                <small className="form-hint">
                  You must have an active relationship with this student
                </small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="date">
                  Date *
                </label>
                <input
                  id="date"
                  type="date"
                  className="form-input"
                  value={logHoursForm.date}
                  onChange={(e) => {
                    setLogHoursForm({ ...logHoursForm, date: e.target.value })
                    setTimeout(handleCheckEligibilityForLogging, 500)
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="hours">
                  Hours *
                </label>
                <input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  className="form-input"
                  value={logHoursForm.hours}
                  onChange={(e) => {
                    setLogHoursForm({ ...logHoursForm, hours: e.target.value })
                    setTimeout(handleCheckEligibilityForLogging, 500)
                  }}
                  required
                  placeholder="e.g., 8.5"
                />
                {logHoursEligibilityCheck && (
                  <div className={`eligibility-preview ${logHoursEligibilityCheck.inTermTime ? 'term-time-warning' : 'non-term-time'}`}>
                    {logHoursEligibilityCheck.inTermTime ? (
                      <div>
                        <strong>TERM TIME:</strong> Student is in {logHoursEligibilityCheck.activeTerm || 'term time'}. 
                        Maximum 20 hours/week allowed. 
                        {logHoursForm.hours && (
                          <span>
                            {' '}Current: {logHoursEligibilityCheck.currentWeeklyHours}h, 
                            Adding: {parseFloat(logHoursForm.hours) || 0}h = {((logHoursEligibilityCheck.currentWeeklyHours || 0) + (parseFloat(logHoursForm.hours) || 0)).toFixed(1)}h total.
                            {((logHoursEligibilityCheck.currentWeeklyHours || 0) + (parseFloat(logHoursForm.hours) || 0)) > 20 && (
                              <strong className="text-error"> This exceeds the 20-hour limit!</strong>
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <strong>Non-Term Time:</strong> Student can work full-time. No weekly limit.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="description">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  className="form-input"
                  rows="3"
                  value={logHoursForm.description}
                  onChange={(e) => setLogHoursForm({ ...logHoursForm, description: e.target.value })}
                  placeholder="Brief description of work performed"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loggingHours}
              >
                {loggingHours ? 'Logging...' : 'Log Hours'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>My Students</h2>
            
            {students.length > 0 ? (
              <div className="students-list">
                {students.map((rel) => (
                  <div key={rel.id} className="student-card">
                    <div className="student-header">
                      <div>
                        <div className="student-id">University ID: {rel.student.universityId}</div>
                        <div className="student-email">
                          {rel.student.user?.email || 'N/A'}
                        </div>
                        <div className="student-meta">
                          Linked: {formatDate(rel.linkedAt)}
                        </div>
                      </div>
                      <span className={`status-badge status-${rel.status.toLowerCase()}`}>
                        {rel.status}
                      </span>
                    </div>
                    {rel.status === 'PENDING' && (
                      <div className="student-note">
                        Waiting for student approval
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-secondary">No students linked yet.</p>
                <p className="text-secondary">Use the "Check Eligibility" tab to find and request access to students.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Eligibility Checker Tab */}
      {activeTab === 'eligibility' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>Check Student Eligibility</h2>
            <p className="text-secondary">Check if a student can work and their current eligibility status.</p>
            
            <form onSubmit={handleCheckEligibility} className="eligibility-form">
              <div className="form-group">
                <label className="form-label" htmlFor="eligibilityUniversityId">
                  Student University ID *
                </label>
                <input
                  id="eligibilityUniversityId"
                  type="text"
                  className="form-input"
                  value={eligibilityCheck.universityId}
                  onChange={(e) => setEligibilityCheck({ ...eligibilityCheck, universityId: e.target.value })}
                  required
                  placeholder="Enter student's university ID"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={checkingEligibility}
              >
                {checkingEligibility ? 'Checking...' : 'Check Eligibility'}
              </button>
            </form>

            {eligibilityResult && (
              <div className="eligibility-result">
                <h3>Compliance Information</h3>
                <div className={`eligibility-status ${eligibilityResult.canWork !== false ? 'can-work' : 'cannot-work'}`}>
                  <div>
                    <div className="eligibility-title">
                      {eligibilityResult.canWork === false 
                        ? 'Student Cannot Work' 
                        : eligibilityResult.inTermTime 
                          ? 'Student Can Work - Term Time Rules Apply'
                          : 'Student Can Work - Holiday Period'}
                    </div>
                    {eligibilityResult.reason && (
                      <div className="eligibility-reason">{eligibilityResult.reason}</div>
                    )}
                  </div>
                </div>
                
                <div className="eligibility-details">
                  <div className="detail-item">
                    <span className="detail-label">Weekly Hour Limit:</span>
                    <span className="detail-value">
                      {eligibilityResult.allowedWeeklyHours || 'N/A'}h
                      {eligibilityResult.inTermTime && (
                        <span className="detail-note"> (Term time limit)</span>
                      )}
                      {!eligibilityResult.inTermTime && (
                        <span className="detail-note"> (Full-time allowed)</span>
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Current Period:</span>
                    <span className="detail-value">
                      {eligibilityResult.inTermTime ? 'Term Time' : 'Holiday'}
                    </span>
                  </div>
                  {eligibilityResult.activeTerm && (
                    <div className="detail-item">
                      <span className="detail-label">Active Term:</span>
                      <span className="detail-value">
                        {typeof eligibilityResult.activeTerm === 'object' 
                          ? eligibilityResult.activeTerm.name || eligibilityResult.activeTerm 
                          : eligibilityResult.activeTerm}
                      </span>
                    </div>
                  )}
                  {eligibilityResult.inTermTime && (
                    <div className="compliance-warning-box">
                      <strong>Compliance Rule:</strong> During term time, this student must not be scheduled for more than {eligibilityResult.allowedWeeklyHours} hours per week. This is a legal requirement for UK student visas.
                    </div>
                  )}
                  {!eligibilityResult.inTermTime && (
                    <div className="compliance-info-box">
                      <strong>Holiday Period:</strong> During holidays, this student can work full-time with no weekly hour limit.
                    </div>
                  )}
                </div>

                {eligibilityResult.canWork !== false && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleRequestAccess(eligibilityCheck.universityId)}
                  >
                    Request Access to This Student
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Find Students Tab */}
      {activeTab === 'find-students' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>Find Students</h2>
            <p className="text-secondary">Search for students by their University ID to view their profile and request access.</p>
            
            <form onSubmit={handleSearchStudent} className="search-student-form">
              <div className="form-group">
                <label className="form-label" htmlFor="searchUniversityId">
                  University ID *
                </label>
                <div className="search-input-group">
                  <input
                    id="searchUniversityId"
                    type="text"
                    className="form-input"
                    value={searchUniversityId}
                    onChange={(e) => setSearchUniversityId(e.target.value)}
                    required
                    placeholder="Enter student's university ID"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={searching || !searchUniversityId.trim()}
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </form>

            {searchedStudent && (
              <div className="searched-student-card">
                <h3>Student Profile</h3>
                <div className="student-profile-info">
                  <div className="profile-item">
                    <span className="profile-label">University ID:</span>
                    <span className="profile-value">{searchedStudent.universityId}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Visa Type:</span>
                    <span className="profile-value">{searchedStudent.visaType}</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Can Work:</span>
                    <span className={`profile-value ${searchedStudent.canWork ? 'text-success' : 'text-error'}`}>
                      {searchedStudent.canWork ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {searchedStudent.reason && (
                    <div className="profile-item">
                      <span className="profile-label">Status:</span>
                      <span className="profile-value">{searchedStudent.reason}</span>
                    </div>
                  )}
                  <div className="profile-item">
                    <span className="profile-label">Allowed Weekly Hours:</span>
                    <span className="profile-value">{searchedStudent.allowedWeeklyHours || 'N/A'}h</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">In Term Time:</span>
                    <span className="profile-value">{searchedStudent.inTermTime ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="student-profile-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleRequestAccess(searchedStudent.universityId)}
                  >
                    Request Access
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setEligibilityCheck({ universityId: searchedStudent.universityId })
                      setActiveTab('eligibility')
                    }}
                  >
                    Check Eligibility
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <EmployerAuditTrailTab students={students} />
      )}
    </div>
  )
}

// Employer Audit Trail Tab Component
const EmployerAuditTrailTab = ({ students }) => {
  const [auditTrails, setAuditTrails] = useState([])
  const [selectedRelationship, setSelectedRelationship] = useState(null)
  const [selectedAuditTrail, setSelectedAuditTrail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const activeStudents = students.filter(s => s.status === 'ACTIVE')

  useEffect(() => {
    if (activeStudents.length > 0) {
      loadAuditTrails()
    } else {
      setLoading(false)
    }
  }, [students])

  const loadAuditTrails = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await employerAPI.getAllRelationshipAuditTrails()
      if (response?.data) {
        setAuditTrails(response.data)
        // Select first relationship by default
        if (response.data.length > 0 && response.data[0].auditTrail) {
          setSelectedRelationship(response.data[0].relationshipId)
          setSelectedAuditTrail(response.data[0].auditTrail)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit trails')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRelationship = async (relationshipId) => {
    try {
      setSelectedRelationship(relationshipId)
      const trail = auditTrails.find(t => t.relationshipId === relationshipId)
      if (trail?.auditTrail) {
        setSelectedAuditTrail(trail.auditTrail)
      } else {
        // Load individual trail if not in list
        const response = await employerAPI.getRelationshipAuditTrail(relationshipId)
        if (response?.data) {
          setSelectedAuditTrail(response.data)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit trail')
    }
  }

  const handleExportAuditPack = async (relationshipId, format = 'json') => {
    try {
      setExporting(true)
      const response = await employerAPI.exportRelationshipAuditPack(relationshipId, format)
      
      // Detect content type from response
      const contentType = response.headers['content-type'] || response.data.type
      const isPDF = contentType.includes('application/pdf') || format === 'pdf'
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: isPDF ? 'application/pdf' : 'application/json' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const extension = isPDF ? 'pdf' : 'json'
      link.download = `audit-pack-relationship-${relationshipId}-${Date.now()}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message || 'Failed to export audit pack')
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="dashboard-content">
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading audit trails...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-card">
        <div className="audit-header">
          <div>
            <h2>Compliance Audit Trails</h2>
            <p className="text-secondary">
              View and export audit trails for your student relationships. Complete records for Home Office compliance.
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {activeStudents.length === 0 ? (
          <div className="empty-state">
            <p className="text-secondary">No active student relationships. Audit trails will appear here once you have active relationships.</p>
          </div>
        ) : (
          <div className="audit-trails-layout">
            {/* Left Sidebar - Relationship List */}
            <div className="audit-relationships-sidebar">
              <h3>Select Student Relationship</h3>
              <div className="relationships-list">
                {auditTrails.map((trail) => {
                  const student = activeStudents.find(s => 
                    s.student?.universityId === trail.studentUniversityId
                  )
                  return (
                    <div
                      key={trail.relationshipId}
                      className={`relationship-item ${selectedRelationship === trail.relationshipId ? 'active' : ''}`}
                      onClick={() => handleSelectRelationship(trail.relationshipId)}
                    >
                      <div className="relationship-student-id">
                        {trail.studentUniversityId || 'N/A'}
                      </div>
                      <div className="relationship-status">
                        {trail.status === 'ACTIVE' && (
                          <span className="badge badge-success">Active</span>
                        )}
                        {trail.acknowledgedAt && (
                          <span className="badge badge-info">Acknowledged</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Content - Audit Trail Details */}
            <div className="audit-trail-content">
              {selectedAuditTrail ? (
                <>
                  <div className="audit-trail-header">
                    <div>
                      <h3>Audit Trail for {selectedAuditTrail.student?.universityId || 'Student'}</h3>
                      <p className="text-secondary">
                        Relationship ID: {selectedRelationship}
                      </p>
                      <div className="export-info">
                        <small className="text-secondary">
                          <strong>PDF:</strong> Professional document ready for submission | <strong>JSON:</strong> Machine-readable data format
                        </small>
                      </div>
                    </div>
                    <div className="export-buttons-group">
                      <button
                        className="btn btn-primary"
                        onClick={() => handleExportAuditPack(selectedRelationship, 'pdf')}
                        disabled={exporting}
                        title="Export as PDF document - Ready for Home Office submission"
                      >
                        {exporting ? 'Exporting...' : 'Export PDF'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleExportAuditPack(selectedRelationship, 'json')}
                        disabled={exporting}
                        title="Export as JSON file - Machine-readable format"
                      >
                        {exporting ? 'Exporting...' : 'Export JSON'}
                      </button>
                    </div>
                  </div>

                  {/* Layer 1: Identity */}
                  <div className="audit-section">
                    <h3>1. Identity & Context</h3>
                    <div className="audit-identity-grid">
                      <div className="audit-identity-item">
                        <div className="identity-label">Student University ID</div>
                        <div className="identity-value">{selectedAuditTrail.student?.universityId || 'N/A'}</div>
                      </div>
                      <div className="audit-identity-item">
                        <div className="identity-label">Visa Type</div>
                        <div className="identity-value">{selectedAuditTrail.student?.visaType || 'N/A'}</div>
                      </div>
                      <div className="audit-identity-item">
                        <div className="identity-label">Course End Date</div>
                        <div className="identity-value">{formatDate(selectedAuditTrail.student?.courseEndDate)}</div>
                      </div>
                      <div className="audit-identity-item">
                        <div className="identity-label">Employer ID</div>
                        <div className="identity-value">{selectedAuditTrail.relationship?.employerId || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Layer 2: Student Declarations */}
                  <div className="audit-section">
                    <h3>2. Student Term Declarations</h3>
                    {selectedAuditTrail.studentDeclarations && selectedAuditTrail.studentDeclarations.length > 0 ? (
                      <div className="audit-declarations-list">
                        {selectedAuditTrail.studentDeclarations.map((decl, idx) => (
                          <div key={idx} className="audit-declaration-card">
                            <div className="declaration-header">
                              <div>
                                <div className="declaration-term-name">{decl.term.name} Term</div>
                                <div className="declaration-academic-year">{decl.term.academicYear}</div>
                              </div>
                              {decl.confirmedAt ? (
                                <span className="badge badge-success">Confirmed</span>
                              ) : (
                                <span className="badge badge-warning">Pending</span>
                              )}
                            </div>
                            <div className="declaration-dates">
                              <div className="date-item">
                                <span className="date-label">Start:</span>
                                <span className="date-value">{formatDate(decl.term.startDate)}</span>
                              </div>
                              <div className="date-item">
                                <span className="date-label">End:</span>
                                <span className="date-value">{formatDate(decl.term.endDate)}</span>
                              </div>
                            </div>
                            <div className="declaration-meta">
                              <div className="meta-item">
                                <span className="meta-label">Declared:</span>
                                <span className="meta-value">{formatDate(decl.declaredAt)}</span>
                              </div>
                              {decl.confirmedAt && (
                                <div className="meta-item">
                                  <span className="meta-label">Confirmed:</span>
                                  <span className="meta-value">{formatDate(decl.confirmedAt)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p className="text-secondary">No student declarations available.</p>
                      </div>
                    )}
                  </div>

                  {/* Layer 3: Employer Acknowledgement */}
                  <div className="audit-section">
                    <h3>3. Employer Acknowledgement</h3>
                    {selectedAuditTrail.employerAcknowledgement ? (
                      <div className="audit-acknowledgement-card">
                        <div className="acknowledgement-header">
                          <div>
                            <div className="acknowledgement-status">Acknowledged</div>
                            <div className="acknowledgement-date">
                              Date: {formatDate(selectedAuditTrail.employerAcknowledgement.acknowledgedAt)}
                            </div>
                          </div>
                          <span className="badge badge-success">Acknowledged</span>
                        </div>
                        {selectedAuditTrail.employerAcknowledgement.acknowledgementText && (
                          <div className="acknowledgement-text">
                            <strong>Employer Statement:</strong> "{selectedAuditTrail.employerAcknowledgement.acknowledgementText}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p className="text-secondary">No acknowledgement recorded yet.</p>
                        <p className="text-secondary">Please acknowledge student declarations in the Compliance Rules tab.</p>
                      </div>
                    )}
                  </div>

                  {/* Layer 4: Compliance Rules */}
                  <div className="audit-section">
                    <h3>4. System-Generated Compliance Rules</h3>
                    {selectedAuditTrail.complianceRules && selectedAuditTrail.complianceRules.length > 0 ? (
                      <div className="audit-rules-list">
                        {selectedAuditTrail.complianceRules.map((rule, idx) => (
                          <div key={idx} className="audit-rule-card">
                            <div className="rule-header">
                              <div className="rule-action">{rule.action}</div>
                              <div className="rule-date">{formatDate(rule.createdAt)}</div>
                            </div>
                            {rule.complianceRule && (
                              <div className="rule-details">
                                <div className="rule-detail-item">
                                  <span className="rule-detail-label">Rule Applied:</span>
                                  <span className="rule-detail-value">{rule.complianceRule.ruleApplied || 'N/A'}</span>
                                </div>
                                {rule.complianceRule.allowedWeeklyHours && (
                                  <div className="rule-detail-item">
                                    <span className="rule-detail-label">Allowed Hours:</span>
                                    <span className="rule-detail-value">{rule.complianceRule.allowedWeeklyHours}h/week</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p className="text-secondary">No compliance rules generated yet.</p>
                      </div>
                    )}
                  </div>

                  {/* Layer 5: Change History */}
                  <div className="audit-section">
                    <h3>5. Change History</h3>
                    {selectedAuditTrail.changeHistory && selectedAuditTrail.changeHistory.length > 0 ? (
                      <div className="audit-changes-list">
                        {selectedAuditTrail.changeHistory.map((change, idx) => (
                          <div key={idx} className="audit-change-card">
                            <div className="change-header">
                              <div className="change-action">{change.action}</div>
                              <div className="change-date">{formatDate(change.createdAt)}</div>
                            </div>
                            {change.changeHistory && (
                              <div className="change-details">
                                <div className="change-before">
                                  <strong>Before:</strong>
                                  <pre>{JSON.stringify(change.changeHistory.before, null, 2)}</pre>
                                </div>
                                <div className="change-arrow">→</div>
                                <div className="change-after">
                                  <strong>After:</strong>
                                  <pre>{JSON.stringify(change.changeHistory.after, null, 2)}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p className="text-secondary">No changes recorded yet.</p>
                      </div>
                    )}
                  </div>

                  {/* All Audit Logs */}
                  <div className="audit-section">
                    <h3>Complete Audit Log</h3>
                    <p className="text-secondary">All audit events for this relationship.</p>
                    {selectedAuditTrail.allAuditLogs && selectedAuditTrail.allAuditLogs.length > 0 ? (
                      <div className="audit-logs-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date & Time</th>
                              <th>Action</th>
                              <th>Entity Type</th>
                              <th>Performed By</th>
                              <th>IP Address</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAuditTrail.allAuditLogs.map((log) => (
                              <tr key={log.id}>
                                <td>{formatDate(log.createdAt)}</td>
                                <td>{log.action}</td>
                                <td>{log.entityType}</td>
                                <td>{log.performedBy}</td>
                                <td>{log.ipAddress || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <p className="text-secondary">No audit logs available.</p>
                      </div>
                    )}
                  </div>

                  {/* Disclaimer */}
                  <div className="audit-disclaimer">
                    <strong>Important:</strong> This system records declarations and acknowledgements. It does not replace payroll or legal advice. This export is for compliance evidence purposes only.
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <p className="text-secondary">Select a student relationship to view audit trail.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployerDashboard
