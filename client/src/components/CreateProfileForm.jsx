import { useState } from 'react'
import { studentAPI } from '../services/api'
import './CreateProfileForm.css'

const CreateProfileForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    universityId: '',
    visaType: '',
    courseEndDate: '',
    maxWeeklyHours: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const visaTypes = [
    { value: 'Student Visa (Tier 4)', label: 'Student Visa (Tier 4)' },
    { value: 'Graduate Route Visa', label: 'Graduate Route Visa' },
    { value: 'Skilled Worker Visa', label: 'Skilled Worker Visa' },
    { value: 'Other', label: 'Other' }
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Prepare data for API
      const submitData = {
        universityId: formData.universityId.trim(),
        visaType: formData.visaType,
        courseEndDate: formData.courseEndDate,
      }

      // Add maxWeeklyHours only if provided
      if (formData.maxWeeklyHours && formData.maxWeeklyHours.trim() !== '') {
        const hours = parseFloat(formData.maxWeeklyHours)
        if (isNaN(hours) || hours < 1 || hours > 168) {
          setError('Maximum weekly hours must be between 1 and 168')
          setLoading(false)
          return
        }
        submitData.maxWeeklyHours = hours
      }

      // Validate required fields
      if (!submitData.universityId) {
        setError('University ID is required')
        setLoading(false)
        return
      }

      if (!submitData.visaType) {
        setError('Visa type is required')
        setLoading(false)
        return
      }

      if (!submitData.courseEndDate) {
        setError('Course end date is required')
        setLoading(false)
        return
      }

      // Validate course end date is in the future
      const endDate = new Date(submitData.courseEndDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (endDate <= today) {
        setError('Course end date must be in the future')
        setLoading(false)
        return
      }

      // Submit to API
      const response = await studentAPI.createProfile(submitData)

      // Success - reload dashboard data
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      // Handle different error types
      // The API interceptor transforms errors, so we check both formats
      let errorMessage = 'Failed to create profile. Please try again.'
      
      // Check transformed error format (from API interceptor)
      if (err.status === 403) {
        errorMessage = 'Access denied. Please make sure you are logged in as a student and your session is valid.'
      } else if (err.status === 409) {
        errorMessage = 'Profile already exists. Please refresh the page.'
      } else if (err.message) {
        errorMessage = err.message
      } 
      // Fallback to original axios error format
      else if (err.response) {
        if (err.response.status === 403) {
          errorMessage = 'Access denied. Please make sure you are logged in as a student.'
        } else if (err.response.status === 409) {
          errorMessage = 'Profile already exists. Please refresh the page.'
        } else if (err.response.data?.error) {
          errorMessage = typeof err.response.data.error === 'string' 
            ? err.response.data.error 
            : err.response.data.error.message || errorMessage
        }
      }
      
      setError(errorMessage)
      console.error('Profile creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calculate max date (e.g., 10 years from now)
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 10)
  const maxDateString = maxDate.toISOString().split('T')[0]

  // Calculate min date (today)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="create-profile-container">
      <div className="create-profile-card">
        <div className="create-profile-header">
          <h1>Create Your Student Profile</h1>
          <p className="create-profile-subtitle">
            Complete your profile to start tracking your work hours and ensure compliance with UK visa regulations.
          </p>
        </div>

        {error && (
          <div className="create-profile-error">
            {error}
            <button onClick={() => setError('')} className="error-close">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-profile-form">
          <div className="form-group">
            <label htmlFor="universityId" className="form-label">
              University ID <span className="required">*</span>
            </label>
            <input
              id="universityId"
              name="universityId"
              type="text"
              className="form-input"
              value={formData.universityId}
              onChange={handleChange}
              required
              placeholder="Enter your university student ID"
              disabled={loading}
            />
            <small className="form-hint">
              This is your unique student identifier at your university
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="visaType" className="form-label">
              Visa Type <span className="required">*</span>
            </label>
            <select
              id="visaType"
              name="visaType"
              className="form-input"
              value={formData.visaType}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="">Select your visa type</option>
              {visaTypes.map((visa) => (
                <option key={visa.value} value={visa.value}>
                  {visa.label}
                </option>
              ))}
            </select>
            <small className="form-hint">
              Select the type of UK visa you currently hold
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="courseEndDate" className="form-label">
              Course End Date <span className="required">*</span>
            </label>
            <input
              id="courseEndDate"
              name="courseEndDate"
              type="date"
              className="form-input"
              value={formData.courseEndDate}
              onChange={handleChange}
              required
              min={minDate}
              max={maxDateString}
              disabled={loading}
            />
            <small className="form-hint">
              The expected end date of your course or studies in the UK
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="maxWeeklyHours" className="form-label">
              Maximum Weekly Hours (Optional)
            </label>
            <input
              id="maxWeeklyHours"
              name="maxWeeklyHours"
              type="number"
              step="0.5"
              min="1"
              max="168"
              className="form-input"
              value={formData.maxWeeklyHours}
              onChange={handleChange}
              placeholder="e.g., 20"
              disabled={loading}
            />
            <small className="form-hint">
              Optional: Set a custom maximum weekly work hours limit (1-168 hours). 
              If not specified, default visa rules will apply.
            </small>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={loading}
            >
              {loading ? 'Creating Profile...' : 'Create Profile'}
            </button>
          </div>

          <div className="form-footer">
            <p className="form-footer-text">
              <strong>Note:</strong> You can only create your profile once. 
              Please ensure all information is accurate before submitting.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateProfileForm
