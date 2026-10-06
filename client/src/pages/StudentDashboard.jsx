import { useState, useEffect, useRef } from 'react'
import { studentAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { useMobileNav } from '../hooks/useMobileNav'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const StudentDashboard = () => {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [complianceSummary, setComplianceSummary] = useState(null)
  const [employers, setEmployers] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [terms, setTerms] = useState([])
  const [templates, setTemplates] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const { mobileNavOpen, setMobileNavOpen } = useMobileNav()
  
  // Term form state
  const [showTermForm, setShowTermForm] = useState(false)
  const [editingTerm, setEditingTerm] = useState(null)
  const [termForm, setTermForm] = useState({
    courseLevel: 'DEGREE_OR_ABOVE', // Default to 20 hours for most degrees
    name: '',
    customName: '', // For custom term names
    academicYear: '',
    startDate: '',
    endDate: ''
  })
  const [isCustomTerm, setIsCustomTerm] = useState(false)
  const [submittingTerm, setSubmittingTerm] = useState(false)
  
  // Ref for scrolling to term form
  const termFormRef = useRef(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError('')

      // Load all data in parallel
      // Use Promise.allSettled to handle errors gracefully
      const [profileRes, complianceRes, employersRes, requestsRes, termsRes, templatesRes] = await Promise.allSettled([
        studentAPI.getProfile().catch((err) => {
          // 404 is expected if profile doesn't exist yet
          if (err.status === 404 || err.response?.status === 404) {
            return null
          }
          throw err
        }),
        studentAPI.getComplianceSummary().catch(() => null),
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
      const termName = isCustomTerm && termForm.customName 
        ? termForm.customName.toUpperCase().trim()
        : termForm.name.toUpperCase()
      
      if (!termName) {
        setError('Term name is required')
        setSubmittingTerm(false)
        return
      }
      
      const newStart = new Date(termForm.startDate)
      const newEnd = new Date(termForm.endDate)
      
      // Check for duplicate term name in same academic year
      const duplicateTerm = terms.find(term => {
        if (term.name.toUpperCase() !== termName) return false
        if (!term.academicYear) return false
        return term.academicYear === termForm.academicYear
      })
      
      if (duplicateTerm) {
        setError(`You already have a ${termName} term in academic year ${termForm.academicYear}. Each term can only be created once per academic year.`)
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
        courseLevel: termForm.courseLevel || 'DEGREE_OR_ABOVE',
        name: termName,
        academicYear: termForm.academicYear,
        startDate: termForm.startDate,
        endDate: termForm.endDate
      })
      
      setShowTermForm(false)
      setIsCustomTerm(false)
      setTermForm({ courseLevel: 'DEGREE_OR_ABOVE', name: '', customName: '', academicYear: '', startDate: '', endDate: '' })
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
      if (termForm.courseLevel !== undefined) updateData.courseLevel = termForm.courseLevel || null
      if (isCustomTerm && termForm.customName) {
        updateData.name = termForm.customName.toUpperCase().trim()
      } else if (termForm.name) {
        updateData.name = termForm.name.toUpperCase()
      }
      if (termForm.academicYear !== undefined) updateData.academicYear = termForm.academicYear
      if (termForm.startDate) updateData.startDate = termForm.startDate
      if (termForm.endDate) updateData.endDate = termForm.endDate
      
      await studentAPI.updateTerm(editingTerm.id, updateData)
      
      setShowTermForm(false)
      setEditingTerm(null)
      setIsCustomTerm(false)
      setTermForm({ courseLevel: '', name: '', customName: '', academicYear: '', startDate: '', endDate: '' })
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
    // Check if term name is custom (not AUTUMN, SPRING, or SUMMER)
    const standardTerms = ['AUTUMN', 'SPRING', 'SUMMER']
    const isCustom = term.name && !standardTerms.includes(term.name.toUpperCase())
    
    setIsCustomTerm(isCustom)
    setTermForm({
      courseLevel: term.courseLevel || '',
      name: isCustom ? '' : term.name,
      customName: isCustom ? term.name : '',
      academicYear: term.academicYear || '',
      startDate: term.startDate.split('T')[0],
      endDate: term.endDate.split('T')[0]
    })
    setShowTermForm(true)
    
    // Scroll to form after a brief delay to ensure it's rendered
    setTimeout(() => {
      if (termFormRef.current) {
        termFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  const handleCancelTermForm = () => {
    setShowTermForm(false)
    setEditingTerm(null)
    setIsCustomTerm(false)
    setTermForm({ courseLevel: '', name: '', customName: '', academicYear: '', startDate: '', endDate: '' })
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

  // Get active term object if in term time
  const getActiveTerm = () => {
    const now = new Date()
    const activeTerm = terms.find(term => {
      const start = new Date(term.startDate)
      const end = new Date(term.endDate)
      return now >= start && now <= end
    })
    return activeTerm || null
  }

  // Get allowed hours based on term time status and course level
  const getAllowedHours = () => {
    // Check if course has ended
    if (profile?.courseEndDate) {
      const courseEnd = new Date(profile.courseEndDate)
      if (new Date() > courseEnd) {
        return 0
      }
    }
    
    // If not in term time, full-time work allowed (40+ hours)
    if (!isInTermTime()) {
      return 40
    }
    
    // Get active term to check course level
    const activeTerm = getActiveTerm()
    if (!activeTerm) {
      return 20 // Default fallback
    }
    
    // Check course level: BELOW_DEGREE = 10 hours, DEGREE_OR_ABOVE or null = 20 hours
    if (activeTerm.courseLevel === 'BELOW_DEGREE') {
      return 10
    }
    
    // Default to 20 hours for DEGREE_OR_ABOVE or if courseLevel is null/undefined
    return 20
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

  // Show error if no profile exists (should be created during registration)
  if (!profile) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error" style={{ margin: '2rem' }}>
          <h2>Profile Not Found</h2>
          <p>Your student profile was not found. If you just registered, please refresh the page or contact support if the issue persists.</p>
          <p className="text-secondary" style={{ marginTop: '1rem' }}>
            Note: Student profiles are created during registration. If you see this message, there may have been an issue during account creation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {error && (
        <div className="dashboard-error">
          {error}
          <button onClick={() => setError('')} className="error-close">×</button>
        </div>
      )}

      {mobileNavOpen && (
        <div
          className="mobile-dashboard-drawer-overlay"
          role="presentation"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="mobile-dashboard-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mobile-dashboard-drawer-header">
              <div className="mobile-dashboard-drawer-title">
                <span className="brand-mark" aria-hidden="true">ISC</span>
                <span>Menu</span>
              </div>
              <button
                type="button"
                className="mobile-dashboard-drawer-close"
                aria-label="Close menu"
                onClick={() => setMobileNavOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="mobile-dashboard-drawer-nav">
              <button
                className={activeTab === 'overview' ? 'tab-active' : ''}
                onClick={() => { setActiveTab('overview'); setMobileNavOpen(false) }}
              >
                Overview
              </button>
              <button
                className={activeTab === 'employers' ? 'tab-active' : ''}
                onClick={() => { setActiveTab('employers'); setMobileNavOpen(false) }}
              >
                Employers
              </button>
              <button
                className={activeTab === 'requests' ? 'tab-active' : ''}
                onClick={() => { setActiveTab('requests'); setMobileNavOpen(false) }}
              >
                Access Requests
              </button>
              <button
                className={activeTab === 'terms' ? 'tab-active' : ''}
                onClick={() => { setActiveTab('terms'); setMobileNavOpen(false) }}
              >
                Terms
              </button>
              <button
                className={activeTab === 'profile' ? 'tab-active' : ''}
                onClick={() => { setActiveTab('profile'); setMobileNavOpen(false) }}
              >
                Profile
              </button>
              <button
                className={activeTab === 'audit' ? 'tab-active' : ''}
                onClick={() => { setActiveTab('audit'); setMobileNavOpen(false) }}
              >
                Audit Trail
              </button>

              <button
                onClick={() => { setMobileNavOpen(false); handleLogout() }}
                style={{ marginTop: '0.5rem' }}
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="mobile-dashboard-header">
        <div>
          <h1>Student Dashboard</h1>
          <p className="dashboard-subtitle">
            {profile.fullName && `${profile.fullName} • `}University ID: {profile.universityId}
          </p>
        </div>
        <div className="mobile-dashboard-stats">
          <div className="stat-box">
            <div className="stat-value">{getAllowedHours()}</div>
            <div className="stat-label">Allowed Hours/Week</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{isInTermTime() ? 'Term Time' : 'Holiday'}</div>
            <div className="stat-label">Current Status</div>
          </div>
        </div>
      </div>

      {/* Dashboard Header */}
      <div className="dashboard-page-header">
        <div>
          <h1>Student Dashboard</h1>
          <p className="dashboard-subtitle">
            {profile.fullName && `${profile.fullName} • `}University ID: {profile.universityId}
          </p>
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
        <div className="dashboard-content" style={{ minHeight: '400px' }}>
          {/* Pending Access Requests Alert - Prominent at top */}
          {pendingRequests.length > 0 && (
            <div 
              className="dashboard-card alert-card" 
              style={{ 
                backgroundColor: '#fef3c7', 
                border: '2px solid #f59e0b',
                cursor: 'pointer',
                marginBottom: '1.5rem'
              }}
              onClick={() => setActiveTab('requests')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#92400e' }}>
                    ⚠️ Pending Access Requests
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#92400e' }}>
                      {pendingRequests.length} employer{pendingRequests.length > 1 ? 's' : ''} {pendingRequests.length > 1 ? 'are' : 'is'} requesting access to your profile
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
                      Click here to review and respond →
                    </div>
                  </div>
                  {pendingRequests.length > 0 && pendingRequests[0]?.employer && (
                    <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#78350f' }}>
                      <strong>Latest request from:</strong> {pendingRequests[0].employer.organisationName || 'Unknown Organisation'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Welcome & Status Banner */}
          <div className={`overview-banner ${isInTermTime() ? 'banner-term-time' : 'banner-holiday'}`} style={{ display: 'block', visibility: 'visible' }}>
            <div className="banner-content">
              <div className="banner-text">
                <h2>
                  {(() => {
                    try {
                      return isInTermTime() 
                        ? `Currently in ${getActiveTerm()?.name || 'Term Time'}` 
                        : 'Currently on Holiday'
                    } catch (e) {
                      return 'Welcome to Your Dashboard'
                    }
                  })()}
                </h2>
                <p>
                  {(() => {
                    try {
                      return isInTermTime()
                        ? `Maximum ${getAllowedHours()} hours per week allowed during term time`
                        : 'Full-time work allowed - no weekly hour limit'
                    } catch (e) {
                      return 'View your work eligibility and term information below'
                    }
                  })()}
                </p>
              </div>
              <div className="banner-stat">
                <div className="banner-stat-value">
                  {(() => {
                    try {
                      return `${getAllowedHours()}h`
                    } catch (e) {
                      return '20h'
                    }
                  })()}
                </div>
                <div className="banner-stat-label">Allowed/Week</div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="overview-stats-grid">
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">{getAllowedHours()}h</div>
                <div className="stat-card-label">Weekly Limit</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">{terms.length}</div>
                <div className="stat-card-label">Academic Terms</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">{employers.filter(e => e.status === 'ACTIVE').length}</div>
                <div className="stat-card-label">Active Employers</div>
              </div>
            </div>
            <div className="overview-stat-card">
              <div className="stat-card-content">
                <div className="stat-card-value">{isInTermTime() ? 'Term Time' : 'Holiday'}</div>
                <div className="stat-card-label">Current Status</div>
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
                          Term dates confirmed
                        </div>
                      ) : (
                        <div className="term-confirmation-status pending">
                          Term dates not confirmed
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

              {/* Quick Actions */}
              <div className="dashboard-card">
                <h3>Quick Actions</h3>
                <div className="quick-actions-list">
                  <button
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveTab('terms')
                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
                    }}
                  >
                    <span className="action-text">Manage Terms</span>
                  </button>
                  <button
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveTab('requests')
                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
                    }}
                  >
                    <span className="action-text">Access Requests</span>
                  </button>
                  <button
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveTab('audit')
                      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
                    }}
                  >
                    <span className="action-text">Audit Trail</span>
                  </button>
                </div>
              </div>

              {/* Access Requests */}
              <div className="dashboard-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>Access Requests</h3>
                  {pendingRequests.length > 0 && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveTab('requests')}
                    >
                      View All →
                    </button>
                  )}
                </div>
                {pendingRequests.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pendingRequests.slice(0, 3).map((request) => (
                      <div key={request.id} style={{ 
                        padding: '1rem', 
                        backgroundColor: '#fef3c7', 
                        borderRadius: '8px',
                        border: '1px solid #f59e0b',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.25rem', color: '#92400e' }}>
                            {request.employer?.organisationName || 'Unknown Organisation'}
                          </div>
                          {request.employer?.fullName && (
                            <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
                              {request.employer.fullName}
                              {request.employer.role && ` • ${request.employer.role}`}
                            </div>
                          )}
                          {request.employer?.workEmail && (
                            <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
                              {request.employer.workEmail}
                            </div>
                          )}
                          <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '0.25rem' }}>
                            Requested: {formatDate(request.linkedAt)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleAcceptRequest(request.id)}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRejectRequest(request.id)}
                            style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingRequests.length > 3 && (
                      <div 
                        className="view-all-link" 
                        onClick={() => setActiveTab('requests')} 
                        style={{ marginTop: '0.5rem', textAlign: 'center', cursor: 'pointer', color: '#8b5cf6', fontWeight: '500' }}
                      >
                        View all {pendingRequests.length} requests →
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    backgroundColor: '#f9fafb', 
                    borderRadius: '8px',
                    border: '1px dashed #e5e7eb'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                    <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
                      No pending access requests
                    </p>
                    <p style={{ color: '#9ca3af', margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>
                      Employers will appear here when they request access to your profile
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="overview-column">
              {/* Profile Summary */}
              {profile && (
                <div className="dashboard-card">
                  <h3>Profile Summary</h3>
                  <div className="profile-summary-list">
                    {profile.fullName && (
                      <div className="profile-summary-item">
                        <span className="summary-item-label">Name</span>
                        <span className="summary-item-value">{profile.fullName}</span>
                      </div>
                    )}
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
                      <div key={rel.id} className="employer-summary-item" style={{ 
                        padding: '1rem', 
                        backgroundColor: '#f9fafb', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        marginBottom: '0.75rem'
                      }}>
                        <div className="employer-summary-info">
                          {rel.employer ? (
                            <>
                              <div style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                                  {rel.employer.organisationName || 'Unknown Organisation'}
                                </div>
                                {rel.employer.fullName && (
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    {rel.employer.fullName}
                                    {rel.employer.role && ` • ${rel.employer.role}`}
                                  </div>
                                )}
                                {rel.employer.workEmail && (
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                    {rel.employer.workEmail}
                                  </div>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                <span className={`status-badge-small status-${rel.status.toLowerCase()}`}>
                                  {rel.status}
                                </span>
                                {rel.acknowledgedAt ? (
                                  <span className="acknowledgement-badge-small">Acknowledged</span>
                                ) : rel.status === 'ACTIVE' ? (
                                  <span className="acknowledgement-badge-small pending">Pending Acknowledgement</span>
                                ) : null}
                              </div>
                            </>
                          ) : (
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                                Employer
                              </div>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span className={`status-badge-small status-${rel.status.toLowerCase()}`}>
                                  {rel.status}
                                </span>
                                {rel.acknowledgedAt ? (
                                  <span className="acknowledgement-badge-small">Acknowledged</span>
                                ) : rel.status === 'ACTIVE' ? (
                                  <span className="acknowledgement-badge-small pending">Pending Acknowledgement</span>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {employers.length > 3 && (
                      <div className="view-all-link" onClick={() => setActiveTab('employers')} style={{ marginTop: '0.5rem' }}>
                        View all {employers.length} employers →
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Work Eligibility & Rules */}
              <div className="dashboard-card">
                <h3>Work Eligibility & Rules</h3>
                <div className={`compliance-status-overview ${isInTermTime() ? 'term-time' : 'holiday'}`}>
                  <div className="compliance-text">
                    <div className="compliance-title-large">
                      {(() => {
                        if (profile?.courseEndDate && new Date(profile.courseEndDate) < new Date()) {
                          return 'Cannot Work'
                        }
                        return isInTermTime() ? 'Can Work - Term Time' : 'Can Work - Holiday Period'
                      })()}
                    </div>
                    <div className="compliance-description">
                      {(() => {
                        if (profile?.courseEndDate && new Date(profile.courseEndDate) < new Date()) {
                          return 'Your course has ended. You cannot work on a Student visa.'
                        }
                        return isInTermTime()
                          ? `Maximum ${getAllowedHours()} hours per week allowed during term time`
                          : 'Full-time work allowed - no weekly hour limit during holidays'
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="compliance-rules-section" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                  <h4 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600' }}>Compliance Rules</h4>
                  <div className="rules-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="rule-item" style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                      <strong>During Term Time:</strong> Maximum {getAllowedHours()} hours per week
                      {getActiveTerm()?.courseLevel === 'BELOW_DEGREE' && ' (10 hours for courses below degree level)'}
                      {(!getActiveTerm()?.courseLevel || getActiveTerm()?.courseLevel === 'DEGREE_OR_ABOVE') && ' (20 hours for degree level and above)'}
                    </div>
                    <div className="rule-item" style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                      <strong>Outside Term Time:</strong> Full-time allowed (no weekly limit)
                    </div>
                  </div>
                  {terms.length === 0 && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '0.875rem' }}>
                      <strong>Note:</strong> Add your term dates in the <button 
                        className="btn-link" 
                        onClick={() => setActiveTab('terms')}
                        style={{ textDecoration: 'underline', background: 'none', border: 'none', color: '#8b5cf6', cursor: 'pointer', padding: 0 }}
                      >Terms tab</button> to ensure accurate eligibility calculations.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
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
                        <div className="employer-name">
                          <strong>{rel.employer?.organisationName || 'Unknown Organisation'}</strong>
                        </div>
                        <div className="employer-details">
                          Manager: {rel.employer?.fullName || 'Unknown'} {rel.employer?.workEmail && `(${rel.employer.workEmail})`}
                        </div>
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
                        <span className="request-label">Organisation:</span>
                        <span className="request-value">{request.employer?.organisationName || 'Unknown Organisation'}</span>
                      </div>
                      <div className="request-item">
                        <span className="request-label">Manager:</span>
                        <span className="request-value">{request.employer?.fullName || 'Unknown'} {request.employer?.workEmail && `(${request.employer.workEmail})`}</span>
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
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {terms.length > 0 && (
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        await studentAPI.downloadTermLetterPDF()
                      } catch (err) {
                        setError(err.response?.data?.error || 'Failed to download term letter')
                      }
                    }}
                  >
                    📄 Download Term Letter
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingTerm(null)
                    setIsCustomTerm(false)
                    setTermForm({ courseLevel: 'DEGREE_OR_ABOVE', name: '', customName: '', academicYear: '', startDate: '', endDate: '' })
                    setShowTermForm(true)
                    
                    // Scroll to form after a brief delay to ensure it's rendered
                    setTimeout(() => {
                      if (termFormRef.current) {
                        termFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }, 100)
                  }}
                >
                  + Add Term
                </button>
              </div>
            </div>

            {/* Term Form */}
            {showTermForm && (
              <div className="term-form-card" ref={termFormRef}>
                <h3>{editingTerm ? 'Edit Term' : 'Create New Term'}</h3>
                <form onSubmit={editingTerm ? handleUpdateTerm : handleCreateTerm} className="term-form">
                  <div className="form-group">
                    <label className="form-label" htmlFor="courseLevel">
                      Course Level *
                    </label>
                    <select
                      id="courseLevel"
                      className="form-input"
                      value={termForm.courseLevel}
                      onChange={(e) => setTermForm({ ...termForm, courseLevel: e.target.value })}
                      required={!editingTerm}
                    >
                      <option value="">Select course level</option>
                      <option value="BELOW_DEGREE">Below Degree Level (10 hours/week during term-time)</option>
                      <option value="DEGREE_OR_ABOVE">Degree Level or Above (20 hours/week during term-time)</option>
                    </select>
                    <small className="form-hint">Select your course level to determine work hour limits during term-time</small>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="termName">
                      Term Name *
                    </label>
                    <select
                      id="termName"
                      className="form-input"
                      value={isCustomTerm ? 'CUSTOM' : termForm.name}
                      onChange={(e) => {
                        if (e.target.value === 'CUSTOM') {
                          setIsCustomTerm(true)
                          setTermForm({ ...termForm, name: '', customName: '' })
                        } else {
                          setIsCustomTerm(false)
                          setTermForm({ ...termForm, name: e.target.value, customName: '' })
                        }
                      }}
                      required={!editingTerm}
                    >
                      <option value="">Select term</option>
                      <option value="AUTUMN">Autumn</option>
                      <option value="SPRING">Spring</option>
                      <option value="SUMMER">Summer</option>
                      <option value="CUSTOM">Custom (Enter your own term name)</option>
                    </select>
                    {isCustomTerm && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={termForm.customName}
                          onChange={(e) => setTermForm({ ...termForm, customName: e.target.value })}
                          placeholder="Enter custom term name (e.g., Michaelmas, Hilary, Trinity)"
                          required={isCustomTerm && !editingTerm}
                          style={{ marginTop: '0.5rem' }}
                        />
                        <small className="form-hint" style={{ display: 'block', marginTop: '0.25rem' }}>
                          Enter your university's term name (e.g., Michaelmas, Hilary, Trinity, Lent, etc.)
                        </small>
                      </div>
                    )}
                    {!isCustomTerm && (
                      <small className="form-hint">Select the term name (Autumn, Spring, Summer, or Custom)</small>
                    )}
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
                                            Confirmed
                                          </span>
                                        ) : (
                                          <span className="confirmation-badge pending" style={{ marginLeft: '0.5rem' }}>
                                            Not Confirmed
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
                                            Confirmed
                                          </span>
                                        ) : (
                                          <span className="confirmation-badge pending" style={{ marginLeft: '0.5rem' }}>
                                            Not Confirmed
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
                            <strong>Full-time work allowed</strong> - No weekly hour limit during this period
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2>My Profile</h2>
                <p className="text-secondary">View your student profile information and compliance details.</p>
              </div>
              {terms.length > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      await studentAPI.downloadTermLetterPDF()
                    } catch (err) {
                      const errorMessage = err.response?.data?.error || err.message || 'Failed to download term letter'
                      alert(`Error: ${errorMessage}`)
                      setError(errorMessage)
                    }
                  }}
                >
                  📄 Download Term Letter
                </button>
              )}
            </div>
            
            {profile ? (
              <div className="profile-details">
                <div className="profile-section">
                  <h3>Personal Information</h3>
                  <div className="profile-info-grid">
                    {profile.fullName && (
                      <div className="profile-info-item">
                        <div className="profile-info-label">Full Name</div>
                        <div className="profile-info-value">{profile.fullName}</div>
                      </div>
                    )}
                    <div className="profile-info-item">
                      <div className="profile-info-label">University ID</div>
                      <div className="profile-info-value">{profile.universityId}</div>
                    </div>
                    <div className="profile-info-item">
                      <div className="profile-info-label">University Name</div>
                      <div className="profile-info-value">{profile.universityName || 'N/A'}</div>
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
                      <div className="rule-content">
                        <div className="rule-title">During Term Time</div>
                        <div className="rule-description">Maximum 20 hours per week allowed</div>
                      </div>
                      <div className="rule-hours">20h/week</div>
                    </div>
                    <div className="rule-card">
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
                        <div className="status-detail">Active Term: {getActiveTerm().name}</div>
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

                {/* Term Dates Section */}
                <div className="profile-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
                  <h3>Academic Term Dates</h3>
                  {terms.length > 0 ? (
                    <div>
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
                          const aYear = a.length > 5 ? parseInt(a.split('/')[0]) : 2000 + parseInt(a.split('/')[0])
                          const bYear = b.length > 5 ? parseInt(b.split('/')[0]) : 2000 + parseInt(b.split('/')[0])
                          return bYear - aYear
                        })
                        
                        return (
                          <>
                            {sortedYears.map(year => (
                              <div key={year} style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>
                                  Academic Year {year}
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {groupedTerms[year]
                                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                                    .map((term) => {
                                      const status = getTermStatus(term)
                                      return (
                                        <div key={term.id} style={{ 
                                          padding: '1rem', 
                                          backgroundColor: '#f9fafb', 
                                          borderRadius: '8px',
                                          border: '1px solid #e5e7eb'
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <div>
                                              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{term.name} Term</div>
                                              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                {formatDate(term.startDate)} - {formatDate(term.endDate)}
                                              </div>
                                            </div>
                                            <span className={`term-status-badge status-${status}`}>
                                              {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </span>
                                          </div>
                                          {term.confirmedAt && (
                                            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem' }}>
                                              ✓ Confirmed on {formatDate(term.confirmedAt)}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                </div>
                              </div>
                            ))}
                            {noYearTerms.length > 0 && (
                              <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: '#6b7280' }}>
                                  Other Terms
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                  {noYearTerms
                                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
                                    .map((term) => {
                                      const status = getTermStatus(term)
                                      return (
                                        <div key={term.id} style={{ 
                                          padding: '1rem', 
                                          backgroundColor: '#f9fafb', 
                                          borderRadius: '8px',
                                          border: '1px solid #e5e7eb'
                                        }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <div>
                                              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{term.name} Term</div>
                                              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                {formatDate(term.startDate)} - {formatDate(term.endDate)}
                                              </div>
                                            </div>
                                            <span className={`term-status-badge status-${status}`}>
                                              {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </span>
                                          </div>
                                          {term.confirmedAt && (
                                            <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem' }}>
                                              ✓ Confirmed on {formatDate(term.confirmedAt)}
                                            </div>
                                          )}
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
                    <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px', textAlign: 'center' }}>
                      <p className="text-secondary" style={{ marginBottom: '0.5rem' }}>No term dates added yet.</p>
                      <button 
                        className="btn btn-secondary btn-sm"
                        onClick={() => setActiveTab('terms')}
                      >
                        Add Term Dates
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-secondary">Profile information not available. If you just registered, please refresh the page.</p>
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
              {exporting ? 'Exporting...' : 'Export JSON'}
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
                  <div className="identity-value">{auditTrail.identity?.studentName || profile?.fullName || profile?.universityId || 'N/A'}</div>
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
                          <span className="badge badge-success">Confirmed</span>
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
                          <div className="acknowledgement-employer">
                            <strong>{ack.organisationName || 'Unknown Organisation'}</strong>
                          </div>
                          <div className="acknowledgement-employer-details">
                            Manager: {ack.employerName || 'Unknown'} {ack.workEmail && `(${ack.workEmail})`}
                          </div>
                          <div className="acknowledgement-date">Acknowledged: {formatDate(ack.acknowledgedAt)}</div>
                        </div>
                        <span className="badge badge-success">Acknowledged</span>
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

            {/* Layer 4: Change History */}
            <div className="audit-section">
              <h3>4. Change History</h3>
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
