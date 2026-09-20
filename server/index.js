const path = require('path');
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Fallback to index.html for SPA (when running locally)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Servidor Sofascore & Biwenger Stats iniciado en:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
