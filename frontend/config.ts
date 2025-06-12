// API Configuration
const DEV_API_URL = 'http://10.55.41.250:3001';  // Using local IP address
const PROD_API_URL = 'https://your-production-api.com'; // Change this when deploying

// Use environment variable or default to development
const isDevelopment = process.env.NODE_ENV !== 'production';

export const API_BASE_URL = isDevelopment ? DEV_API_URL : PROD_API_URL;

// API Endpoints
export const API_ENDPOINTS = {
  PING: '/api/ping',
  UPLOAD_SCHEDULE: '/api/uploadSchedule',
  GENERATE_SCHEDULE: '/api/generateSchedule',
};

// Helper function to get full API URL
export const getApiUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`; 