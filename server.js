const express = require('express');
const routes = require('./src/routes/index');
const path = require('path');

const app = express();

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/', routes);

app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
