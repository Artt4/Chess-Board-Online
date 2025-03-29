// server-dev.js
console.log('Starting server-dev.js...');
import { createServerApp, startServer } from './server/server-setup.js';

// The only difference might be you want hot-reload in dev, but typically you'd do "build" + "node server.js" in production
// Or you might run `vite dev` separately, but that would skip adapter-node approach. 
// Let's assume you want a local test environment that STILL uses the compiled SvelteKit to unify everything.

const { server } = createServerApp(); 
startServer(server, 8080);
