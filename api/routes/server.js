const app = require('../app');
const port = 3000;
const host = '0.0.0.0';

// Start server
app.listen(port, host, () => {
  console.log(`Server läuft auf http://${host}:${port}`);
});
