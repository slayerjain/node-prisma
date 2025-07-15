const { PrismaClient, Priority } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  console.log('🧹 Clearing existing data...');
  await prisma.$transaction([
    prisma.attachment.deleteMany(),
    prisma.todoHistory.deleteMany(),
    prisma.note.deleteMany(),
    prisma.tagsOnTodos.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.todo.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create users
  console.log('👤 Creating sample users...');
  const users = [
    { name: 'John Doe', email: 'john@example.com' },
    { name: 'Jane Smith', email: 'jane@example.com' },
    { name: 'Admin User', email: 'admin@example.com' },
  ];

  const createdUsers = [];
  for (const user of users) {
    const createdUser = await prisma.user.create({ data: user });
    createdUsers.push(createdUser);
    console.log(`✅ Created user: ${createdUser.name}`);
  }

  // Create categories
  console.log('📋 Creating sample categories...');
  const categories = [
    { name: 'Work', description: 'Work-related tasks' },
    { name: 'Personal', description: 'Personal tasks' },
    { name: 'Health', description: 'Health and fitness tasks' },
    { name: 'Learning', description: 'Educational tasks' },
    { name: 'Home', description: 'Home and household tasks' },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const createdCategory = await prisma.category.create({ data: category });
    createdCategories.push(createdCategory);
    console.log(`✅ Created category: ${createdCategory.name}`);
  }

  // Create tags
  console.log('🏷️ Creating sample tags...');
  const tags = [
    { name: 'urgent' },
    { name: 'important' },
    { name: 'easy' },
    { name: 'hard' },
    { name: 'bug' },
    { name: 'feature' },
    { name: 'api' },
    { name: 'frontend' },
    { name: 'backend' },
    { name: 'database' },
  ];

  const createdTags = [];
  for (const tag of tags) {
    const createdTag = await prisma.tag.create({ data: tag });
    createdTags.push(createdTag);
    console.log(`✅ Created tag: ${createdTag.name}`);
  }

  // Create sample todos
  console.log('📝 Creating sample todos...');
  const sampleTodos = [
    {
      title: 'Setup development environment',
      description: 'Install Node.js, PostgreSQL, and configure the project',
      completed: true,
      priority: Priority.HIGH,
      userId: createdUsers[0].id,
      categoryId: createdCategories[0].id,
    },
    {
      title: 'Learn Prisma ORM',
      description: 'Go through Prisma documentation and understand the concepts',
      completed: false,
      priority: Priority.MEDIUM,
      userId: createdUsers[0].id,
      categoryId: createdCategories[3].id,
    },
    {
      title: 'Build REST API endpoints',
      description: 'Create CRUD operations for todo management',
      completed: true,
      priority: Priority.HIGH,
      userId: createdUsers[1].id,
      categoryId: createdCategories[0].id,
    },
    {
      title: 'Add input validation',
      description: 'Implement proper request validation and error handling',
      completed: false,
      priority: Priority.MEDIUM,
      userId: createdUsers[1].id,
      categoryId: createdCategories[0].id,
    },
    {
      title: 'Write API documentation',
      description: 'Document all API endpoints with examples',
      completed: false,
      priority: Priority.LOW,
      userId: createdUsers[2].id,
      categoryId: createdCategories[0].id,
    },
    {
      title: 'Go for a run',
      description: 'Run 5km in the park',
      completed: false,
      priority: Priority.MEDIUM,
      userId: createdUsers[0].id,
      categoryId: createdCategories[2].id,
    },
    {
      title: 'Grocery shopping',
      description: 'Buy vegetables, fruits, and milk',
      completed: false,
      priority: Priority.LOW,
      userId: createdUsers[1].id,
      categoryId: createdCategories[4].id,
    },
    {
      title: 'Read book on design patterns',
      description: 'Finish chapter on Factory pattern',
      completed: false,
      priority: Priority.LOW,
      userId: createdUsers[2].id,
      categoryId: createdCategories[3].id,
    },
    {
      title: 'Fix the kitchen sink',
      description: 'Check for leaks and repair if needed',
      completed: false,
      priority: Priority.URGENT,
      userId: createdUsers[0].id,
      categoryId: createdCategories[4].id,
    },
    {
      title: 'Plan team meeting',
      description: 'Prepare agenda and send invites',
      completed: false,
      priority: Priority.HIGH,
      userId: createdUsers[1].id,
      categoryId: createdCategories[0].id,
    },
  ];

  const createdTodos = [];
  for (const todo of sampleTodos) {
    const createdTodo = await prisma.todo.create({
      data: todo
    });
    createdTodos.push(createdTodo);
    console.log(`✅ Created todo: ${createdTodo.title}`);
  }

  // Add dependencies between todos
  console.log('� Creating todo dependencies...');
  await prisma.todo.update({
    where: { id: createdTodos[3].id }, // Add input validation
    data: {
      dependencies: {
        connect: [{ id: createdTodos[2].id }] // Build REST API endpoints
      }
    }
  });

  await prisma.todo.update({
    where: { id: createdTodos[4].id }, // Write API documentation
    data: {
      dependencies: {
        connect: [{ id: createdTodos[2].id }, { id: createdTodos[3].id }] // Build API endpoints & Add validation
      }
    }
  });

  // Add tags to todos
  console.log('🏷️ Assigning tags to todos...');
  for (let i = 0; i < createdTodos.length; i++) {
    const tagIndices = [i % createdTags.length, (i + 3) % createdTags.length, (i + 5) % createdTags.length];
    
    for (const tagIndex of tagIndices) {
      await prisma.tagsOnTodos.create({
        data: {
          todoId: createdTodos[i].id,
          tagId: createdTags[tagIndex].id
        }
      });
      console.log(`✅ Added tag ${createdTags[tagIndex].name} to todo: ${createdTodos[i].title}`);
    }
  }

  // Add notes to todos
  console.log('📋 Adding notes to todos...');
  for (let i = 0; i < createdTodos.length; i++) {
    const noteCount = (i % 3) + 1; // 1 to 3 notes per todo
    
    for (let j = 0; j < noteCount; j++) {
      await prisma.note.create({
        data: {
          todoId: createdTodos[i].id,
          content: `Note ${j + 1} for task: ${createdTodos[i].title}`
        }
      });
    }
    console.log(`✅ Added ${noteCount} notes to todo: ${createdTodos[i].title}`);
  }

  // Add history entries
  console.log('📜 Creating todo history...');
  for (let i = 0; i < createdTodos.length; i++) {
    await prisma.todoHistory.create({
      data: {
        todoId: createdTodos[i].id,
        action: 'CREATED',
        description: `Todo was created`
      }
    });
    
    if (createdTodos[i].completed) {
      await prisma.todoHistory.create({
        data: {
          todoId: createdTodos[i].id,
          action: 'COMPLETED',
          description: `Todo was marked as completed`
        }
      });
    } else if (i % 2 === 0) {
      await prisma.todoHistory.create({
        data: {
          todoId: createdTodos[i].id,
          action: 'UPDATED',
          description: `Priority was changed to ${createdTodos[i].priority}`
        }
      });
    }
    
    console.log(`✅ Added history entries to todo: ${createdTodos[i].title}`);
  }

  // Add attachments
  console.log('📎 Adding attachments to todos...');
  const attachmentTypes = [
    { filename: 'screenshot.png', mimeType: 'image/png', filepath: '/uploads/screenshot.png' },
    { filename: 'document.pdf', mimeType: 'application/pdf', filepath: '/uploads/document.pdf' },
    { filename: 'notes.txt', mimeType: 'text/plain', filepath: '/uploads/notes.txt' },
  ];
  
  for (let i = 0; i < 5; i++) { // Add attachments to first 5 todos
    const attachmentType = attachmentTypes[i % attachmentTypes.length];
    await prisma.attachment.create({
      data: {
        todoId: createdTodos[i].id,
        filename: `${createdTodos[i].id}_${attachmentType.filename}`,
        filepath: attachmentType.filepath,
        mimeType: attachmentType.mimeType
      }
    });
    console.log(`✅ Added attachment to todo: ${createdTodos[i].title}`);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
