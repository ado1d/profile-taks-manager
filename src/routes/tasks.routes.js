import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  createTask, listTasks, getTask, updateTask, deleteTask
} from '../controllers/tasks.controller.js';
import {
  taskCreateValidator, taskUpdateValidator, tasksListValidator
} from '../utils/validators.js';
import { validationResult } from 'express-validator';

const router = Router();

// small helper to surface validation errors fast (optional)
router.use((req, res, next) => {
  // noop, actual validation handled in controllers; this is here if you want global handling
  next();
});

router.use(authenticate);

// Create
router.post('/', taskCreateValidator, createTask);

// List (user sees only their tasks; admin can pass ?all=true)
router.get('/', tasksListValidator, listTasks);

// Read
router.get('/:id', getTask);

// Update
router.patch('/:id', taskUpdateValidator, updateTask);

// Delete
router.delete('/:id', deleteTask);

// Example admin-only route (optional):
router.get('/admin/all-tasks', requireRole('admin'), async (req, res) => {
  // simple admin list without filters
  try {
    const [rows] = await req.app.get('db')?.execute?.('SELECT * FROM tasks ORDER BY created_at DESC') 
      || (await import('../db.js')).default.execute('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch all tasks' });
  }
});

export default router;
