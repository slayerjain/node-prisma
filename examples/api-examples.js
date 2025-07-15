/**
 * Example API requests for testing the Todo REST API
 * 
 * You can use these examples with tools like curl, Postman, or any HTTP client
 * Make sure the server is running on http://localhost:3000
 */

// Health Check
// GET http://localhost:3000/health

// Get all todos
// GET http://localhost:3000/api/todos

// Get a specific todo (replace 1 with actual todo ID)
// GET http://localhost:3000/api/todos/1

// Create a new todo
// POST http://localhost:3000/api/todos
// Content-Type: application/json
// {
//   "title": "Learn Node.js",
//   "description": "Complete the Node.js tutorial series"
// }

// Update a todo (replace 1 with actual todo ID)
// PUT http://localhost:3000/api/todos/1
// Content-Type: application/json
// {
//   "title": "Learn Node.js and Express",
//   "description": "Complete the Node.js and Express tutorial series",
//   "completed": true
// }

// Toggle todo completion (replace 1 with actual todo ID)
// PATCH http://localhost:3000/api/todos/1/toggle

// Delete a todo (replace 1 with actual todo ID)
// DELETE http://localhost:3000/api/todos/1

/**
 * CURL Examples:
 */

console.log(`
Example CURL commands:

1. Health Check:
   curl http://localhost:3000/health

2. Get all todos:
   curl http://localhost:3000/api/todos

3. Create a new todo:
   curl -X POST http://localhost:3000/api/todos \\
     -H "Content-Type: application/json" \\
     -d '{"title": "Learn Prisma", "description": "Complete Prisma tutorial"}'

4. Update a todo (replace 1 with actual ID):
   curl -X PUT http://localhost:3000/api/todos/1 \\
     -H "Content-Type: application/json" \\
     -d '{"title": "Learn Prisma ORM", "completed": true}'

5. Toggle completion (replace 1 with actual ID):
   curl -X PATCH http://localhost:3000/api/todos/1/toggle

6. Delete a todo (replace 1 with actual ID):
   curl -X DELETE http://localhost:3000/api/todos/1
`);

/**
 * JavaScript fetch examples for frontend integration:
 */

// Example function to fetch all todos
async function getAllTodos() {
  try {
    const response = await fetch('http://localhost:3000/api/todos');
    const todos = await response.json();
    console.log('Todos:', todos);
    return todos;
  } catch (error) {
    console.error('Error fetching todos:', error);
  }
}

// Example function to create a new todo
async function createTodo(title, description) {
  try {
    const response = await fetch('http://localhost:3000/api/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, description })
    });
    const todo = await response.json();
    console.log('Created todo:', todo);
    return todo;
  } catch (error) {
    console.error('Error creating todo:', error);
  }
}

// Example function to update a todo
async function updateTodo(id, updates) {
  try {
    const response = await fetch(`http://localhost:3000/api/todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });
    const todo = await response.json();
    console.log('Updated todo:', todo);
    return todo;
  } catch (error) {
    console.error('Error updating todo:', error);
  }
}

// Example function to delete a todo
async function deleteTodo(id) {
  try {
    const response = await fetch(`http://localhost:3000/api/todos/${id}`, {
      method: 'DELETE'
    });
    if (response.ok) {
      console.log('Todo deleted successfully');
    }
  } catch (error) {
    console.error('Error deleting todo:', error);
  }
}

module.exports = {
  getAllTodos,
  createTodo,
  updateTodo,
  deleteTodo
};
