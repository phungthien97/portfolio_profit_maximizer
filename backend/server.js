require('dotenv').config();
const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const currencyRoutes = require('./routes/currency');
const assetRoutes = require('./routes/assets');
const dataRoutes = require('./routes/data');
const calculationsRoutes = require('./routes/calculations');
const optimizationRoutes = require('./routes/optimization');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
// Increase body size limit to handle large frontier and historical data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/currency', currencyRoutes);
app.use('/assets', assetRoutes);
app.use('/data', dataRoutes);
app.use('/calculations', calculationsRoutes);
app.use('/optimization', optimizationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

