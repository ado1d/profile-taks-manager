import pool from '../db.js';
import mysql from 'mysql2'; 
import { validationResult } from 'express-validator';


async function authorizeTaskAccess(taskId, user) {
  const [rows] = await pool.execute('SELECT user_id FROM tasks WHERE id = ? LIMIT 1', [taskId]);
  if (!rows.length) return { ok: false, status: 404, msg: 'Task not found' };
  const ownerId = rows[0].user_id;
  if (user.role === 'admin' || ownerId === user.id) return { ok: true };
  return { ok: false, status: 403, msg: 'Forbidden: cannot access others’ tasks' };
}

export async function createTask(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const userId = req.user.id;
  const { title, description, status } = req.body;

  try {
    const [result] = await pool.execute(
      'INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, ?)',
      [userId, title, description || null, status || 'To Do']
    );
    const [taskRows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    return res.status(201).json(taskRows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to create task' });
  }
}

export async function listTasks(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  
  const { status, all = 'false', page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(pageNum) || isNaN(limitNum) || pageNum < 1 || limitNum < 1) {
    return res.status(400).json({ error: 'Invalid pagination parameters' });
  }
  
  const offset = (pageNum - 1) * limitNum;
  const showAll = all === 'true' || all === true;
  
  try {
    let where = [];
    let params = [];
    
    if (!(showAll && req.user.role === 'admin')) {
      where.push('user_id = ?');
      params.push(req.user.id);
    }
    
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    
    const sql = mysql.format(
      `SELECT * FROM tasks ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    
    const [rows] = await pool.execute(sql);
    
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) as count FROM tasks ${whereSql}`,
      params
    );
    
    const total = countRows?.[0]?.count ?? 0;
    return res.json({
      data: rows,
      meta: { page: pageNum, limit: limitNum, total }
    });
  } catch (e) {
    console.error('Error listing tasks:', e);
    return res.status(500).json({ error: 'Failed to list tasks', details: e.message });
  }
}
export async function getTask(req, res) {
  const id = Number(req.params.id);
  try {
    const authz = await authorizeTaskAccess(id, req.user);
    if (!authz.ok) return res.status(authz.status).json({ error: authz.msg });

    const [rows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Task not found' });
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to retrieve task' });
  }
}

export async function updateTask(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const id = Number(req.params.id);
  const { title, description, status } = req.body;

  try {
    const authz = await authorizeTaskAccess(id, req.user);
    if (!authz.ok) return res.status(authz.status).json({ error: authz.msg });

    const sets = [];
    const params = [];
    if (title !== undefined)      { sets.push('title = ?');       params.push(title); }
    if (description !== undefined){ sets.push('description = ?'); params.push(description); }
    if (status !== undefined)     { sets.push('status = ?');      params.push(status); }
    if (!sets.length) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);

    await pool.execute(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.execute('SELECT * FROM tasks WHERE id = ?', [id]);
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to update task' });
  }
}

export async function deleteTask(req, res) {
  const id = Number(req.params.id);
  try {
    const authz = await authorizeTaskAccess(id, req.user);
    if (!authz.ok) return res.status(authz.status).json({ error: authz.msg });

    await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
    return res.status(204).send();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
}
