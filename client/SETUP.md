# Frontend Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd client
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Or create .env manually with:
   VITE_API_URL=http://localhost:4000
   VITE_APP_NAME=Work Hours Tracker
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Layout.jsx       # Main layout with header
│   │   └── ProtectedRoute.jsx  # Route protection
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.jsx  # Authentication state
│   ├── pages/               # Page components
│   │   ├── Login.jsx        # Login page
│   │   ├── Register.jsx    # Registration page
│   │   ├── StudentDashboard.jsx  # Student dashboard (placeholder)
│   │   └── EmployerDashboard.jsx # Employer dashboard (placeholder)
│   ├── services/            # API services
│   │   └── api.js          # Axios instance & API endpoints
│   ├── App.jsx             # Main app component with routes
│   ├── main.jsx            # Entry point
│   └── index.css           # Global styles
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
└── package.json           # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features Implemented

✅ **Authentication System**
- Login page with email/password
- Registration page with role selection
- JWT token management
- Protected routes based on user role
- Auto-redirect based on user role after login

✅ **API Integration**
- Axios instance with interceptors
- Automatic token injection
- Error handling
- Consistent error format

✅ **UI Components**
- Responsive layout
- Modern design with CSS variables
- Form components
- Loading states

## Next Steps

1. Implement Student Dashboard
   - View work shifts
   - View compliance summary
   - Confirm/reject shifts

2. Implement Employer Dashboard
   - Log work hours
   - View students
   - Request access to students

3. Add Features
   - Form validation
   - Toast notifications
   - Loading spinners
   - Error boundaries

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, Vite will automatically use the next available port.

### CORS Issues
Make sure your backend server is running on `http://localhost:4000` and CORS is enabled.

### API Connection Issues
Check that:
1. Backend server is running
2. `VITE_API_URL` in `.env` matches your backend URL
3. Backend CORS allows requests from `http://localhost:3000`
