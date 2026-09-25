import dotenv from 'dotenv';
import path from 'path';

// Load from root .env or app .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'parkpass_super_secret_jwt_key_2026_production_grade',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  publicAppUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  cookieSecret: process.env.COOKIE_SECRET || 'cookie_secret_parkpass_32_characters_minimum',
};
