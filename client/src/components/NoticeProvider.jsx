import { useCallback, useEffect, useRef, useState } from 'react'
import NoticeContext from '../contexts/NoticeContext'
import './Notice.css'

// this shows small messages in the corner and a confirm box in the middle of the page:
const NoticeProvider = ({ children }) => {
  const [notice, setNotice] = useState(null)
  const [confirmBox, setConfirmBox] = useState(null)
  const hideTimer = useRef(null)
  const confirmButton = useRef(null)

  // this shows a message for a few seconds, type is 'success' or 'error':
  const showNotice = useCallback((message, type = 'success') => {
    clearTimeout(hideTimer.current)
    setNotice({ message, type })
    // errors stay a little longer so there is time to read them:
    hideTimer.current = setTimeout(() => setNotice(null), type === 'error' ? 7000 : 4000)
  }, [])

  // this opens the confirm box and waits for the answer, like: if (await confirmAction({...})):
  const confirmAction = useCallback(({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) => {
    return new Promise((resolve) => {
      setConfirmBox({ title, message, confirmLabel, cancelLabel, danger, resolve })
    })
  }, [])

  // this closes the confirm box and sends back true (confirmed) or false (cancelled):
  const answer = (value) => {
    confirmBox?.resolve(value)
    setConfirmBox(null)
  }

  // this lets the Escape key cancel, and puts the keyboard focus on the confirm button:
  useEffect(() => {
    if (!confirmBox) return
    confirmButton.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') answer(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmBox])

  // this clears the timer if the page closes while a message is showing:
  useEffect(() => () => clearTimeout(hideTimer.current), [])

  return (
    <NoticeContext.Provider value={{ showNotice, confirmAction }}>
      {children}

      {/* the message in the corner, read out by screen readers too: */}
      {notice && (
        <div className={`notice-toast notice-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span className="notice-toast-text">{notice.message}</span>
          <button type="button" className="notice-toast-close" aria-label="Close message" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      {/* the confirm box, clicking the dark background cancels it: */}
      {confirmBox && (
        <div className="confirm-overlay" role="presentation" onClick={() => answer(false)}>
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-dialog-title">{confirmBox.title}</h3>
            <p className="confirm-dialog-message">{confirmBox.message}</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="btn btn-secondary" onClick={() => answer(false)}>
                {confirmBox.cancelLabel}
              </button>
              <button
                type="button"
                ref={confirmButton}
                className={`btn btn-primary ${confirmBox.danger ? 'confirm-dialog-danger' : ''}`}
                onClick={() => answer(true)}
              >
                {confirmBox.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NoticeContext.Provider>
  )
}

export default NoticeProvider
