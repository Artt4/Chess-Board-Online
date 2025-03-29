console.log("Starting server-prod.js...");
import { createServerApp, startServer } from './server/server-setup.js';

const { server } = createServerApp();
const port = process.env.PORT || 8080;
startServer(server, port);


//remember to:
//1. remove the /ws from ws.js const wsUrl = `${protocol}//${host}/ws`
//2. reomve this from vite.config.js
//server: {
//    proxy: {
//        '/ws': {
//            target: 'ws://localhost:8080',
//            ws: true,
//        },
//    },
//},