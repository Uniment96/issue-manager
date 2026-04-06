// Replaces expo/virtual/env.js in tests — just expose process.env as-is
module.exports = { env: process.env };
