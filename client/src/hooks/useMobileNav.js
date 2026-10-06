import { useContext } from 'react'
import MobileNavContext from '../contexts/MobileNavContext'

export const useMobileNav = () => {
  const context = useContext(MobileNavContext)
  if (!context) {
    throw new Error('useMobileNav must be used within Layout')
  }
  return context
}
