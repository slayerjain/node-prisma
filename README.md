# Todo REST API with Advanced Database Operations

A modern REST API for managing todos built with Node.js, Express.js, Prisma ORM, and PostgreSQL, featuring complex database operations and relationships.

## ✅ Project Setup Status

We've successfully set up the following components:

1. ✅ **Project structure and configuration**
   - Node.js and npm packages
   - Express.js server
   - Prisma ORM setup
   - PostgreSQL database connection

2. ✅ **Advanced Database Setup**
   - PostgreSQL in Docker
   - Complex Prisma schema with multiple related models
   - Database migrations created
   - Seed script with sample data and relationships

3. ✅ **Complex API Implementation**
   - RESTful endpoints with advanced queries
   - Multiple database operations per API call (10+ queries per endpoint)
   - Comprehensive data validation
   - Robust error handling
   - Transaction support
   - BigInt serialization handling

## 🚀 How to Run the Project

Follow these steps to get the API running:

### 1. Make sure PostgreSQL is running

```bash
# Check if PostgreSQL container is running
docker ps | grep postgres

# If not running, start it with:
docker compose up -d postgres
```

### 2. Setup the database

```bash
# Apply database migrations
npx prisma migrate dev

# Seed the database with sample data
npm run db:seed
```

### 3. Start the API server

```bash
# To run in development mode with hot reload
npm run dev

# Or to run in production mode
npm start
```

The server will start on the port specified in your `.env` file (default: 8080) or automatically find an available port if there's a conflict.


## Testing with Keploy

[Keploy](https://keploy.io) is an API testing platform that can record and replay API test cases. This project is set up to work with Keploy for automated testing.

### Recording Test Cases

To record API interactions as test cases:

```bash
# Start the recording mode with your application
keploy record -c "npm start"
```

While the application is running in record mode:
1. Make API calls to the endpoints you want to test
2. Keploy will automatically capture the requests and responses
3. Test cases will be generated in the `keploy/` directory

### Replaying Test Cases

To validate your application against the recorded test cases:

```bash
# Run tests based on the recorded test cases
keploy test -c "npm start"
```

Keploy will:
1. Start your application
2. Replay the recorded API calls
3. Compare the responses with the expected responses
4. Generate a test report

### Benefits of Keploy Testing

- No need to write manual test cases for API endpoints
- Automatic regression testing
- Captures real-world API interactions
- Validates both request handling and response generation
- Ensures database operations continue to work as expected

Test reports are available in the `keploy/reports/` directory after test runs.

### 4. Monitor Prisma queries (optional)

The server is configured to log all Prisma queries, which helps with debugging complex operations:

```javascript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

This will show all SQL queries in the console for analysis.

## Advanced Database Schema

The application now uses a complex relational database schema with multiple relationships:

```prisma
model Todo {
  id            Int            @id @default(autoincrement())
  title         String
  description   String?
  completed     Boolean        @default(false)
  priority      Priority       @default(MEDIUM)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  userId        Int?
  categoryId    Int?
  tags          TagsOnTodos[]
  notes         Note[]
  history       TodoHistory[]
  attachments   Attachment[]
  dependencies  Todo[]         @relation("TodoDependencies")
  dependencyOf  Todo[]         @relation("TodoDependencies")
  category      Category?      @relation(fields: [categoryId], references: [id])
  user          User?          @relation(fields: [userId], references: [id])
}
```

### Key Database Design Features:

1. **Relationship Types**
   - One-to-Many: Todo to Notes, History, Attachments
   - Many-to-Many: Todo to Tags (with join table)
   - Self-referential: Todo dependencies
   - Optional Foreign Keys: User and Category relationships

2. **Cascade Deletions**
   - Notes, History, Attachments, and Tag relationships auto-delete when a Todo is deleted
   
3. **Enum Types**
   - Priority levels: LOW, MEDIUM, HIGH, URGENT

4. **Timestamps**
   - Automatic creation and update timestamps on all models

model User {
  id            Int            @id @default(autoincrement())
  name          String
  email         String         @unique
  todos         Todo[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Category {
  id            Int            @id @default(autoincrement())
  name          String
  description   String?
  todos         Todo[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Tag {
  id            Int            @id @default(autoincrement())
  name          String         @unique
  todos         TagsOnTodos[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model TagsOnTodos {
  todoId        Int
  tagId         Int
  assignedAt    DateTime       @default(now())
  todo          Todo           @relation(fields: [todoId], references: [id], onDelete: Cascade)
  tag           Tag            @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([todoId, tagId])
}

model Note {
  id            Int            @id @default(autoincrement())
  content       String
  todoId        Int
  todo          Todo           @relation(fields: [todoId], references: [id], onDelete: Cascade)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model TodoHistory {
  id            Int            @id @default(autoincrement())
  todoId        Int
  todo          Todo           @relation(fields: [todoId], references: [id], onDelete: Cascade)
  action        String
  description   String
  createdAt     DateTime       @default(now())
}

model Attachment {
  id            Int            @id @default(autoincrement())
  filename      String
  filepath      String
  mimeType      String
  todoId        Int
  todo          Todo           @relation(fields: [todoId], references: [id], onDelete: Cascade)
  createdAt     DateTime       @default(now())
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

## API Endpoints with Complex Operations

Each API endpoint now performs multiple database operations (10+ queries per request) to provide rich data and statistics:

| Method | Endpoint | Description | Database Operations |
|--------|----------|-------------|---------------------|
| GET | `/health` | Health check | - |
| GET | `/api/todos` | Get all todos with filtering, pagination, and stats | 12+ operations including counts, aggregations, raw SQL queries, and relation loading |
| GET | `/api/todos/:id` | Get todo with full relationship graph and statistics | 11+ operations for dependencies, history, attachments, and similar todos |
| POST | `/api/todos` | Create todo with validation, relationships, and history | 10+ operations in a transaction including validation and relation creation |
| PUT | `/api/todos/:id` | Update todo with validation and relationship changes | 10+ operations in a transaction for tags, notes, and dependency management |
| DELETE | `/api/todos/:id` | Delete todo with impact analysis | 10+ operations to analyze relationships, calculate statistics, and execute cascading deletion |
| PATCH | `/api/todos/:id/toggle` | Toggle completion with dependency checks | 10+ operations for dependency validation and completion statistics |

### Key API Implementation Features:

1. **Comprehensive Request Validation**
   - Pre-validation of relationships before updates
   - Circular dependency detection
   - Existence checks for related entities

2. **Rich Response Data**
   - Related entity statistics
   - System-wide metrics with each response
   - Historical tracking
   - Similar and related items

3. **Complex Query Parameters**
   - Filtering by multiple fields
   - Full-text search capabilities
   - Multi-relationship filtering

4. **Pagination and Sorting**
   - Offset-based pagination
   - Default sorting with override options
   - Count totals for pagination controls

## Advanced Usage Examples

### Create a new todo with relationships:
```bash
curl -X POST http://localhost:8080/api/todos \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn Advanced Prisma",
    "description": "Master complex Prisma operations",
    "priority": "HIGH",
    "userId": 1,
    "categoryId": 3,
    "tagIds": [1, 7, 9],
    "notes": ["Initial plan", "Reference docs: prisma.io"],
    "dependencies": [2, 3]
  }'
