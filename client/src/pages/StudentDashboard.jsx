import { useState, useEffect } from 'react'
import { studentAPI } from '../services/api'
import CreateProfileForm from '../components/CreateProfileForm'
import './Dashboard.css'

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [weeklySummary, setWeeklySummary] = useState(null)
  const [pendingShifts, setPendingShifts] = useState([])
  const [recentShifts, setRecentShifts] = useState([])
  const [complianceSummary, setComplianceSummary] = useState(null)
  const [violations, setViolations] = useState([])
  const [employers, setEmployers] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [terms, setTerms] = useState([])
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  
  // Term form state
  const [showTermForm, setShowTermForm] = useState(false)
  const [editingTerm, setEditingTerm] = useState(null)
  const [termForm, setTermForm] = useState({
    name: '',
    startDate: '',
    endDate: ''
  })
  const [submittingTerm, setSubmittingTerm] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all data in parallel
      // Use Promise.allSettled to handle errors gracefully
      const [profileRes, weeklyRes, shiftsRes, complianceRes, violationsRes, employersRes, requestsRes, termsRes, templatesRes] = await Promise.allSettled([
        studentAPI.getProfile().catch((err) => {
          // 404 is expected if profile doesn't exist yet
          if (err.status === 404 || err.response?.status === 404) {
            return null
          }
          throw err
        }),
        studentAPI.getWeeklyShifts().catch(() => null),
        studentAPI.getShifts().catch(() => ({ data: [] })),
        studentAPI.getComplianceSummary().catch(() => null),
        studentAPI.getViolations().catch(() => ({ data: { violations: [] } })),
        studentAPI.getEmployers().catch(() => ({ data: [] })),
        studentAPI.getRequests().catch(() => ({ data: [] })),
        studentAPI.getTerms().catch(() => ({ data: [] })),
        studentAPI.getTemplates().catch(() => ({ data: [] })),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value?.data) {
        setProfile(profileRes.value.data)
      }

      if (weeklyRes.status === 'fulfilled' && weeklyRes.value?.data) {
        setWeeklySummary(weeklyRes.value.data)
      }

      if (shiftsRes.status === 'fulfilled') {
        const shifts = shiftsRes.value?.data || []
        setPendingShifts(shifts.filter(s => s.status === 'PENDING'))
        setRecentShifts(shifts.filter(s => s.status !== 'PENDING').slice(0, 5))
      }

      if (complianceRes.status === 'fulfilled' && complianceRes.value?.data) {
        const data = complianceRes.value.data
        // Transform the response to match our expected format
        setComplianceSummary({
          compliant: data.compliant,
          hours: data.hours,
          context: data.context,
          violations: data.violations
        })
      }

      if (violationsRes.status === 'fulfilled') {
        const data = violationsRes.value?.data || { violations: [] }
        setViolations(data.violations || [])
      }

      if (employersRes.status === 'fulfilled') {
        setEmployers(employersRes.value?.data || [])
      }

      if (requestsRes.status === 'fulfilled') {
        setPendingRequests(requestsRes.value?.data || [])
      }

      if (termsRes.status === 'fulfilled') {
        setTerms(termsRes.value?.data || [])
      }

      if (templatesRes.status === 'fulfilled') {
        setTemplates(templatesRes.value?.data || [])
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmShift = async (shiftId) => {
    try {
      await studentAPI.confirmShift(shiftId)
      loadDashboardData()
    } catch (err) {
      setError(err.message || 'Failed to confirm shift')
    }
  }

  const handleRejectShift = async (shiftId, reason) => {
    try {
      await studentAPI.rejectShift(shiftId, reason || 'Not specified')
      loadDashboardData()
    } catch (err) {
      setError(err.message || 'Failed to reject shift')
    }
  }

  const handleAcceptRequest = async (relationshipId) => {
    try {
      await studentAPI.acceptRequest(relationshipId)
      alert('Access granted successfully!')
      loadDashboardData()
    } catch (err) {
      setError(err.message || 'Failed to accept request')
    }
  }

  const handleRejectRequest = async (relationshipId) => {
    if (!window.confirm('Are you sure you want to reject this access request?')) {
      return
    }
    try {
      await studentAPI.rejectRequest(relationshipId)
      alert('Access request rejected.')
      loadDashboardData()
    } catch (err) {
      setError(err.message || 'Failed to reject request')
    }
  }

  // Term management functions
  const handleCreateTerm = async (e) => {
    e.preventDefault()
    try {
      setSubmittingTerm(true)
      setError('')
      
      // Frontend validation: Check for duplicate term in same year
      const startYear = new Date(termForm.startDate).getFullYear()
      const endYear = new Date(termForm.endDate).getFullYear()
      const termName = termForm.name.toUpperCase()
      const newStart = new Date(termForm.startDate)
      const newEnd = new Date(termForm.endDate)
      
      // Check for duplicate term name in same year
      const duplicateTerm = terms.find(term => {
        if (term.name.toUpperCase() !== termName) return false
        const termStartYear = new Date(term.startDate).getFullYear()
        const termEndYear = new Date(term.endDate).getFullYear()
        return termStartYear === startYear || termStartYear === endYear || 
               termEndYear === startYear || termEndYear === endYear
      })
      
      if (duplicateTerm) {
        const duplicateYear = new Date(duplicateTerm.startDate).getFullYear()
        setError(`You already have a ${termName} term in ${duplicateYear}. Each term (Autumn, Spring, Summer) can only be created once per year.`)
        setSubmittingTerm(false)
        return
      }

      // Check for date range overlaps with ANY existing term
      const overlappingTerm = terms.find(term => {
        const termStart = new Date(term.startDate)
        const termEnd = new Date(term.endDate)
        // Two ranges overlap if: newStart <= termEnd && newEnd >= termStart
        return newStart <= termEnd && newEnd >= termStart
      })

      if (overlappingTerm) {
        const termStartStr = formatDate(overlappingTerm.startDate)
        const termEndStr = formatDate(overlappingTerm.endDate)
        setError(`This term overlaps with your existing ${overlappingTerm.name} term (${termStartStr} - ${termEndStr}). Terms cannot have overlapping dates.`)
        setSubmittingTerm(false)
        return
      }
      
      await studentAPI.createTerm({
        name: termForm.name.toUpperCase(),
        startDate: termForm.startDate,
        endDate: termForm.endDate
      })
      
      setShowTermForm(false)
      setTermForm({ name: '', startDate: '', endDate: '' })
      loadDashboardData()
      alert('Term created successfully!')
    } catch (err) {
      // Handle backend duplicate/overlap error
      if (err.status === 409 || err.response?.status === 409) {
        const errorData = err.response?.data?.error || err.response?.data
        if (errorData?.code === 'OVERLAPPING_TERM') {
          setError(errorData?.message || 'This term overlaps with an existing term.')
        } else {
          setError(errorData?.message || 'This term already exists for this year.')
        }
      } else {
        setError(err.message || 'Failed to create term')
      }
    } finally {
      setSubmittingTerm(false)
    }
  }

  const handleCreateFromTemplate = async (templateId, customDates = null) => {
    try {
      setSubmittingTerm(true)
      setError('')
      
      const template = templates.find(t => t.id === templateId)
      if (!template) {
        setError('Template not found')
        setSubmittingTerm(false)
        return
      }

      // Frontend validation: Check for duplicate term in same year
      const finalStartDate = customDates?.startDate || template.startDate
      const finalEndDate = customDates?.endDate || template.endDate
      const startYear = new Date(finalStartDate).getFullYear()
      const endYear = new Date(finalEndDate).getFullYear()
      const termName = template.name.toUpperCase()
      const newStart = new Date(finalStartDate)
      const newEnd = new Date(finalEndDate)
      
      // Check for duplicate term name in same year
      const duplicateTerm = terms.find(term => {
        if (term.name.toUpperCase() !== termName) return false
        const termStartYear = new Date(term.startDate).getFullYear()
        const termEndYear = new Date(term.endDate).getFullYear()
        return termStartYear === startYear || termStartYear === endYear || 
               termEndYear === startYear || termEndYear === endYear
      })
      
      if (duplicateTerm) {
        const duplicateYear = new Date(duplicateTerm.startDate).getFullYear()
        setError(`You already have a ${termName} term in ${duplicateYear}. Each term (Autumn, Spring, Summer) can only be created once per year.`)
        setSubmittingTerm(false)
        return
      }

      // Check for date range overlaps with ANY existing term
      const overlappingTerm = terms.find(term => {
        const termStart = new Date(term.startDate)
        const termEnd = new Date(term.endDate)
        // Two ranges overlap if: newStart <= termEnd && newEnd >= termStart
        return newStart <= termEnd && newEnd >= termStart
      })

      if (overlappingTerm) {
        const termStartStr = formatDate(overlappingTerm.startDate)
        const termEndStr = formatDate(overlappingTerm.endDate)
        setError(`This term overlaps with your existing ${overlappingTerm.name} term (${termStartStr} - ${termEndStr}). Terms cannot have overlapping dates.`)
        setSubmittingTerm(false)
        return
      }
      
      const data = { templateId }
      if (customDates) {
        data.startDate = customDates.startDate
        data.endDate = customDates.endDate
      }
      
      await studentAPI.createTermFromTemplate(data)
      loadDashboardData()
      alert('Term created from template successfully!')
    } catch (err) {
      // Handle backend duplicate/overlap error
      if (err.status === 409 || err.response?.status === 409) {
        const errorData = err.response?.data?.error || err.response?.data
        if (errorData?.code === 'OVERLAPPING_TERM') {
          setError(errorData?.message || 'This term overlaps with an existing term.')
        } else {
          setError(errorData?.message || 'This term already exists for this year.')
        }
      } else {
        setError(err.message || 'Failed to create term from template')
      }
    } finally {
      setSubmittingTerm(false)
    }
  }

  const handleUpdateTerm = async (e) => {
    e.preventDefault()
    try {
      setSubmittingTerm(true)
      setError('')
      
      // Frontend validation: Check for overlaps if dates are being updated
      if (termForm.startDate || termForm.endDate) {
        const updatedStart = termForm.startDate ? new Date(termForm.startDate) : new Date(editingTerm.startDate)
        const updatedEnd = termForm.endDate ? new Date(termForm.endDate) : new Date(editingTerm.endDate)
        
        // Get all other terms (excluding the one being updated)
        const otherTerms = terms.filter(term => term.id !== editingTerm.id)
        
        // Check for date range overlaps
        const overlappingTerm = otherTerms.find(term => {
          const termStart = new Date(term.startDate)
          const termEnd = new Date(term.endDate)
          // Two ranges overlap if: updatedStart <= termEnd && updatedEnd >= termStart
          return updatedStart <= termEnd && updatedEnd >= termStart
        })

        if (overlappingTerm) {
          const termStartStr = formatDate(overlappingTerm.startDate)
          const termEndStr = formatDate(overlappingTerm.endDate)
          setError(`This update would cause overlap with your existing ${overlappingTerm.name} term (${termStartStr} - ${termEndStr}). Terms cannot have overlapping dates.`)
          setSubmittingTerm(false)
          return
        }
      }
      
      const updateData = {}
      if (termForm.name) updateData.name = termForm.name.toUpperCase()
      if (termForm.startDate) updateData.startDate = termForm.startDate
      if (termForm.endDate) updateData.endDate = termForm.endDate
      
      await studentAPI.updateTerm(editingTerm.id, updateData)
      
      setShowTermForm(false)
      setEditingTerm(null)
      setTermForm({ name: '', startDate: '', endDate: '' })
      loadDashboardData()
      alert('Term updated successfully!')
    } catch (err) {
      // Handle backend overlap error
      if (err.status === 409 || err.response?.status === 409) {
        const errorData = err.response?.data?.error || err.response?.data
        if (errorData?.code === 'OVERLAPPING_TERM') {
          setError(errorData?.message || 'This term overlaps with an existing term.')
        } else {
          setError(errorData?.message || 'This term already exists for this year.')
        }
      } else {
        setError(err.message || 'Failed to update term')
      }
    } finally {
      setSubmittingTerm(false)
    }
  }

  const handleDeleteTerm = async (termId) => {
    if (!window.confirm('Are you sure you want to delete this term?')) {
      return
    }
    try {
      await studentAPI.deleteTerm(termId)
      loadDashboardData()
      alert('Term deleted successfully!')
    } catch (err) {
      setError(err.message || 'Failed to delete term')
    }
  }

  const handleEditTerm = (term) => {
    setEditingTerm(term)
    setTermForm({
      name: term.name,
      startDate: term.startDate.split('T')[0],
      endDate: term.endDate.split('T')[0]
    })
    setShowTermForm(true)
  }

  const handleCancelTermForm = () => {
    setShowTermForm(false)
    setEditingTerm(null)
    setTermForm({ name: '', startDate: '', endDate: '' })
  }

  const getTermStatus = (term) => {
    const now = new Date()
    const start = new Date(term.startDate)
    const end = new Date(term.endDate)
    
    if (now < start) return 'upcoming'
    if (now >= start && now <= end) return 'active'
    return 'past'
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

  // Show profile creation if no profile exists
  if (!profile) {
    return <CreateProfileForm onSuccess={loadDashboardData} />
  }

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
          <h1>Student Dashboard</h1>
          <p className="dashboard-subtitle">University ID: {profile.universityId}</p>
        </div>
        <div className="dashboard-stats-quick">
          <div className="stat-box">
            <div className="stat-value">{weeklySummary ? formatHours(weeklySummary.totalHours) : '0'}</div>
            <div className="stat-label">Hours This Week</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{pendingShifts.length}</div>
            <div className="stat-label">Pending Shifts</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{violations.length}</div>
            <div className="stat-label">Violations</div>
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
          className={activeTab === 'shifts' ? 'tab-active' : ''}
          onClick={() => setActiveTab('shifts')}
        >
          Work Shifts
        </button>
        <button
          className={activeTab === 'compliance' ? 'tab-active' : ''}
          onClick={() => setActiveTab('compliance')}
        >
          Compliance
        </button>
        <button
          className={activeTab === 'employers' ? 'tab-active' : ''}
          onClick={() => setActiveTab('employers')}
        >
          Employers
        </button>
        <button
          className={activeTab === 'requests' ? 'tab-active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Access Requests
        </button>
        <button
          className={activeTab === 'terms' ? 'tab-active' : ''}
          onClick={() => setActiveTab('terms')}
        >
          Terms
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="dashboard-content">
          {/* Weekly Summary Card */}
          {(weeklySummary || complianceSummary) && (
            <div className="dashboard-card weekly-summary-card">
              <h2>This Week's Summary</h2>
              <div className="weekly-summary-grid">
                <div className="summary-item">
                  <div className="summary-label">Total Hours</div>
                  <div className="summary-value">
                    {formatHours(
                      complianceSummary?.hours?.total || 
                      weeklySummary?.totalHours || 
                      0
                    )}h
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Allowed Hours</div>
                  <div className="summary-value">
                    {complianceSummary?.hours?.allowed || 
                     weeklySummary?.allowedWeeklyHours || 
                     'N/A'}h
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Remaining</div>
                  <div className={`summary-value ${
                    ((complianceSummary?.hours?.remaining || weeklySummary?.remaining || 0) < 0) 
                      ? 'text-error' 
                      : ''
                  }`}>
                    {complianceSummary?.hours?.remaining !== undefined 
                      ? formatHours(complianceSummary.hours.remaining)
                      : weeklySummary?.remaining !== undefined 
                        ? formatHours(weeklySummary.remaining)
                        : 'N/A'}h
                  </div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Status</div>
                  <div className={`summary-value ${
                    (complianceSummary?.context?.inTermTime || weeklySummary?.inTermTime) 
                      ? 'text-info' 
                      : 'text-success'
                  }`}>
                    {(complianceSummary?.context?.inTermTime || weeklySummary?.inTermTime) 
                      ? 'Term Time' 
                      : 'Holiday'}
                  </div>
                </div>
              </div>
              {(complianceSummary?.context?.activeTerm || weeklySummary?.activeTerm) && (
                <div className="active-term">
                  Active Term: {(complianceSummary?.context?.activeTerm || weeklySummary?.activeTerm)?.name}
                </div>
              )}
            </div>
          )}

          {/* Pending Shifts */}
          {pendingShifts.length > 0 && (
            <div className="dashboard-card">
              <h2>Pending Shifts - Action Required</h2>
              <div className="shifts-list">
                {pendingShifts.map((shift) => (
                  <div key={shift.id} className="shift-card pending">
                    <div className="shift-header">
                      <div>
                        <div className="shift-date">{formatDate(shift.date)}</div>
                        <div className="shift-hours">{formatHours(shift.hours)} hours</div>
                      </div>
                      <span className="status-badge status-pending">Pending</span>
                    </div>
                    {shift.description && (
                      <div className="shift-description">{shift.description}</div>
                    )}
                    <div className="shift-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleConfirmShift(shift.id)}
                      >
                        Confirm
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const reason = prompt('Reason for rejection:')
                          if (reason) handleRejectShift(shift.id, reason)
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Shifts */}
          {recentShifts.length > 0 && (
            <div className="dashboard-card">
              <h2>Recent Shifts</h2>
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

          {/* Compliance Status */}
          {complianceSummary && (
            <div className="dashboard-card">
              <h2>Compliance Status</h2>
              <div className={`compliance-status ${complianceSummary.compliant ? 'compliant' : 'non-compliant'}`}>
                <div className="compliance-icon">
                  {complianceSummary.compliant ? '✓' : '⚠'}
                </div>
                <div>
                  <div className="compliance-title">
                    {complianceSummary.compliant ? 'Compliant' : 'Non-Compliant'}
                  </div>
                  <div className="compliance-details">
                    {complianceSummary.compliant
                      ? 'You are within your work hour limits.'
                      : 'You have exceeded your work hour limits.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>All Work Shifts</h2>
            <p className="text-secondary">View and manage all your work shifts</p>
            <p className="text-secondary">Full shifts list will be implemented here.</p>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="dashboard-content">
          {violations.length > 0 ? (
            <div className="dashboard-card">
              <h2>Compliance Violations</h2>
              <div className="violations-list">
                {violations.map((violation) => (
                  <div key={violation.id} className="violation-card">
                    <div className="violation-header">
                      <div>
                        <div className="violation-type">{violation.violationType.replace(/_/g, ' ')}</div>
                        <div className={`violation-severity severity-${violation.severity.toLowerCase()}`}>
                          {violation.severity}
                        </div>
                      </div>
                    </div>
                    <div className="violation-details">
                      <div>Week: {formatDate(violation.weekStart)} - {formatDate(violation.weekEnd)}</div>
                      <div>Allowed: {formatHours(violation.allowedHours)}h | Actual: {formatHours(violation.actualHours)}h</div>
                      <div>Excess: {formatHours(violation.excessHours)}h</div>
                    </div>
                    {violation.description && (
                      <div className="violation-description">{violation.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="dashboard-card">
              <h2>Compliance Status</h2>
              <div className="compliance-status compliant">
                <div className="compliance-icon">✓</div>
                <div>
                  <div className="compliance-title">No Violations</div>
                  <div className="compliance-details">You are currently compliant with all work hour regulations.</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employers Tab */}
      {activeTab === 'employers' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>Your Employers</h2>
            {employers.length > 0 ? (
              <div className="employers-list">
                {employers.map((rel) => (
                  <div key={rel.id} className="employer-card">
                    <div className="employer-header">
                      <div>
                        <div className="employer-id">Employer ID: {rel.employerId}</div>
                        <div className="employer-status">Status: {rel.status}</div>
                      </div>
                      <span className={`status-badge status-${rel.status.toLowerCase()}`}>
                        {rel.status}
                      </span>
                    </div>
                    <div className="employer-meta">
                      Linked: {formatDate(rel.linkedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary">No employers linked yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>Employer Access Requests</h2>
            <p className="text-secondary">Review and manage employer requests to access your work hours.</p>
            
            {pendingRequests.length > 0 ? (
              <div className="requests-list">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <div>
                        <div className="request-title">Access Request</div>
                        <div className="request-meta">
                          Requested: {formatDate(request.linkedAt)}
                        </div>
                      </div>
                      <span className="status-badge status-pending">Pending</span>
                    </div>
                    <div className="request-info">
                      <div className="request-item">
                        <span className="request-label">Employer ID:</span>
                        <span className="request-value">{request.employerId}</span>
                      </div>
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-secondary">No pending access requests.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terms Tab */}
      {activeTab === 'terms' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <div className="terms-header">
              <div>
                <h2>Academic Terms</h2>
                <p className="text-secondary">Manage your academic terms to ensure accurate work hour calculations.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setEditingTerm(null)
                  setTermForm({ name: '', startDate: '', endDate: '' })
                  setShowTermForm(true)
                }}
              >
                + Add Term
              </button>
            </div>

            {/* Term Form */}
            {showTermForm && (
              <div className="term-form-card">
                <h3>{editingTerm ? 'Edit Term' : 'Create New Term'}</h3>
                <form onSubmit={editingTerm ? handleUpdateTerm : handleCreateTerm} className="term-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="termName">
                      Term Name *
                    </label>
                    <select
                      id="termName"
                      className="form-input"
                      value={termForm.name}
                      onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                      required={!editingTerm}
                    >
                      <option value="">Select term</option>
                      <option value="AUTUMN">Autumn</option>
                      <option value="SPRING">Spring</option>
                      <option value="SUMMER">Summer</option>
                    </select>
                    <small className="form-hint">Select the term name (Autumn, Spring, or Summer)</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="startDate">
                      Start Date *
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      className="form-input"
                      value={termForm.startDate}
                      onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                      required={!editingTerm}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="endDate">
                      End Date *
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      className="form-input"
                      value={termForm.endDate}
                      onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                      required={!editingTerm}
                      min={termForm.startDate || undefined}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submittingTerm}
                    >
                      {submittingTerm ? 'Saving...' : (editingTerm ? 'Update Term' : 'Create Term')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelTermForm}
                      disabled={submittingTerm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Templates Section */}
            {templates.length > 0 && !showTermForm && (
              <div className="templates-section">
                <h3>University Term Templates</h3>
                <p className="text-secondary">Quickly create terms from your university's templates:</p>
                <div className="templates-list">
                  {templates.map((template) => (
                    <div key={template.id} className="template-card">
                      <div className="template-header">
                        <div className="template-name">{template.name}</div>
                        <div className="template-dates">
                          {formatDate(template.startDate)} - {formatDate(template.endDate)}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleCreateFromTemplate(template.id)}
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms List */}
            {terms.length > 0 ? (
              <div className="terms-list-section">
                <h3>Your Terms</h3>
                <div className="terms-list">
                  {terms
                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                    .map((term) => {
                      const status = getTermStatus(term)
                      return (
                        <div key={term.id} className={`term-card term-${status}`}>
                          <div className="term-header">
                            <div>
                              <div className="term-name">{term.name}</div>
                              <div className="term-dates">
                                {formatDate(term.startDate)} - {formatDate(term.endDate)}
                              </div>
                            </div>
                            <span className={`term-status-badge status-${status}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </div>
                          <div className="term-actions">
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEditTerm(term)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteTerm(term.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : (
              !showTermForm && (
                <div className="empty-state">
                  <p className="text-secondary">No terms added yet.</p>
                  <p className="text-secondary">
                    Add terms to ensure accurate work hour calculations. UK universities typically have 3 terms per year: Autumn, Spring, and Summer.
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentDashboard
