// Vercel serverless entry point.
// Calls initDatabase() once per cold start, then delegates all requests to Express.
const { initDatabase } = require('../backend/database');
const app = require('../backend/server');

let initialized = false;

module.exports = async (req, res) => {
    if (!initialized) {
        await initDatabase();
        initialized = true;
    }
    return app(req, res);
};
