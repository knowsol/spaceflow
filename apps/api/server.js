const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 4006;

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'meeting-room-api', port: PORT });
});

// ── Routes ────────────────────────────────────────────────
// TODO: app.use('/api/resource', require('./routes/resource'));

// ── 404 / Error ───────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`[meeting-room-api] Running on port ${PORT}`));
