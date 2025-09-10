### Profile Task Manager

A  Node.js + Express + MySQL API with JWT authentication and role-based access control (RBAC). Users can register, log in, and manage their own tasks. Admins can optionally list all tasks.

---

### Features
- **Auth**: Register and login with hashed passwords (bcrypt) and JWTs
- **RBAC**: `user` and `admin` roles enforced via middleware
- **Tasks**: CRUD with ownership checks; pagination and filtering
- **Security**: Helmet, CORS, input validation (express-validator)

---

### Tech Stack
- Node.js, Express (ES Modules)
- MySQL (mysql2, raw SQL)
- JWT (jsonwebtoken), bcrypt
- Validation (express-validator)

---

### Prerequisites
- Node.js 18+
- MySQL 8+ running locally or accessible via network

---

### Quick Start
1) Install dependencies
```bash
npm install
```

2) Create database schema
- Update MySQL connection info in environment variables (see below)
- Run the SQL in `src/sql/schema.sql` in your MySQL server (e.g., with MySQL Workbench or CLI)

3) Create `.env`
```bash
# Server
PORT=4000/api
NODE_ENV=development

# JWT
JWT_SECRET=your-strong-secret
JWT_EXPIRES_IN=1d

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=task_manager_db
```

#### To create a random JWT_SECRET code run this in terminal
```node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"```

4) Start the API
```bash
# Dev mode (auto-restart)
npm run dev

# Production mode
npm start
```
The server defaults to `http://localhost:4000/`.

---

### How It Works
- Authentication uses JWT Bearer tokens. After login, include `Authorization: Bearer <token>` on protected routes.
- Authorization uses simple RBAC:
  - `user`: can CRUD only their tasks
  - `admin`: can access all tasks and admin routes (e.g., `GET /tasks/admin/all-tasks`)
- Input validation is enforced via `express-validator`. Errors return HTTP 400 with details.

---

### API Overview
Base URL: `http://localhost:4000/api`

- **Auth**
  - `POST /auth/register` — create a new user
  - `POST /auth/login` — login and receive a JWT

- **Tasks** (require `Authorization: Bearer <token>`) 
  - `POST /tasks` — create a task
  - `GET /tasks` — list tasks (own by default; admin can pass `?all=true`)
    - Query params: `status` (optional), `page` (default 1), `limit` (default 20), `all` (admin only)
  - `GET /tasks/:id` — get a single task (must be owner or admin)
  - `PATCH /tasks/:id` — update a task (must be owner or admin)
  - `DELETE /tasks/:id` — delete a task (must be owner or admin)
  - `GET /tasks/admin/all-tasks` — list all tasks (admin only)

---

### Request/Response Examples

- Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ad0ld",
    "email": "adold@gmail.com",
    "password": "Password123!",
    "role": "user"
  }'
```
Response 201
```json
{
  "id": 1,
  "username": "adold",
  "email": "adold@gmail.com",
  "role": "user"
}
```

- Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "adold@gmail.com",
    "password": "Password123!"
  }'
```
Response 200
```json
{
  "token": "<JWT>",
  "user": {
    "id": 1,
    "username": "adold",
    "email": "adold@gmail.com",
    "role": "user"
  }
}
```

- Create Task
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "title": "Write idk",
    "description": "Do as u want",
    "status": "To Do"
  }'
```
Response 201
```json
{
  "id": 10,
  "user_id": 1,
  "title": "Write idk",
  "description": "Do as u want",
  "status": "To Do",
  "created_at": "2025-09-10T10:00:00.000Z",
  "updated_at": "2025-09-10T10:00:00.000Z"
}
```

- List Tasks (own)
```bash
curl "http://localhost:4000/api/tasks?page=1&limit=10" \
  -H "Authorization: Bearer <JWT>"
```
Response 200
```json
{
  "data": [
    { "id": 10, "title": "Write idk", "status": "To Do", "user_id": 1 }
  ],
  "meta": { "page": 1, "limit": 10, "total": 1 }
}
```

- Get Task by ID
```bash
curl http://localhost:4000/api/tasks/10 \
  -H "Authorization: Bearer <JWT>"
```

- Update Task
```bash
curl -X PATCH http://localhost:4000/api/tasks/10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{ "status": "In Progress" }'
```

- Delete Task
```bash
curl -X DELETE http://localhost:4000/api/tasks/10 \
  -H "Authorization: Bearer <JWT>"
```

- Admin: List All Tasks
```bash
curl "http://localhost:4000/api/tasks?all=true&page=1&limit=20" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```
Or the explicit admin route:
```bash
curl http://localhost:4000/api/tasks/admin/all-tasks \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

---

### Validation Summary
- `POST /auth/register`: `username` (required), `email` (required, valid), `password` (required), `role` (`user`|`admin`, optional)
- `POST /auth/login`: `email`, `password` required
- `POST /tasks`: `title` (required), `description` (optional), `status` (optional enum)
- `PATCH /tasks/:id`: any of `title`, `description`, `status`
- `GET /tasks`: optional `status`, `page`, `limit`, `all` (admin only)

---

### NPM Scripts
- `npm run dev`: start server with file watching
- `npm start`: start server in production mode

---

### Project Structure
```text
src/
  server.js         # App and HTTP server
  app.js            # Express app, middleware, routers
  db.js             # MySQL pool
  routes/
    auth.routes.js  # /auth endpoints
    tasks.routes.js # /tasks endpoints
  controllers/
    auth.controller.js
    tasks.controller.js
  middleware/
    auth.js         # JWT authentication
    rbac.js         # requireRole() middleware
  utils/validators.js
  sql/schema.sql    # Database creation and tables
```

---

### Notes
- Ensure `JWT_SECRET` is strong in production.
- Create at least one admin by registering with `role: "admin"` (or update DB).
- CORS/Helmet defaults can be tuned in `src/app.js`.

---

### Troubleshooting
- 401 Unauthorized: missing/invalid `Authorization: Bearer <token>` header
- 403 Forbidden: accessing another user’s task without admin role
- 400 Bad Request: input validation failed (see `errors` array in response)
- DB connection errors: verify `.env` MySQL values and that the DB is reachable
