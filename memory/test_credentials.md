# Test Credentials

## Admin
- Email: admin@axon.dev
- Password: admin123
- Role: admin

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh

## Chat Endpoints
- POST /api/chats (create)
- GET /api/chats (list)
- GET /api/chats/:id (get)
- DELETE /api/chats/:id (delete)
- PATCH /api/chats/:id/title (rename)
- POST /api/chat (send message, streaming)
- GET /api/chats/:id/preview (get preview URL)