```

### Get todos with filtering and pagination:
```bash
curl "http://localhost:8080/api/todos?page=1&limit=5&completed=false&priority=HIGH&category=1&tag=2&search=prisma"
```

### Update a todo with relationship changes:
```bash
curl -X PUT http://localhost:8080/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Master Prisma ORM",
    "completed": true,
    "priority": "HIGH",
    "tagIds": [4, 5],
    "notes": ["Made significant progress"],
    "removeTags": [2],
    "dependencies": [3],
    "removeDependencies": [4]
  }'
```

### Toggle completion status with impact analysis:
```bash
curl -X PATCH http://localhost:8080/api/todos/3/toggle
```

### Delete todo with cascade effect:
```bash
curl -X DELETE http://localhost:8080/api/todos/2
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run start:direct` - Start server directly without nodemon
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:seed` - Seed database with sample data

## Response Format Examples

### GET /api/todos Response
```json
{
  "data": [
    {
      "id": 3,
      "title": "Build REST API endpoints",
      "description": "Create CRUD operations for todo management",
      "completed": true,
      "priority": "MEDIUM",
      "createdAt": "2025-07-15T12:29:58.938Z",
      "updatedAt": "2025-07-15T12:29:58.938Z",
      "userId": null,
      "categoryId": null,
      "category": null,
      "user": null,
      "tags": [],
      "notes": [],
      "dependencies": [],
      "dependencyOf": [],
      "history": [],
      "attachments": []
    },
    // ...more todos
  ],
  "pagination": {
    "total": 5,
    "totalPages": 1,
    "currentPage": 1,
    "limit": 10
  },
  "stats": {
    "total": 5,
    "completed": 1,
    "byPriority": [
      {"priority": "MEDIUM", "count": 5}
    ],
    "byCategory": []
  },
  "recentlyUpdated": [
    {"id": 3, "title": "Build REST API endpoints", "updatedAt": "2025-07-15T12:29:58.938Z"}
    // ...more todos
  ],
  "mostUsedTags": []
}
```

