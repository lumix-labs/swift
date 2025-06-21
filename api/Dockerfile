FROM node:20-alpine

WORKDIR /app

# Install Express
RUN npm init -y && \
  npm install express

# Create simple server file2
COPY <<EOF /app/server.js
const express = require('express');
const app = express();
const PORT = 4000;

app.get('/', (req, res) => {
  res.json({ message: 'Swift API dummy server is running!' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dummy server running on port ${PORT}`);
});
EOF

EXPOSE 4000

CMD ["node", "server.js"]