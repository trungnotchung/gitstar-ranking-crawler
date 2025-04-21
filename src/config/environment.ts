import dotenv from 'dotenv';
dotenv.config()

export const ENV = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
};