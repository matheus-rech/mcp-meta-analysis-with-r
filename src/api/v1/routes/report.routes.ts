import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ReportController } from '../controllers/report.controller.js';

const router = Router();
const controller = new ReportController();

// Generate comprehensive report
router.post('/projects/:projectId/reports',
  param('projectId').isUUID(),
  body('format').isIn(['html', 'pdf', 'word', 'latex']),
  body('includeCode').isBoolean().optional(),
  body('journalTemplate').isString().optional(),
  body('sections').isArray().optional(),
  body('sections.*').isIn([
    'executive_summary',
    'methods',
    'results',
    'forest_plots',
    'funnel_plots',
    'heterogeneity',
    'publication_bias',
    'sensitivity_analysis',
    'discussion',
    'references',
    'appendix'
  ]),
  body('language').isIn(['en', 'fr', 'es', 'de', 'pt']).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.generateReport(
        req.params!.projectId,
        req.body
      );
      res.status(202).json(result); // 202 Accepted for async generation
    } catch (error) {
      next(error);
    }
  }
);

// Get report status
router.get('/reports/:reportId/status',
  param('reportId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const status = await controller.getReportStatus(req.params!.reportId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

// Download report
router.get('/reports/:reportId/download',
  param('reportId').isUUID(),
  query('format').isIn(['html', 'pdf', 'word', 'latex']).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { stream, contentType, filename } = await controller.downloadReport(
        req.params!.reportId,
        req.query!.format as string
      );
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// Get report metadata
router.get('/reports/:reportId',
  param('reportId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const metadata = await controller.getReportMetadata(req.params!.reportId);
      res.json(metadata);
    } catch (error) {
      next(error);
    }
  }
);

// List reports for a project
router.get('/projects/:projectId/reports',
  param('projectId').isUUID(),
  query('format').isIn(['html', 'pdf', 'word', 'latex', 'all']).optional(),
  query('status').isIn(['pending', 'generating', 'completed', 'failed']).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const reports = await controller.listReports(
        req.params!.projectId,
        req.query
      );
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }
);

// Generate PRISMA flow diagram
router.post('/projects/:projectId/reports/prisma-diagram',
  param('projectId').isUUID(),
  body('identified').isInt({ min: 0 }),
  body('screened').isInt({ min: 0 }),
  body('eligible').isInt({ min: 0 }),
  body('included').isInt({ min: 0 }),
  body('excludedReasons').isArray().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.generatePRISMADiagram(
        req.params!.projectId,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Delete report
router.delete('/reports/:reportId',
  param('reportId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      await controller.deleteReport(req.params!.reportId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;