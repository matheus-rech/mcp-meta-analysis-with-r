import { Router } from 'express';
import metaAnalysisRoutes from './meta-analysis.routes.js';
import sessionRoutes from './session.routes.js';
import dataRoutes from './data.routes.js';
import visualizationRoutes from './visualization.routes.js';
import reportRoutes from './report.routes.js';
import ingestionRoutes from './ingestion.routes.js';
import lintingRoutes from './linting.routes.js';

const router = Router();

// API v1 routes
router.use('/meta-analysis', metaAnalysisRoutes);
router.use('/sessions', sessionRoutes);
router.use('/data', dataRoutes);
router.use('/visualizations', visualizationRoutes);
router.use('/reports', reportRoutes);
router.use('/ingestion', ingestionRoutes);
router.use('/linting', lintingRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;