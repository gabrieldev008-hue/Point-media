'use strict';
const roles = Object.freeze(['CANDIDATE', 'RECRUITER', 'ADMIN']);
function normalizeEmail(email) { return email.trim().toLowerCase(); }
function permits(role, allowed) { return roles.includes(role) && allowed.includes(role); }
function trustedOrigin(origin, expected) { return typeof origin === 'string' && origin === expected; }
module.exports = { roles, normalizeEmail, permits, trustedOrigin };
