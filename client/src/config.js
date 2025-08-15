// API configuration for different environments
const config = {
  development: {
    apiBaseUrl: 'http://localhost:3001'
  },
  production: {
    apiBaseUrl: '' // Empty for production (same domain)
  }
};

// Get current environment
const env = process.env.NODE_ENV || 'development';

// Export the appropriate configuration
export const apiBaseUrl = config[env].apiBaseUrl;

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  return `${apiBaseUrl}${endpoint}`;
}; 