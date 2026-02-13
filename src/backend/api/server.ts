/**
 * Express API Server entrypoint
 * Wires up the application from app.ts
 */

import { createApp, startServer } from './app';

const app = createApp();
const PORT = process.env.API_PORT || 8082;

// Start server when executed directly
// Note: require.main === module doesn't work reliably with tsx/ESM, so we always start the server
startServer(app, PORT);

export default app;
