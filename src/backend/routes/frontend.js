const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * Route GET /frontend
 * Serves the primary Bliss Homestay administrative dashboard index file
 */
router.get('/', (req, res) => {
  res.redirect('/frontend/crm');
});

module.exports = router;
