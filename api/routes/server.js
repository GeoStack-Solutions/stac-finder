require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const app = require('../app');
const port = process.env.API_PORT || 4000;
const host = process.env.API_HOST || '0.0.0.0';

// Start server
app.listen(port, host, () => {
  console.log(`Server runs on http://${host}:${port}`);
});
