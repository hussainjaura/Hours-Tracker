import { createContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load user from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
      try {
        const parsedUser = JSON.parse(savedUser)
        if (parsedUser && typeof parsedUser === 'object') {
          setUser(parsedUser)
          // Verify token is still valid
          fetchUser()
        } else {
          logout()
        }
      } catch (err) {
        console.error('Error parsing saved user:', err)
        logout()
      }
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await authAPI.getMe()
      const userData = response.data
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      setError(null)
    } catch (err) {
      console.error('Error fetching user:', err)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      const response = await authAPI.login(email, password)
      const { token, user: userData } = response.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      
      return { success: true }
    } catch (err) {
      setError(err.message || 'Login failed')
      return { success: false, error: err.message }
    }
  }

  const register = async (registrationData) => {
    try {
      setError(null)
      const response = await authAPI.register(registrationData)
      const { token, user: userData } = response.data
      
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      
      return { success: true, data: response.data }
    } catch (err) {
      setError(err.message || 'Registration failed')
      return { success: false, error: err.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setError(null)
  }

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    // this reloads the user from the server, for example right after they verify their email:
    refreshUser: fetchUser,
    isAuthenticated: !!user,
    isStudent: user?.role === 'STUDENT',
    isEmployer: user?.role === 'EMPLOYER',
    isAdmin: user?.role === 'ADMIN',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Export context for useAuth hook
export default AuthContext
