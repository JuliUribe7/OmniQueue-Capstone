require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Better Auth
const { toNodeHandler } = require("better-auth/node");
const { auth } = require("./src/lib/auth");
app.all("/api/auth/*path", toNodeHandler(auth));

// health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const queueRoutes = require('./src/routes/queueRoutes');
app.use(queueRoutes);
const telnyxRoutes = require('./src/routes/telnyxRoutes');
app.use(telnyxRoutes);

const errorHandler = require('./src/middleware/errorHandler');
app.use(errorHandler);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});