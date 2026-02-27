/**
 * branding.js — Central business identity config
 * All values read from environment variables.
 * Change .env to rebrand the entire app for a new client.
 */

const branding = {
    name:           process.env.BUSINESS_NAME           || 'Your Business',
    phone:          process.env.BUSINESS_PHONE          || '',
    email:          process.env.BUSINESS_EMAIL          || process.env.ADMIN_EMAIL || '',
    city:           process.env.BUSINESS_CITY           || '',
    website:        process.env.BUSINESS_WEBSITE        || '',
    tagline:        process.env.BUSINESS_TAGLINE        || 'Professional Services',
    industry:       process.env.BUSINESS_INDUSTRY       || 'Cleaning Services',
    abn:            process.env.BUSINESS_ABN            || '',
    owner_name:     process.env.BUSINESS_OWNER_NAME     || 'The Owner',
    owner_initials: process.env.BUSINESS_OWNER_INITIALS || 'BO',
    founded_year:   process.env.BUSINESS_FOUNDED_YEAR   || new Date().getFullYear().toString(),
    service_area:   process.env.BUSINESS_SERVICE_AREA   || 'our local area',
};

module.exports = branding;
