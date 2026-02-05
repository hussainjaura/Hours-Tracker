import { useState, useEffect } from 'react'
import { employerAPI } from '../services/api'
import './Dashboard.css'

const EmployerDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [recentShifts, setRecentShifts] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Student search state
  const [searchUniversityId, setSearchUniversityId] = useState('')
  const [searchedStudent, setSearchedStudent] = useState(null)
  const [searching, setSearching] = useState(false)
  
  // Log hours form state
  const [logHoursForm, setLogHoursForm] = useState({
    studentUniversityId: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: ''
  })
  const [loggingHours, setLoggingHours] = useState(false)
  const [logHoursEligibilityCheck, setLogHoursEligibilityCheck] = useState(null)
  const [checkingEligibilityForDate, setCheckingEligibilityForDate] = useState(false)

  // Eligibility checker state
  const [eligibilityCheck, setEligibilityCheck] = useState({
    universityId: '',
    requestedHours: ''
  })
  const [eligibilityResult, setEligibilityResult] = useState(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)

  useEffect(() => {
    loadDashboardData()
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
        
        // Load shifts for active students
        if (studentsData.length > 0) {
          const activeStudents = studentsData.filter(s => s.status === 'ACTIVE')
          if (activeStudents.length > 0) {
            try {
              const shiftsRes = await employerAPI.getStudentShifts(activeStudents[0].student.universityId)
              setRecentShifts(shiftsRes.data.slice(0, 5))
            } catch (err) {
              // Ignore errors for shifts
            }
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogHours = async (e) => {
    e.preventDefault()
    try {
      setLoggingHours(true)
      setError('')
      
      const hoursToLog = parseFloat(logHoursForm.hours)
      
      // Check eligibility before logging if we have student ID and date
      if (logHoursForm.studentUniversityId && logHoursForm.date) {
        try {
          const eligibilityRes = await employerAPI.checkEligibility(
            logHoursForm.studentUniversityId,
            hoursToLog
          )
          const eligibility = eligibilityRes.data
          
          // Check if in term time and would exceed 20 hours
          if (eligibility.inTermTime && (eligibility.currentWeeklyHours + hoursToLog) > 20) {
            const confirmMessage = `⚠️ TERM TIME WARNING: This student is in term time (${eligibility.activeTerm || 'Active Term'}). Logging ${hoursToLog}h would result in ${(eligibility.currentWeeklyHours + hoursToLog).toFixed(1)}h this week, exceeding the 20-hour limit.\n\nThis is ILLEGAL and violates UK student visa regulations.\n\nAre you sure you want to proceed?`
            
            if (!window.confirm(confirmMessage)) {
              setLoggingHours(false)
              return
            }
          }
        } catch (eligibilityErr) {
          // If eligibility check fails, still try to log (backend will validate)
          console.warn('Eligibility check failed:', eligibilityErr)
        }
      }
      
      await employerAPI.logHours({
        studentUniversityId: logHoursForm.studentUniversityId,
        date: logHoursForm.date,
        hours: hoursToLog,
        description: logHoursForm.description
      })

      // Reset form
      setLogHoursForm({
        studentUniversityId: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        description: ''
      })
      setLogHoursEligibilityCheck(null)

      // Reload data
      loadDashboardData()
      
      alert('Work hours logged successfully! Student will need to confirm.')
    } catch (err) {
      // Handle term time violation errors with better messaging
      if (err.status === 400 || err.response?.status === 400) {
        const errorData = err.response?.data?.error || err.response?.data
        if (errorData?.code === 'TERM_TIME_LIMIT_EXCEEDED' || errorData?.isTermTime) {
          setError(errorData?.message || 'Cannot log more than 20 hours during term time. This violates UK student visa regulations.')
        } else {
          setError(errorData?.message || err.message || 'Failed to log hours')
        }
      } else {
        setError(err.message || 'Failed to log hours')
      }
    } finally {
      setLoggingHours(false)
    }
  }

  // Check eligibility when date or student changes
  const handleCheckEligibilityForLogging = async () => {
    if (!logHoursForm.studentUniversityId || !logHoursForm.date) {
      setLogHoursEligibilityCheck(null)
      return
    }

    try {
      setCheckingEligibilityForDate(true)
      const res = await employerAPI.checkEligibility(
        logHoursForm.studentUniversityId,
        parseFloat(logHoursForm.hours) || null
      )
      setLogHoursEligibilityCheck(res.data)
    } catch (err) {
      setLogHoursEligibilityCheck(null)
      // Silently fail - this is just a preview
    } finally {
      setCheckingEligibilityForDate(false)
    }
  }

  const handleCheckEligibility = async (e) => {
    e.preventDefault()
    try {
      setCheckingEligibility(true)
      setError('')
      
      const res = await employerAPI.checkEligibility(
        eligibilityCheck.universityId,
        parseFloat(eligibilityCheck.requestedHours) || null
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
      <div className="dashboard-header">
        <div>
          <h1>Employer Dashboard</h1>
          <p className="dashboard-subtitle">Manage your students and log work hours</p>
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
          <div className="stat-box">
            <div className="stat-value">{recentShifts.length}</div>
            <div className="stat-label">Recent Shifts</div>
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
          className={activeTab === 'log-hours' ? 'tab-active' : ''}
          onClick={() => setActiveTab('log-hours')}
        >
          Log Hours
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
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          {/* Quick Stats */}
          <div className="dashboard-card">
            <h2>Quick Overview</h2>
            <div className="overview-grid">
              <div className="overview-item">
                <div className="overview-label">Total Students</div>
                <div className="overview-value">{students.length}</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">Active Relationships</div>
                <div className="overview-value">{activeStudents.length}</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">Pending Requests</div>
                <div className="overview-value">{pendingRequests.length}</div>
              </div>
            </div>
          </div>

          {/* Recent Shifts */}
          {recentShifts.length > 0 && (
            <div className="dashboard-card">
              <h2>Recent Work Shifts</h2>
              <div className="shifts-list">
                {recentShifts.map((shift) => (
                  <div key={shift.id} className="shift-card">
                    <div className="shift-header">
                      <div>
                        <div className="shift-date">{formatDate(shift.date)}</div>
                        <div className="shift-hours">{formatHours(shift.hours)} hours</div>
                      </div>
                      <span className={`status-badge status-${shift.status.toLowerCase()}`}>
                        {shift.status}
                      </span>
                    </div>
                    {shift.description && (
                      <div className="shift-description">{shift.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Students Quick View */}
          {activeStudents.length > 0 && (
            <div className="dashboard-card">
              <h2>Active Students</h2>
              <div className="students-list">
                {activeStudents.slice(0, 5).map((rel) => (
                  <div key={rel.id} className="student-card">
                    <div className="student-header">
                      <div>
                        <div className="student-id">University ID: {rel.student.universityId}</div>
                        <div className="student-email">
                          {rel.student.user?.email || 'N/A'}
                        </div>
                      </div>
                      <span className="status-badge status-active">Active</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Hours Tab */}
      {activeTab === 'log-hours' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>Log Work Hours</h2>
            <p className="text-secondary">Log work hours for a student. The student will need to confirm the shift.</p>
            
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
                        <strong>⚠️ TERM TIME:</strong> Student is in {logHoursEligibilityCheck.activeTerm || 'term time'}. 
                        Maximum 20 hours/week allowed. 
                        {logHoursForm.hours && (
                          <span>
                            {' '}Current: {logHoursEligibilityCheck.currentWeeklyHours}h, 
                            Adding: {parseFloat(logHoursForm.hours) || 0}h = {((logHoursEligibilityCheck.currentWeeklyHours || 0) + (parseFloat(logHoursForm.hours) || 0)).toFixed(1)}h total.
                            {((logHoursEligibilityCheck.currentWeeklyHours || 0) + (parseFloat(logHoursForm.hours) || 0)) > 20 && (
                              <strong className="text-error"> ⚠️ This exceeds the 20-hour limit!</strong>
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <strong>✓ Non-Term Time:</strong> Student can work full-time. No weekly limit.
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

              <div className="form-group">
                <label className="form-label" htmlFor="requestedHours">
                  Requested Hours (Optional)
                </label>
                <input
                  id="requestedHours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="form-input"
                  value={eligibilityCheck.requestedHours}
                  onChange={(e) => setEligibilityCheck({ ...eligibilityCheck, requestedHours: e.target.value })}
                  placeholder="Check if student can work these hours"
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
                <h3>Eligibility Result</h3>
                <div className={`eligibility-status ${eligibilityResult.canWork ? 'can-work' : 'cannot-work'}`}>
                  <div className="eligibility-icon">
                    {eligibilityResult.canWork ? '✓' : '✗'}
                  </div>
                  <div>
                    <div className="eligibility-title">
                      {eligibilityResult.canWork ? 'Student Can Work' : 'Student Cannot Work'}
                    </div>
                    {eligibilityResult.reason && (
                      <div className="eligibility-reason">{eligibilityResult.reason}</div>
                    )}
                  </div>
                </div>
                
                <div className="eligibility-details">
                  <div className="detail-item">
                    <span className="detail-label">Allowed Weekly Hours:</span>
                    <span className="detail-value">{eligibilityResult.allowedWeeklyHours || 'N/A'}h</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">In Term Time:</span>
                    <span className="detail-value">{eligibilityResult.inTermTime ? 'Yes' : 'No'}</span>
                  </div>
                  {eligibilityResult.activeTerm && (
                    <div className="detail-item">
                      <span className="detail-label">Active Term:</span>
                      <span className="detail-value">{eligibilityResult.activeTerm.name}</span>
                    </div>
                  )}
                </div>

                {eligibilityResult.canWork && (
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
                      setEligibilityCheck({ universityId: searchedStudent.universityId, requestedHours: '' })
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
    </div>
  )
}

export default EmployerDashboard
