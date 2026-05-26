/**
 * BLISS BOUTIQUE CRM — APPLICATION ENTRY POINT (crmApp.js)
 * Bootstrap the administrative Single Page Application (SPA).
 */

import { crmController } from './controllers/crmController.js';

// Setup event listener to boot the CRM once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[Bliss CRM] Bootstrapping application...');
  crmController.init();
});
