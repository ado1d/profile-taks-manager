import { body, param, query, validationResult } from 'express-validator';

export const registerValidator = [
  body('username').trim().isLength({ min: 3, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('role').optional().isIn(['admin', 'user']),
];

export const loginValidator = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
];

export const taskCreateValidator = [
  body('title').trim().isLength({ min: 1, max: 150 }),
  body('description').optional().isString(),
  body('status').optional().isIn(['To Do', 'In Progress', 'Completed']),
];

export const taskUpdateValidator = [
  param('id').isInt({ min: 1 }),
  body('title').optional().trim().isLength({ min: 1, max: 150 }),
  body('description').optional().isString(),
  body('status').optional().isIn(['To Do', 'In Progress', 'Completed']),
];

export const tasksListValidator = [
  query('status').optional().isIn(['To Do', 'In Progress', 'Completed']),
  query('all').optional().isBoolean().toBoolean(),
  query('page').optional().isInt({ min: 1 }).default(1).toInt(), // Default to page 1
  query('limit').optional().isInt({ min: 1, max: 100 }).default(10).toInt(), // Default to 10 items per page
];

export async function listTasks(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { status, all = false } = req.query;
  const page = parseInt(req.query.page, 10) || 1; // Default to page 1
  const limit = parseInt(req.query.limit, 10) || 10; // Default to 10 items per page
  const offset = (page - 1) * limit;

  try {
    let where = [];
    let params = [];

    if (!(all && req.user.role === 'admin')) {
      where.push('user_id = ?');
      params.push(req.user.id);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT * FROM tasks ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) as count FROM tasks ${whereSql}`,
      params
    );

    return res.json({
      data: rows,
      meta: { page, limit, total: count }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to list tasks' });
  }
}
