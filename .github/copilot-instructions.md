<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Todo API Project Instructions

This is a Node.js REST API project for managing todos using:
- **Express.js** - Web framework
- **Prisma ORM** - Database toolkit and query builder
- **PostgreSQL** - Primary database
- **Node.js** - Runtime environment

## Project Structure
- `server.js` - Main application server with API routes
- `prisma/schema.prisma` - Database schema definition
- `prisma/seed.js` - Database seeding script
- `.env` - Environment configuration

## API Endpoints
- `GET /health` - Health check
- `GET /api/todos` - Get all todos
- `GET /api/todos/:id` - Get specific todo
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo
- `PATCH /api/todos/:id/toggle` - Toggle completion status

## Development Guidelines
- Follow RESTful API conventions
- Use proper HTTP status codes
- Include error handling for all endpoints
- Validate input data before processing
- Use Prisma client for database operations
- Follow async/await patterns for database operations
- Include proper logging for debugging

## Database Schema
The Todo model includes:
- `id` (auto-increment primary key)
- `title` (required string)
- `description` (optional string)
- `completed` (boolean, default false)
- `createdAt` (auto-generated timestamp)
- `updatedAt` (auto-updated timestamp)
