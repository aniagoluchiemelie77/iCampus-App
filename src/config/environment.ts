import {
  BACKEND_URL as DOTENV_BACKEND_URL,
} from '@env';

const required = (name: string, value: string | undefined) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
};

export const BACKEND_URL = required('BACKEND_URL', DOTENV_BACKEND_URL);
