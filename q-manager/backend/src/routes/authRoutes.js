const { toNodeHandler } = require('better-auth/node');
const { auth } = require('../auth');

// Mounts all Better Auth endpoints under /api/auth/*
const authHandler = toNodeHandler(auth);

module.exports = authHandler;
