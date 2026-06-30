// Netlify Functions entry point.
// Wraps the Express app with serverless-http and calls initDatabase() once per cold start.
// Netlify redirects (see netlify.toml) preserve the original request path (/auth/login,
// /products, etc.) in the function event, so the Express routes need no changes.
const serverless = require('serverless-http');
const { initDatabase } = require('../../backend/database');
const app = require('../../backend/server');

const handler = serverless(app);
let initialized = false;

exports.handler = async (event, context) => {
    if (!initialized) {
        await initDatabase();
        initialized = true;
    }
    return handler(event, context);
};
