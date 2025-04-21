import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Proxy settings
export const PROXY_CONFIG = {
  host: process.env.PROXY_HOST,
  port: process.env.PROXY_PORT,
  username: process.env.PROXY_USERNAME,
  password: process.env.PROXY_PASSWORD,
};

// Redis settings
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || '6379',
  url: process.env.REDIS_URL || 'redis://'+process.env.REDIS_HOST+':'+process.env.REDIS_PORT
};

// Construct proxy URL
export const getProxyUrl = () => {
  return `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;
}; 