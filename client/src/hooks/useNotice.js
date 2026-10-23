import { useContext } from 'react'
import NoticeContext from '../contexts/NoticeContext'

// this gives a page showNotice() for messages and confirmAction() for "are you sure?" questions:
export const useNotice = () => {
  const context = useContext(NoticeContext)
  if (!context) {
    throw new Error('useNotice must be used within NoticeProvider')
  }
  return context
}