### GET /api/todos/:id Response
```json
{
  "todo": {
    "id": 3,
    "title": "Build REST API endpoints",
    "description": "Create CRUD operations for todo management",
    "completed": true,
    "priority": "MEDIUM",
    "createdAt": "2025-07-15T12:29:58.938Z",
    "updatedAt": "2025-07-15T12:29:58.938Z",
    "userId": null,
    "categoryId": null,
    "category": null,
    "user": null,
    "tags": [],
    "notes": [],
    "dependencies": [],
    "dependencyOf": [],
    "history": [],
    "attachments": []
  },
  "related": {
    "similarTodos": [
      {"id": 2, "title": "Learn Prisma ORM", "completed": false, "priority": "MEDIUM"}
      // ...more todos
    ],
    "userTodos": [],
    "relatedByTags": []
  },
  "stats": {
    "historyCount": 0,
    "notesCount": 0,
    "attachmentsCount": 0,
    "dependenciesCount": 0,
    "allDependenciesCompleted": true,
    "samePriorityCount": 4
  },
  "recentChanges": []
}
```

## Performance Considerations

The API now performs multiple database operations for each request, which provides rich data but may impact performance for high-traffic applications. For production deployments, consider:

1. **Caching Strategies**
   - Redis cache for frequently accessed data
   - Cached query results with time-based invalidation
   - Cache response data for expensive aggregations

2. **Query Optimization**
   - Selective loading of relationships with query parameters
   - Composite indexes for common filter combinations
   - Split large queries into smaller, more manageable ones

3. **Database Scaling**
   - Connection pooling configuration for high concurrency
   - Read replicas for heavy read workloads
   - Database sharding for very large datasets

4. **Application Architecture**
   - GraphQL API to allow clients to request only needed fields
   - Batch processing for heavy operations
   - Background workers for time-consuming tasks

5. **Monitoring and Performance Tuning**
   - Prisma query metrics collection
   - Performance tracing with tools like New Relic or Datadog
   - Regular review of slow queries

## Complex Database Operations

The application demonstrates several advanced database patterns:

1. **Transaction Management**
   - All multi-step operations use transactions for data consistency
   - Rollback on failure to prevent partial updates
   - Complex validation within transactions

2. **Advanced Queries**
   - Raw SQL queries for complex aggregations
   - Nested relation loading optimized for performance
   - Dynamic query building based on request parameters

3. **Recursive Relationships**
   - Self-referential todo dependencies with circular reference detection
   - Depth-limited loading of dependency chains
   - Impact analysis before operations

4. **Batched Operations**
   - Efficient handling of bulk updates and deletes
   - Tag management in bulk
   - Relationship batch processing

## Troubleshooting

### Port conflicts
The server now automatically finds an available port if the specified one is in use:

```javascript
// Function to try binding to different ports
const startServer = (initialPort, maxAttempts = 10) => {
  let currentPort = initialPort;
  let attempts = 0;
  
  const tryBinding = () => {
    server.listen(currentPort);
  };
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      attempts++;
      if (attempts < maxAttempts) {
        currentPort++;
        console.log(`⚠️ Port ${currentPort - 1} is in use, trying port ${currentPort}...`);
        tryBinding();
      } else {
        console.error(`❌ Could not find an available port after ${maxAttempts} attempts.`);
      }
    } else {
      console.error('Server error:', err);
    }
  });
  
  // Rest of the code...
};
```

### Database connection issues
1. Make sure PostgreSQL is running
2. Check the DATABASE_URL in your `.env` file
3. Try running `docker compose down` and then `docker compose up -d postgres` 

### BigInt serialization
The application handles BigInt serialization from Prisma raw queries:

```javascript
// Convert BigInt to Number for JSON serialization
const priorityCounts = priorityCountsRaw.map(item => ({
  priority: item.priority,
  count: Number(item.count)
}));
```

### Prisma Studio
You can visually explore and edit your complex database using Prisma Studio:
```bash
npx prisma studio
```

### Transaction errors
If you encounter transaction errors, ensure that:
1. All relationships exist before referencing them
2. There are no circular dependencies
3. The database connection has enough available connections for transactions

## Conclusion

This Todo API project demonstrates how to build a complex REST API with Node.js, Express, and Prisma ORM featuring:

- Advanced database schema with multiple relationships
- Complex database operations (10+ queries per endpoint)
- Rich response data with statistics and related items
- Robust error handling and validation
- Transaction management for data consistency
- Automatic port configuration
- BigInt serialization for raw SQL queries
- Integrated API testing with Keploy

The application serves as a practical example of implementing complex database patterns in a real-world application.
