import { createContext } from 'react'

// Shares the dashboard drawer's open/closed state between Layout (which
// renders the ☰ button in the navbar) and the dashboard page (which renders
// the drawer itself, because the drawer links switch that page's tabs).
const MobileNavContext = createContext(null)

export default MobileNavContext
