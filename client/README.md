# Work Hours Tracker - Frontend

React + Vite frontend application for the Work Hours Tracking System.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Routing
- **Axios** - HTTP client
- **CSS** - Styling (no framework, custom CSS with CSS variables)

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Layout.jsx
│   │   └── ProtectedRoute.jsx
│   ├── contexts/         # React contexts
│   │   └── AuthContext.jsx
│   ├── pages/            # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── StudentDashboard.jsx
│   │   └── EmployerDashboard.jsx
│   ├── services/         # API services
│   │   └── api.js
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## Getting Started

### Installation

```bash
cd client
npm install
```

### Environment Variables

Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=Work Hours Tracker
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

### ✅ Implemented

- Authentication (Login/Register)
- Protected routes with role-based access
- API client with interceptors
- Auth context for state management
- Basic layout with header
- Responsive design

### 🚧 In Progress

- Student Dashboard (view shifts, compliance)
- Employer Dashboard (log hours, view students)

## API Integration

The frontend communicates with the backend API through the `api.js` service file. All API calls are automatically:
- Authenticated with JWT tokens
- Error handled consistently
- Redirected to login on 401 errors

## Next Steps

1. Implement Student Dashboard
2. Implement Employer Dashboard
3. Add form validation
4. Add loading states
5. Add error boundaries
6. Add toast notifications
