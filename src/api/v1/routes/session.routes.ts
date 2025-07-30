import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { SessionController } from '../controllers/session.controller.js';

const router = Router();
const controller = new SessionController();

// Create new session
router.post('/',
  body('userId').isString().optional(),
  body('projectName').isString().notEmpty(),
  body('description').isString().optional(),
  body('tags').isArray().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const session = await controller.createSession(req.body);
      res.status(201).json(session);
    } catch (error) {
      next(error);
    }
  }
);

// Get session details
router.get('/:sessionId',
  param('sessionId').isUUID(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const session = await controller.getSession(req.params!.sessionId);
      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

// Update session
router.patch('/:sessionId',
  param('sessionId').isUUID(),
  body('status').isIn(['active', 'paused', 'completed', 'archived']).optional(),
  body('workflowStage').isString().optional(),
  body('tags').isArray().optional(),
  body('metadata').isObject().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const session = await controller.updateSession(
        req.params!.sessionId,
        req.body
      );
      res.json(session);
    } catch (error) {
      next(error);
    }
  }
);

// List sessions
router.get('/',
  query('userId').isString().optional(),
  query('status').isIn(['active', 'paused', 'completed', 'archived', 'all']).optional(),
  query('projectName').isString().optional(),
  query('tags').isArray().optional(),
  query('createdAfter').isISO8601().optional(),
  query('createdBefore').isISO8601().optional(),
  query('page').isInt({ min: 1 }).optional(),
  query('limit').isInt({ min: 1, max: 100 }).optional(),
  query('sortBy').isIn(['createdAt', 'updatedAt', 'projectName']).optional(),
  query('sortOrder').isIn(['asc', 'desc']).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const sessions = await controller.listSessions(req.query);
      res.json(sessions);
    } catch (error) {
      next(error);
    }
  }
);

// Clone session
router.post('/:sessionId/clone',
  param('sessionId').isUUID(),
  body('newProjectName').isString().notEmpty(),
  body('includeData').isBoolean().optional(),
  body('includeResults').isBoolean().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const newSession = await controller.cloneSession(
        req.params!.sessionId,
        req.body
      );
      res.status(201).json(newSession);
    } catch (error) {
      next(error);
    }
  }
);

// Export session
router.post('/:sessionId/export',
  param('sessionId').isUUID(),
  body('format').isIn(['zip', 'tar', 'json']),
  body('includeRWorkspace').isBoolean().optional(),
  body('includeLogs').isBoolean().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const exportInfo = await controller.exportSession(
        req.params!.sessionId,
        req.body.format
      );
      res.status(202).json(exportInfo); // 202 Accepted for async export
    } catch (error) {
      next(error);
    }
  }
);

// Delete session
router.delete('/:sessionId',
  param('sessionId').isUUID(),
  body('deleteFiles').isBoolean().optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      await controller.deleteSession(
        req.params!.sessionId
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// Get session activity log
router.get('/:sessionId/activity',
  param('sessionId').isUUID(),
  query('startDate').isISO8601().optional(),
  query('endDate').isISO8601().optional(),
  query('eventType').isString().optional(),
  query('page').isInt({ min: 1 }).optional(),
  query('limit').isInt({ min: 1, max: 100 }).optional(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const activity = await controller.getSessionActivity(
        req.params!.sessionId
      );
      res.json(activity);
    } catch (error) {
      next(error);
    }
  }
);

export default router;