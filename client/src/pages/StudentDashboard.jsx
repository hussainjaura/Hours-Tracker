import { useState, useEffect } from 'react'
import { studentAPI } from '../services/api'
import CreateProfileForm from '../components/CreateProfileForm'
import './Dashboard.css'

const StudentDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
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
    academicYear: '',
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
      const [profileRes, complianceRes, violationsRes, employersRes, requestsRes, termsRes, templatesRes] = await Promise.allSettled([
        studentAPI.getProfile().catch((err) => {
          // 404 is expected if profile doesn't exist yet
          if (err.status === 404 || err.response?.status === 404) {
            return null
          }
          throw err
        }),
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
      
      // Frontend validation: Check for required academic year
      if (!termForm.academicYear) {
        setError('Academic year is required. Please provide in format YYYY/YY or YY/YY (e.g., "2025/26" or "25/26")')
        setSubmittingTerm(false)
        return
      }

      // Frontend validation: Check for duplicate term in same academic year
      const termName = termForm.name.toUpperCase()
      const newStart = new Date(termForm.startDate)
      const newEnd = new Date(termForm.endDate)
      
      // Check for duplicate term name in same academic year
      const duplicateTerm = terms.find(term => {
        if (term.name.toUpperCase() !== termName) return false
        if (!term.academicYear) return false
        return term.academicYear === termForm.academicYear
      })
      
      if (duplicateTerm) {
        setError(`You already have a ${termName} term in academic year ${termForm.academicYear}. Each term (Autumn, Spring, Summer) can only be created once per academic year.`)
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
        academicYear: termForm.academicYear,
        startDate: termForm.startDate,
        endDate: termForm.endDate
      })
      
      setShowTermForm(false)
      setTermForm({ name: '', academicYear: '', startDate: '', endDate: '' })
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

      // Prompt for academic year (required)
      const academicYear = prompt('Please enter the academic year for this term (e.g., "2025/26" or "25/26"):')
      if (!academicYear || !academicYear.trim()) {
        setError('Academic year is required to create a term from template.')
        setSubmittingTerm(false)
        return
      }

      // Frontend validation: Check for duplicate term in same academic year
      const finalStartDate = customDates?.startDate || template.startDate
      const finalEndDate = customDates?.endDate || template.endDate
      const termName = template.name.toUpperCase()
      const newStart = new Date(finalStartDate)
      const newEnd = new Date(finalEndDate)
      
      // Check for duplicate term name in same academic year
      const duplicateTerm = terms.find(term => {
        if (term.name.toUpperCase() !== termName) return false
        if (!term.academicYear) return false
        return term.academicYear === academicYear.trim()
      })
      
      if (duplicateTerm) {
        setError(`You already have a ${termName} term in academic year ${academicYear.trim()}. Each term (Autumn, Spring, Summer) can only be created once per academic year.`)
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
      
      const data = { templateId, academicYear: academicYear.trim() }
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
      
      // Frontend validation: Check for required academic year if updating
      if (termForm.academicYear !== undefined && !termForm.academicYear) {
        setError('Academic year is required. Please provide in format YYYY/YY or YY/YY (e.g., "2025/26" or "25/26")')
        setSubmittingTerm(false)
        return
      }

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
      if (termForm.academicYear !== undefined) updateData.academicYear = termForm.academicYear
      if (termForm.startDate) updateData.startDate = termForm.startDate
      if (termForm.endDate) updateData.endDate = termForm.endDate
      
      await studentAPI.updateTerm(editingTerm.id, updateData)
      
      setShowTermForm(false)
      setEditingTerm(null)
      setTermForm({ name: '', academicYear: '', startDate: '', endDate: '' })
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

  const handleConfirmTerm = async (termId) => {
    if (!window.confirm('By confirming, you declare that the term dates you have entered are accurate and current. This confirmation is required for compliance purposes and creates an audit trail.')) {
      return
    }
    try {
      await studentAPI.confirmTerm(termId)
      alert('Term dates confirmed successfully. This has been recorded in the audit trail.')
      loadDashboardData()
    } catch (err) {
      setError(err.message || 'Failed to confirm term dates')
    }
  }

  const handleEditTerm = (term) => {
    setEditingTerm(term)
    setTermForm({
      name: term.name,
      academicYear: term.academicYear || '',
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

  // Helper function to determine if current date is in term time
  const isInTermTime = () => {
    const now = new Date()
    return terms.some(term => {
      const start = new Date(term.startDate)
      const end = new Date(term.endDate)
      return now >= start && now <= end
    })
  }

  // Get allowed hours based on term time status
  const getAllowedHours = () => {
    // Check if course has ended
    if (profile?.courseEndDate) {
      const courseEnd = new Date(profile.courseEndDate)
      if (new Date() > courseEnd) {
        return 0
      }
    }
    // 20 hours during term time, 40+ hours during holidays
    return isInTermTime() ? 20 : 40
  }

  // Get active term name if in term time
  const getActiveTerm = () => {
    const now = new Date()
    const activeTerm = terms.find(term => {
      const start = new Date(term.startDate)
      const end = new Date(term.endDate)
      return now >= start && now <= end
    })
    return activeTerm ? activeTerm.name : null
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

  // Calculate full-time work periods (gaps between terms)
  const calculateFullTimePeriods = () => {
    if (terms.length === 0) return []
    
    // Sort all terms by start date
    const sortedTerms = [...terms].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    const periods = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Find gaps between consecutive terms
    for (let i = 0; i < sortedTerms.length - 1; i++) {
      const currentTermEnd = new Date(sortedTerms[i].endDate)
      currentTermEnd.setHours(23, 59, 59, 999)
      
      const nextTermStart = new Date(sortedTerms[i + 1].startDate)
      nextTermStart.setHours(0, 0, 0, 0)
      
      // Gap starts the day after current term ends
      const gapStart = new Date(currentTermEnd)
      gapStart.setDate(gapStart.getDate() + 1)
      gapStart.setHours(0, 0, 0, 0)
      
      // Gap ends the day before next term starts
      const gapEnd = new Date(nextTermStart)
      gapEnd.setDate(gapEnd.getDate() - 1)
      gapEnd.setHours(23, 59, 59, 999)
      
      // Only add if there's at least one day gap
      if (gapStart <= gapEnd) {
        periods.push({
          startDate: gapStart,
          endDate: gapEnd,
          description: `Between ${sortedTerms[i].name} and ${sortedTerms[i + 1].name} terms`
        })
      }
    }
    
    // Check for period after last term
    const lastTermEnd = new Date(sortedTerms[sortedTerms.length - 1].endDate)
    lastTermEnd.setHours(23, 59, 59, 999)
    
    const afterLastStart = new Date(lastTermEnd)
    afterLastStart.setDate(afterLastStart.getDate() + 1)
    afterLastStart.setHours(0, 0, 0, 0)
    
    // Determine end date: use course end date if available, otherwise 1 year from last term end
    let periodEnd
    if (profile?.courseEndDate) {
      const courseEnd = new Date(profile.courseEndDate)
      courseEnd.setHours(23, 59, 59, 999)
      // Use course end date if it's after the last term end, otherwise use 1 year from last term end
      if (courseEnd > afterLastStart) {
        periodEnd = courseEnd
      } else {
        periodEnd = new Date(afterLastStart)
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }
    } else {
      periodEnd = new Date(afterLastStart)
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }
    
    // Only add if the period hasn't completely passed and start date is valid
    if (periodEnd > today && afterLastStart <= periodEnd) {
      periods.push({
        startDate: afterLastStart,
        endDate: periodEnd,
        description: `After ${sortedTerms[sortedTerms.length - 1].name} term`
      })
    }
    
    // Filter out periods that ended more than 6 months ago
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    
    return periods.filter(period => {
      const periodEndDate = new Date(period.endDate)
      return periodEndDate >= sixMonthsAgo
    }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
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
            <div className="stat-value">{getAllowedHours()}</div>
            <div className="stat-label">Allowed Hours/Week</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{isInTermTime() ? 'Term Time' : 'Holiday'}</div>
            <div className="stat-label">Current Status</div>
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
          {/* Welcome & Status Banner */}
          <div className={`overview-banner ${isInTermTime() ? 'banner-term-time' : 'banner-holiday'}`}>
            <div className="banner-content">
              <div className="banner-icon">
                {isInTermTime() ? '📚' : '🏖️'}
              </div>
              <div className="banner-text">
                <h2>
                  {isInTermTime() 
                    ? `Currently in ${getActiveTerm() || 'Term Time'}` 
                    : 'Currently on Holiday'}
                </h2>
                <p>
                  {isInTermTime()
                    ? 'Maximum 20 hours per week allowed during term time'
                    : 'Full-time work allowed - no weekly hour limit'}
                </p>
              </div>
              <div className="banner-stat">
                <div className="banner-stat-value">{getAllowedHours()}h</div>
                <div className="banner-stat-label">Allowed/Week</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="overview-stats-grid">
            <div className="overview-stat-card">
              <div className="stat-card-icon">⏰</div>
              <div className="stat-card-content">
                <div className="stat-card-value">{getAllowedHours()}h</div>
                <div className="stat-card-label">Weekly Limit</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-icon">📅</div>
              <div className="stat-card-content">
                <div className="stat-card-value">{terms.length}</div>
                <div className="stat-card-label">Academic Terms</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-icon">👔</div>
              <div className="stat-card-content">
                <div className="stat-card-value">{employers.filter(e => e.status === 'ACTIVE').length}</div>
                <div className="stat-card-label">Active Employers</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-icon">⚠️</div>
              <div className="stat-card-content">
                <div className="stat-card-value">{violations.length}</div>
                <div className="stat-card-label">Violations</div>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="overview-two-column">
            {/* Left Column */}
            <div className="overview-column">
              {/* Current Term Information */}
              {(() => {
                const activeTerm = terms.find(term => {
                  const now = new Date()
                  const start = new Date(term.startDate)
                  const end = new Date(term.endDate)
                  return now >= start && now <= end
                })
                
                return activeTerm ? (
                  <div className="dashboard-card">
                    <h3>Current Term</h3>
                    <div className="current-term-card">
                      <div className="current-term-header">
                        <div>
                          <div className="current-term-name">{activeTerm.name}</div>
                          {activeTerm.academicYear && (
                            <div className="current-term-year">Academic Year: {activeTerm.academicYear}</div>
                          )}
                        </div>
                        <span className="term-status-badge status-active">Active</span>
                      </div>
                      <div className="current-term-dates">
                        <div className="date-item">
                          <span className="date-label">Start:</span>
                          <span className="date-value">{formatDate(activeTerm.startDate)}</span>
                        </div>
                        <div className="date-item">
                          <span className="date-label">End:</span>
                          <span className="date-value">{formatDate(activeTerm.endDate)}</span>
                        </div>
                      </div>
                      {activeTerm.confirmedAt ? (
                        <div className="term-confirmation-status confirmed">
                          ✓ Term dates confirmed
                        </div>
                      ) : (
                        <div className="term-confirmation-status pending">
                          ⚠️ Term dates not confirmed
                        </div>
                      )}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Upcoming Terms */}
              {(() => {
                const upcomingTerms = terms
                  .filter(term => {
                    const now = new Date()
                    return new Date(term.startDate) > now
                  })
                  .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                  .slice(0, 3)

                return upcomingTerms.length > 0 ? (
                  <div className="dashboard-card">
                    <h3>Upcoming Terms</h3>
                    <div className="upcoming-terms-list">
                      {upcomingTerms.map(term => (
                        <div key={term.id} className="upcoming-term-item">
                          <div className="upcoming-term-info">
                            <div className="upcoming-term-name">{term.name}</div>
                            {term.academicYear && (
                              <div className="upcoming-term-year">{term.academicYear}</div>
                            )}
                            <div className="upcoming-term-date">
                              Starts: {formatDate(term.startDate)}
                            </div>
                          </div>
                          <span className="term-status-badge status-upcoming">Upcoming</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}
            </div>

            {/* Right Column */}
            <div className="overview-column">
              {/* Profile Summary */}
              {profile && (
                <div className="dashboard-card">
                  <h3>Profile Summary</h3>
                  <div className="profile-summary-list">
                    <div className="profile-summary-item">
                      <span className="summary-item-label">University ID</span>
                      <span className="summary-item-value">{profile.universityId}</span>
                    </div>
                    <div className="profile-summary-item">
                      <span className="summary-item-label">Visa Type</span>
                      <span className="summary-item-value">{profile.visaType}</span>
                    </div>
                    <div className="profile-summary-item">
                      <span className="summary-item-label">Course End Date</span>
                      <span className="summary-item-value">
                        {formatDate(profile.courseEndDate)}
                        {(() => {
                          const courseEnd = new Date(profile.courseEndDate)
                          const today = new Date()
                          if (courseEnd < today) {
                            return <span className="status-badge-small expired">Ended</span>
                          } else {
                            const daysRemaining = Math.ceil((courseEnd - today) / (1000 * 60 * 60 * 24))
                            return <span className="status-badge-small active">{daysRemaining} days</span>
                          }
                        })()}
                      </span>
                    </div>
                    {profile.maxWeeklyHours && (
                      <div className="profile-summary-item">
                        <span className="summary-item-label">Custom Limit</span>
                        <span className="summary-item-value">{profile.maxWeeklyHours}h/week</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Employers Summary */}
              {employers.length > 0 && (
                <div className="dashboard-card">
                  <h3>Employer Relationships</h3>
                  <div className="employers-summary-list">
                    {employers.slice(0, 3).map(rel => (
                      <div key={rel.id} className="employer-summary-item">
                        <div className="employer-summary-info">
                          <div className="employer-summary-status">
                            <span className={`status-badge-small status-${rel.status.toLowerCase()}`}>
                              {rel.status}
                            </span>
                          </div>
                          <div className="employer-summary-meta">
                            {rel.acknowledgedAt ? (
                              <span className="acknowledgement-badge-small">✓ Acknowledged</span>
                            ) : rel.status === 'ACTIVE' ? (
                              <span className="acknowledgement-badge-small pending">Pending Acknowledgement</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                    {employers.length > 3 && (
                      <div className="view-all-link" onClick={() => setActiveTab('employers')}>
                        View all {employers.length} employers →
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pending Requests */}
              {pendingRequests.length > 0 && (
                <div className="dashboard-card alert-card">
                  <h3>Action Required</h3>
                  <div className="alert-content">
                    <div className="alert-icon">🔔</div>
                    <div className="alert-text">
                      <strong>{pendingRequests.length} pending access request{pendingRequests.length > 1 ? 's' : ''}</strong>
                      <p>Employers are waiting for your approval</p>
                    </div>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setActiveTab('requests')}
                    >
                      Review
                    </button>
                  </div>
                </div>
              )}

              {/* Compliance Status */}
              <div className="dashboard-card">
                <h3>Compliance Status</h3>
                <div className={`compliance-status-overview ${violations.length === 0 ? 'compliant' : 'non-compliant'}`}>
                  <div className="compliance-icon-large">
                    {violations.length === 0 ? '✓' : '⚠'}
                  </div>
                  <div className="compliance-text">
                    <div className="compliance-title-large">
                      {violations.length === 0 ? 'All Compliant' : `${violations.length} Violation${violations.length > 1 ? 's' : ''}`}
                    </div>
                    <div className="compliance-description">
                      {violations.length === 0
                        ? 'You are compliant with all work hour regulations'
                        : 'Review violations in the Compliance tab'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                    <div className="compliance-details">You are currently compliant with all work hour compliance regulations.</div>
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
            <p className="text-secondary">Review and manage employer requests to access your compliance information.</p>
            
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
                <p className="text-secondary">Manage your academic terms to ensure accurate compliance calculations.</p>
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
                    <label className="form-label" htmlFor="academicYear">
                      Academic Year *
                    </label>
                    <input
                      id="academicYear"
                      type="text"
                      className="form-input"
                      value={termForm.academicYear}
                      onChange={(e) => setTermForm({ ...termForm, academicYear: e.target.value })}
                      placeholder="e.g., 2025/26 or 25/26"
                      pattern="\d{2,4}/\d{2}"
                      required={!editingTerm}
                    />
                    <small className="form-hint">Format: YYYY/YY or YY/YY (e.g., "2025/26" or "25/26"). Required to organize your terms by academic year.</small>
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
                {(() => {
                  // Group terms by academic year
                  const groupedTerms = {}
                  const noYearTerms = []
                  
                  terms.forEach(term => {
                    if (term.academicYear) {
                      if (!groupedTerms[term.academicYear]) {
                        groupedTerms[term.academicYear] = []
                      }
                      groupedTerms[term.academicYear].push(term)
                    } else {
                      noYearTerms.push(term)
                    }
                  })
                  
                  // Sort academic years (newest first)
                  const sortedYears = Object.keys(groupedTerms).sort((a, b) => {
                    // Extract start year from format "2025/26" or "25/26"
                    const aYear = a.length > 5 ? parseInt(a.split('/')[0]) : 2000 + parseInt(a.split('/')[0])
                    const bYear = b.length > 5 ? parseInt(b.split('/')[0]) : 2000 + parseInt(b.split('/')[0])
                    return bYear - aYear
                  })
                  
                  return (
                    <>
                      {sortedYears.map(year => (
                        <div key={year} className="academic-year-group">
                          <h4 className="academic-year-title">Academic Year {year}</h4>
                          <div className="terms-list">
                            {groupedTerms[year]
                              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                              .map((term) => {
                                const status = getTermStatus(term)
                                return (
                                  <div key={term.id} className={`term-card term-${status}`}>
                                    <div className="term-header">
                                      <div>
                                        <div className="term-name">{term.name}</div>
                                        <div className="term-academic-year">Academic Year: {term.academicYear || 'Not set'}</div>
                                        <div className="term-dates">
                                          {formatDate(term.startDate)} - {formatDate(term.endDate)}
                                        </div>
                                      </div>
                                      <div>
                                        <span className={`term-status-badge status-${status}`}>
                                          {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </span>
                                        {term.confirmedAt ? (
                                          <span className="confirmation-badge confirmed" style={{ marginLeft: '0.5rem' }}>
                                            ✓ Confirmed
                                          </span>
                                        ) : (
                                          <span className="confirmation-badge pending" style={{ marginLeft: '0.5rem' }}>
                                            ⚠️ Not Confirmed
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="term-actions">
                                      {!term.confirmedAt && (
                                        <button
                                          className="btn btn-primary btn-sm"
                                          onClick={() => handleConfirmTerm(term.id)}
                                        >
                                          Confirm Dates
                                        </button>
                                      )}
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
                      ))}
                      {noYearTerms.length > 0 && (
                        <div className="academic-year-group">
                          <h4 className="academic-year-title">Other Terms</h4>
                          <div className="terms-list">
                            {noYearTerms
                              .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                              .map((term) => {
                                const status = getTermStatus(term)
                                return (
                                  <div key={term.id} className={`term-card term-${status}`}>
                                    <div className="term-header">
                                      <div>
                                        <div className="term-name">{term.name}</div>
                                        <div className="term-academic-year">Academic Year: {term.academicYear || 'Not set'}</div>
                                        <div className="term-dates">
                                          {formatDate(term.startDate)} - {formatDate(term.endDate)}
                                        </div>
                                      </div>
                                      <div>
                                        <span className={`term-status-badge status-${status}`}>
                                          {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </span>
                                        {term.confirmedAt ? (
                                          <span className="confirmation-badge confirmed" style={{ marginLeft: '0.5rem' }}>
                                            ✓ Confirmed
                                          </span>
                                        ) : (
                                          <span className="confirmation-badge pending" style={{ marginLeft: '0.5rem' }}>
                                            ⚠️ Not Confirmed
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="term-actions">
                                      {!term.confirmedAt && (
                                        <button
                                          className="btn btn-primary btn-sm"
                                          onClick={() => handleConfirmTerm(term.id)}
                                        >
                                          Confirm Dates
                                        </button>
                                      )}
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
                      )}
                    </>
                  )
                })()}
              </div>
            ) : (
              !showTermForm && (
                <div className="empty-state">
                  <p className="text-secondary">No terms added yet.</p>
                  <p className="text-secondary">
                    Add terms to ensure accurate compliance calculations. UK universities typically have 3 terms per year: Autumn, Spring, and Summer.
                  </p>
                </div>
              )
            )}

            {/* Full-Time Work Periods Section */}
            {terms.length > 0 && (() => {
              const fullTimePeriods = calculateFullTimePeriods()
              return fullTimePeriods.length > 0 ? (
                <div className="full-time-periods-section">
                  <h3>Full-Time Work Allowed Periods</h3>
                  <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
                    During these periods (outside term times), you are allowed to work full-time with no weekly hour limit.
                  </p>
                  <div className="full-time-periods-list">
                    {fullTimePeriods.map((period, index) => {
                      const periodStart = new Date(period.startDate)
                      const periodEnd = new Date(period.endDate)
                      const today = new Date()
                      const isCurrent = today >= periodStart && today <= periodEnd
                      const isPast = today > periodEnd
                      
                      return (
                        <div 
                          key={index} 
                          className={`full-time-period-card ${isCurrent ? 'current' : isPast ? 'past' : 'upcoming'}`}
                        >
                          <div className="full-time-period-header">
                            <div className="full-time-period-icon">
                              {isCurrent ? '✓' : '📅'}
                            </div>
                            <div className="full-time-period-content">
                              <div className="full-time-period-dates">
                                {formatDate(period.startDate)} - {formatDate(period.endDate)}
                              </div>
                              <div className="full-time-period-description">
                                {period.description}
                              </div>
                            </div>
                            <div className="full-time-period-badge">
                              {isCurrent ? (
                                <span className="badge-current">Current Period</span>
                              ) : isPast ? (
                                <span className="badge-past">Past</span>
                              ) : (
                                <span className="badge-upcoming">Upcoming</span>
                              )}
                            </div>
                          </div>
                          <div className="full-time-period-message">
                            <strong>✓ Full-time work allowed</strong> - No weekly hour limit during this period
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : null
            })()}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>My Profile</h2>
            <p className="text-secondary">View your student profile information and compliance details.</p>
            
            {profile ? (
              <div className="profile-details">
                <div className="profile-section">
                  <h3>Personal Information</h3>
                  <div className="profile-info-grid">
                    <div className="profile-info-item">
                      <div className="profile-info-label">University ID</div>
                      <div className="profile-info-value">{profile.universityId}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Visa Type</div>
                      <div className="profile-info-value">{profile.visaType}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">Course End Date</div>
                      <div className="profile-info-value">
                        {formatDate(profile.courseEndDate)}
                        {(() => {
                          const courseEnd = new Date(profile.courseEndDate)
                          const today = new Date()
                          if (courseEnd < today) {
                            return <span className="profile-status-badge expired">Course Ended</span>
                          } else {
                            const daysRemaining = Math.ceil((courseEnd - today) / (1000 * 60 * 60 * 24))
                            return <span className="profile-status-badge active">{daysRemaining} days remaining</span>
                          }
                        })()}
                      </div>
                    </div>
                    {profile.maxWeeklyHours && (
                      <div className="profile-info-item">
                        <div className="profile-info-label">Custom Weekly Hour Limit</div>
                        <div className="profile-info-value">{profile.maxWeeklyHours} hours/week</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Compliance Rules</h3>
                  <div className="profile-rules">
                    <div className="rule-card">
                      <div className="rule-icon">📚</div>
                      <div className="rule-content">
                        <div className="rule-title">During Term Time</div>
                        <div className="rule-description">Maximum 20 hours per week allowed</div>
                      </div>
                      <div className="rule-hours">20h/week</div>
                    </div>
                    <div className="rule-card">
                      <div className="rule-icon">🏖️</div>
                      <div className="rule-content">
                        <div className="rule-title">Outside Term Time (Holidays)</div>
                        <div className="rule-description">Full-time work allowed (no weekly limit)</div>
                      </div>
                      <div className="rule-hours">40h+/week</div>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Current Status</h3>
                  <div className="profile-status-grid">
                    <div className="status-card">
                      <div className="status-label">Current Period</div>
                      <div className={`status-value ${isInTermTime() ? 'term-time' : 'holiday'}`}>
                        {isInTermTime() ? 'Term Time' : 'Holiday'}
                      </div>
                      {getActiveTerm() && (
                        <div className="status-detail">Active Term: {getActiveTerm()}</div>
                      )}
                    </div>
                    <div className="status-card">
                      <div className="status-label">Allowed Hours This Week</div>
                      <div className="status-value">{getAllowedHours()}h</div>
                      <div className="status-detail">
                        {isInTermTime() 
                          ? '20-hour limit applies during term time' 
                          : 'Full-time work allowed during holidays'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Profile Created</h3>
                  <div className="profile-meta">
                    <div className="meta-item">
                      <span className="meta-label">Created:</span>
                      <span className="meta-value">{formatDate(profile.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-secondary">No profile found. Please create your profile first.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <AuditTrailTab 
          profile={profile}
        />
      )}
    </div>
  )
}

// Audit Trail Tab Component
const AuditTrailTab = ({ profile, onExport }) => {
  const [auditTrail, setAuditTrail] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadAuditData()
  }, [])

  const loadAuditData = async () => {
    try {
      setLoading(true)
      setError('')
      const [trailRes, logsRes] = await Promise.allSettled([
        studentAPI.getAuditTrail().catch(() => null),
        studentAPI.getAuditLogs().catch(() => ({ data: [] })),
      ])

      if (trailRes.status === 'fulfilled' && trailRes.value?.data) {
        setAuditTrail(trailRes.value.data)
      }

      if (logsRes.status === 'fulfilled' && logsRes.value?.data) {
        setAuditLogs(logsRes.value.data)
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportAuditPack = async (format = 'json') => {
    try {
      setExporting(true)
      const response = await studentAPI.exportAuditPack(format)
      
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
      link.download = `audit-pack-${profile?.universityId || 'student'}-${Date.now()}.${extension}`
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
          <p>Loading audit trail...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-card">
        <div className="audit-header">
          <div>
            <h2>Compliance Audit Trail</h2>
            <p className="text-secondary">
              Complete record of your compliance declarations, confirmations, and audit history for Home Office compliance.
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
              onClick={() => handleExportAuditPack('pdf')}
              disabled={exporting}
              title="Export as PDF document - Ready for Home Office submission"
            >
              {exporting ? 'Exporting...' : '📄 Export PDF'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleExportAuditPack('json')}
              disabled={exporting}
              title="Export as JSON file - Machine-readable format"
            >
              {exporting ? 'Exporting...' : '📥 Export JSON'}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {auditTrail ? (
          <>
            {/* Layer 1: Identity & Context */}
            <div className="audit-section">
              <h3>1. Identity & Context</h3>
              <div className="audit-identity-grid">
                <div className="audit-identity-item">
                  <div className="identity-label">Student Name</div>
                  <div className="identity-value">{auditTrail.identity?.studentName || profile?.universityId || 'N/A'}</div>
                </div>
                <div className="audit-identity-item">
                  <div className="identity-label">University ID</div>
                  <div className="identity-value">{auditTrail.identity?.universityId || profile?.universityId || 'N/A'}</div>
                </div>
                <div className="audit-identity-item">
                  <div className="identity-label">Visa Type</div>
                  <div className="identity-value">{auditTrail.identity?.visaType || profile?.visaType || 'N/A'}</div>
                </div>
                <div className="audit-identity-item">
                  <div className="identity-label">Course End Date</div>
                  <div className="identity-value">{formatDate(auditTrail.identity?.courseEndDate || profile?.courseEndDate)}</div>
                </div>
              </div>
            </div>

            {/* Layer 2: Term Declarations */}
            <div className="audit-section">
              <h3>2. Term Date Declarations</h3>
              {auditTrail.declarations && auditTrail.declarations.length > 0 ? (
                <div className="audit-declarations-list">
                  {auditTrail.declarations.map((decl, idx) => (
                    <div key={idx} className="audit-declaration-card">
                      <div className="declaration-header">
                        <div>
                          <div className="declaration-term-name">{decl.term.name} Term</div>
                          <div className="declaration-academic-year">{decl.term.academicYear}</div>
                        </div>
                        {decl.confirmedAt ? (
                          <span className="badge badge-success">✓ Confirmed</span>
                        ) : (
                          <span className="badge badge-warning">Pending Confirmation</span>
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
                      {decl.declarationText && (
                        <div className="declaration-text">
                          <strong>Declaration:</strong> "{decl.declarationText}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="text-secondary">No term declarations yet.</p>
                </div>
              )}
            </div>

            {/* Layer 3: Employer Acknowledgements */}
            <div className="audit-section">
              <h3>3. Employer Acknowledgements</h3>
              {auditTrail.acknowledgements && auditTrail.acknowledgements.length > 0 ? (
                <div className="audit-acknowledgements-list">
                  {auditTrail.acknowledgements.map((ack, idx) => (
                    <div key={idx} className="audit-acknowledgement-card">
                      <div className="acknowledgement-header">
                        <div>
                          <div className="acknowledgement-employer">Employer ID: {ack.employerId}</div>
                          <div className="acknowledgement-date">Acknowledged: {formatDate(ack.acknowledgedAt)}</div>
                        </div>
                        <span className="badge badge-success">✓ Acknowledged</span>
                      </div>
                      {ack.acknowledgementText && (
                        <div className="acknowledgement-text">
                          <strong>Employer Statement:</strong> "{ack.acknowledgementText}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p className="text-secondary">No employer acknowledgements yet.</p>
                </div>
              )}
            </div>

            {/* Layer 4: Compliance Rules */}
            <div className="audit-section">
              <h3>4. System-Generated Compliance Rules</h3>
              {auditTrail.complianceRules && auditTrail.complianceRules.length > 0 ? (
                <div className="audit-rules-list">
                  {auditTrail.complianceRules.map((rule, idx) => (
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
                          {rule.complianceRule.inTermTime !== undefined && (
                            <div className="rule-detail-item">
                              <span className="rule-detail-label">Term Time Status:</span>
                              <span className="rule-detail-value">{rule.complianceRule.inTermTime ? 'Term Time' : 'Holiday Period'}</span>
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
              {auditTrail.changeHistory && auditTrail.changeHistory.length > 0 ? (
                <div className="audit-changes-list">
                  {auditTrail.changeHistory.map((change, idx) => (
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
              <p className="text-secondary">All audit events in chronological order.</p>
              {auditLogs.length > 0 ? (
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
                      {auditLogs.map((log) => (
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
            <p className="text-secondary">No audit trail data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard
