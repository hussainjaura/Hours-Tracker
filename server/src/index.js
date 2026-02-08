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
const NODE_ENV = process.env.NODE_ENV || 'development';
if (NODE_ENV !== 'production') {
  console.log("DATABASE_URL:", process.env.DATABASE_URL ? '***configured***' : 'MISSING');
  console.log("JWT_SECRET:", process.env.JWT_SECRET ? '***configured***' : 'MISSING');
}

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${NODE_ENV})`);
  console.log(`Environment: ${NODE_ENV}`);
  if (NODE_ENV === 'development') {
    console.log(`API URL: http://localhost:${PORT}`);
  }
});
