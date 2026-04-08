const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 8086;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'meeting-room-admin', port: PORT }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`[meeting-room-admin] Running on port ${PORT}`));
