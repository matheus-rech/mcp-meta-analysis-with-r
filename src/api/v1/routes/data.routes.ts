import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import multer from 'multer';
import { DataController } from '../controllers/data.controller.js';

const router = Router();
const controller = new DataController();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/xml',
      'text/xml'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: CSV, Excel, RevMan XML'));
    }
  }
});

// Upload study data
router.post('/projects/:projectId/upload',
  param('projectId').isUUID(),
  upload.single('file'),
  body('dataFormat').isIn(['csv', 'excel', 'revman']).optional(),
  body('validationLevel').isIn(['basic', 'comprehensive']).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await controller.uploadData(
        req.params.projectId,
        req.file,
        req.body
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Validate uploaded data
router.post('/projects/:projectId/validate',
  param('projectId').isUUID(),
  body('dataId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.validateData(
        req.params!.projectId,
        req.body.dataId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Get data validation report
router.get('/projects/:projectId/data/:dataId/validation',
  param('projectId').isUUID(),
  param('dataId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.getValidationReport(
        req.params!.projectId,
        req.params!.dataId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Download processed data
router.get('/projects/:projectId/data/:dataId/download',
  param('projectId').isUUID(),
  param('dataId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { stream, filename, contentType } = await controller.downloadData(
        req.params!.projectId,
        req.params!.dataId
      );
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }
);

// List data files for a project
router.get('/projects/:projectId/data',
  param('projectId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const result = await controller.listDataFiles(req.params!.projectId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;