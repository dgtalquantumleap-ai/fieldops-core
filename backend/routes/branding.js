/**
 * Public branding endpoint — no auth required.
 * Frontend pages fetch this once on load to apply business name, phone, etc.
 */
const express = require('express');
const router = express.Router();
const branding = require('../config/branding');

router.get('/', (req, res) => {
    res.json({
        name:           branding.name,
        phone:          branding.phone,
        email:          branding.email,
        city:           branding.city,
        website:        branding.website,
        tagline:        branding.tagline,
        industry:       branding.industry,
        owner_name:     branding.owner_name,
        owner_initials: branding.owner_initials,
        founded_year:   branding.founded_year,
        service_area:   branding.service_area,
    });
});

module.exports = router;
