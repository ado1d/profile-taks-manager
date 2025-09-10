import { Router } from 'express';
import { register, login } from '../controllers/auth.controller.js';
import { registerValidator, loginValidator } from '../utils/validators.js';

const router = Router();

router.post('/register', registerValidator, register);
router.post('/login',    loginValidator,    login);

export default router;
