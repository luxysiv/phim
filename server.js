const express = require('express');
const routes = require('./src/routes/index');
const path = require('path');

const app = express();

// Phục vụ file tĩnh (logo)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Sử dụng routes
app.use('/', routes);

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
