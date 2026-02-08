# Critical Fixes - Quick Implementation Guide

## 🚨 Fix These Immediately (30-60 minutes)

### 1. Fix CORS Configuration

**File:** `server/src/app.js`

**Current:**
```javascript
app.use(cors());
```

**Replace with:**
```javascript
// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',')
      : ['http://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 2. Add Environment Variable Validation

**File:** `server/src/index.js`

**Replace entire file with:**
```javascript
// src/index.js
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

// Validate required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('ERROR: Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('\nPlease set these variables in your .env file.');
  process.exit(1);
}

// Don't log sensitive data in production
if (process.env.NODE_ENV !== 'production') {
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? '***configured***' : 'MISSING');
  console.log("JWT_SECRET:", process.env.JWT_SECRET ? '***configured***' : 'MISSING');
}

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${NODE_ENV})`);
  console.log(`Environment: ${NODE_ENV}`);
});
```

### 3. Create Environment Variable Examples

**File:** `server/.env.example`

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT Authentication (REQUIRED - Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# API Configuration
API_VERSION=1.0.0
NODE_ENV=development

# Server Configuration
PORT=4000

# Frontend URL (comma-separated for multiple origins)
FRONTEND_URL=http://localhost:3000

# Email Verification (Optional)
ENABLE_EMAIL_VERIFICATION=false
```

**File:** `client/.env.example`

```env
# API URL
VITE_API_URL=http://localhost:4000

# App Name
VITE_APP_NAME=RTW Compliance Audit
```

### 4. Update Package.json Scripts

**File:** `server/package.json`

**Add to scripts:**
```json
"scripts": {
  "start": "node src/index.js",
  "dev": "nodemon src/index.js",
  "start:prod": "NODE_ENV=production node src/index.js",
  "build": "prisma generate",
  "migrate:deploy": "prisma migrate deploy",
  "migrate:dev": "prisma migrate dev"
}
```

---

## ⚠️ Important Notes

1. **JWT_SECRET**: Generate a strong random string for production:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **FRONTEND_URL**: In production, set this to your actual frontend URL:
   ```env
   FRONTEND_URL=https://yourdomain.com
   ```

3. **PORT**: Cloud platforms (Heroku, Railway, etc.) set PORT automatically. Your code now supports this.

4. **CORS**: The new configuration allows:
   - Development: All origins (for flexibility)
   - Production: Only specified FRONTEND_URL(s)

---

## ✅ Testing After Fixes

1. **Test CORS:**
   ```bash
   curl -H "Origin: http://localhost:3000" http://localhost:4000/health
   ```

2. **Test Missing Env Vars:**
   ```bash
   # Temporarily rename .env
   mv server/.env server/.env.backup
   npm start
   # Should show error about missing variables
   mv server/.env.backup server/.env
   ```

3. **Test Port Configuration:**
   ```bash
   PORT=5000 npm start
   # Should start on port 5000
   ```

---

## 🎯 Next Steps

After implementing these fixes:
1. Review `BUSINESS_READINESS_ASSESSMENT.md` for remaining items
2. Test thoroughly in a staging environment
3. Set up monitoring and error tracking
4. Create deployment documentation
