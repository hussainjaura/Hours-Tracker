import { createContext } from 'react'

// this shares the in-page messages and the confirm box with every dashboard:
// it replaces the browser's own alert() and confirm() pop-ups:
const NoticeContext = createContext(null)

export default NoticeContext
