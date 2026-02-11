import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    
    // Handle both old and new error formats
    let errorMessage = 'An error occurred'
    
    // New error format: { success: false, error: { message: "...", code: "..." } }
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message
    }
    // Old error format: { error: "..." }
    else if (error.response?.data?.error && typeof error.response.data.error === 'string') {
      errorMessage = error.response.data.error
    }
    // Fallback to axios error message
    else if (error.message) {
      errorMessage = error.message
    }
    
    // Return error with consistent format
    return Promise.reject({
      message: errorMessage,
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      status: error.response?.status || 500,
      requestId: error.response?.data?.error?.requestId || null,
      details: error.response?.data?.error?.details || null,
      // Preserve original response for accessing nested data
      response: error.response,
      // Preserve relationship data if present
      relationship: error.response?.data?.relationship || error.response?.data?.error?.relationship || null,
    })
  }
)

// Auth endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (registrationData) => api.post('/auth/register', registrationData),
  getMe: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
}

// Student endpoints
export const studentAPI = {
  createProfile: (data) => api.post('/students/profile', data),
  getProfile: () => api.get('/students/profile'),
  getComplianceSummary: () => api.get('/compliance/weekly-summary/me'),
  getViolations: () => api.get('/compliance/violations/me'),
  getEmployers: () => api.get('/relationships/my-employers'),
  getRequests: () => api.get('/relationships/requests'),
  acceptRequest: (relationshipId) => api.put(`/relationships/${relationshipId}/accept`),
  rejectRequest: (relationshipId) => api.put(`/relationships/${relationshipId}/reject`),
  deactivateRelationship: (relationshipId) => api.put(`/relationships/${relationshipId}/deactivate`),
  getTerms: () => api.get('/terms/me'),
  createTerm: (data) => api.post('/terms', data),
  updateTerm: (termId, data) => api.put(`/terms/${termId}`, data),
  deleteTerm: (termId) => api.delete(`/terms/${termId}`),
  confirmTerm: (termId) => api.put(`/terms/${termId}/confirm`),
  deleteAllTerms: () => api.delete('/terms/me'),
  getTemplates: () => api.get('/terms/templates/me'),
  createTermFromTemplate: (data) => api.post('/terms/from-template', data),
  downloadTermLetterPDF: async () => {
    const response = await api.get('/terms/letter/pdf', {
      responseType: 'blob',
    });
    // response.data is already a Blob when responseType is 'blob'
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `term-letter-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  // Audit trail endpoints
  getAuditTrail: () => api.get('/audit/my-audit-trail'),
  getAuditLogs: () => api.get('/audit/my-audit-logs'),
  exportAuditPack: (format = 'json') => api.get(`/audit-export/student?format=${format}`, { responseType: 'blob' }),
}

// Employer endpoints
export const employerAPI = {
  checkEligibility: (universityId, requestedHours) => 
    api.post('/employer/check-eligibility', { universityId, requestedHours }),
  requestAccess: (universityId) => api.post('/relationships/request', { studentUniversityId: universityId }),
  getStudents: () => api.get('/relationships/my-students'),
  getRequests: () => api.get('/relationships/requests'),
  searchStudent: (universityId) => api.get(`/students/${universityId}`),
  acknowledgeStudent: (relationshipId) => api.put(`/relationships/${relationshipId}/acknowledge`),
  // Profile endpoints
  getProfile: () => api.get('/employer/profile'),
  // Audit trail endpoints
  getRelationshipAuditTrail: (relationshipId) => api.get(`/audit/relationship/${relationshipId}`),
  getAllRelationshipAuditTrails: () => api.get('/audit/my-relationships'),
  exportRelationshipAuditPack: (relationshipId, format = 'json') => api.get(`/audit-export/relationship/${relationshipId}?format=${format}`, { responseType: 'blob' }),
  // Term letter download
  downloadStudentTermLetter: async (universityId) => {
    const response = await api.get(`/terms/letter/pdf/${universityId}`, {
      responseType: 'blob',
    });
    // response.data is already a Blob when responseType is 'blob'
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `term-letter-${universityId}-${new Date().toISOString().split('T')[0]}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
}

// Admin endpoints (if needed later)
export const adminAPI = {
  getAllStudents: () => api.get('/admin/students'),
  getUniversities: () => api.get('/admin/universities'),
  createUniversity: (data) => api.post('/admin/universities', data),
}

export default api
