require('dotenv').config();

module.exports = {
  webAppUrl: process.env.SHEETS_WEB_APP_URL || '',
  apiKey: process.env.SHEETS_API_KEY || 'BlissSecureToken2026',
};
