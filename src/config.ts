import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Proxy settings
const PROXY_URL_0 = 'http://kmkydmkb:zu4v5jde2wij@216.10.27.159:6837';
export const PROXY_URL_1 = process.env.PROXY_URL_1 || PROXY_URL_0;
export const PROXY_URL_2 = process.env.PROXY_URL_2 || PROXY_URL_0;
export const PROXY_URL_3 = process.env.PROXY_URL_3 || PROXY_URL_0;
export const PROXY_URL_4 = process.env.PROXY_URL_4 || PROXY_URL_0;

// Redis settings
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || '6379',
  url: process.env.REDIS_URL || 'redis://redis:6379'
}; 