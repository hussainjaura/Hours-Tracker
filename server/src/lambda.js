// this is the entry point for the aws lambda:
import serverless from 'serverless-http';
import app from './app.js';

// if a setting is missing then the function should refuse to start:
// I would get the reason in cloudwatch:
const missing = ['', ''].filter((name) => !process.env(name));

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

// PDFS are binary files so without this my audit pack download files would arrive corrupted:
export const handler = serverless(app, {
    binary: ["application/pdf"]
});