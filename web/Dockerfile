FROM node:18-alpine

WORKDIR /app

# Install Express
RUN npm init -y && \
    npm install express

# Create a simple server file
COPY <<EOF /app/server.js
const express = require('express');
const app = express();
const PORT = 3050;

app.get('/', (req, res) => {
  res.send('<h1>Swift Web UI</h1><p>Dummy web interface is running!</p>');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dummy web server running on port ${PORT}`);
});
EOF

EXPOSE 3050

CMD ["node", "server.js"]
