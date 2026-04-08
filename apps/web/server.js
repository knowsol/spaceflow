const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3006;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'meeting-room-web', port: PORT }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`[meeting-room-web] Running on port ${PORT}`));
