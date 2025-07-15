require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const http = require('http');

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all todos with complex queries
app.get('/api/todos', async (req, res) => {
  try {
    console.log('🔍 Processing GET /api/todos with complex queries');
    const { page = 1, limit = 10, completed, search, priority, category, user, tag } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // 1. Get total count of todos
    const totalTodosCount = await prisma.todo.count();
    console.log(`📊 Total todos count: ${totalTodosCount}`);
    
    // 2. Get categories count
    const categoriesCount = await prisma.category.count();
    console.log(`📊 Categories count: ${categoriesCount}`);
    
    // 3. Get users count
    const usersCount = await prisma.user.count();
    console.log(`📊 Users count: ${usersCount}`);
    
    // 4. Get tags count
    const tagsCount = await prisma.tag.count();
    console.log(`📊 Tags count: ${tagsCount}`);
    
    // 5. Build complex where clause
    let where = {};
    
    if (completed !== undefined) {
      where.completed = completed === 'true';
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    if (category) {
      where.categoryId = parseInt(category);
    }
    
    if (user) {
      where.userId = parseInt(user);
    }
    
    if (tag) {
      where.tags = {
        some: {
          tagId: parseInt(tag)
        }
      };
    }
    
    console.log(`🔍 Applied filters: ${JSON.stringify(where)}`);
    
    // 6. Get todos with pagination and filters
    const todos = await prisma.todo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        category: true,
        user: true,
        tags: {
          include: {
            tag: true
          }
        },
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        dependencies: {
          select: {
            id: true,
            title: true
          }
        },
        dependencyOf: {
          select: {
            id: true,
            title: true
          }
        },
        history: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        attachments: true
      }
    });
    console.log(`📋 Retrieved ${todos.length} todos with full relations`);
    
    // 7. Get filtered count (with the same where clause)
    const filteredCount = await prisma.todo.count({ where });
    console.log(`📊 Filtered todos count: ${filteredCount}`);
    
    // 8. Get completed todos count
    const completedCount = await prisma.todo.count({ where: { completed: true } });
    console.log(`📊 Completed todos count: ${completedCount}`);
    
    // 9. Get count by priority
    const priorityCountsRaw = await prisma.$queryRaw`
      SELECT "priority", COUNT(*) as "count" 
      FROM "todos" 
      GROUP BY "priority"
    `;
    
    // Convert BigInt to Number for JSON serialization
    const priorityCounts = priorityCountsRaw.map(item => ({
      priority: item.priority,
      count: Number(item.count)
    }));
    console.log(`📊 Todos by priority: ${JSON.stringify(priorityCounts)}`);
    
    // 10. Get count by category
    const categoryCountsRaw = await prisma.$queryRaw`
      SELECT c."name", COUNT(t."id") as "count" 
      FROM "categories" c
      LEFT JOIN "todos" t ON t."categoryId" = c."id"
      GROUP BY c."id", c."name"
    `;
    
    // Convert BigInt to Number for JSON serialization
    const categoryCounts = categoryCountsRaw.map(item => ({
      name: item.name,
      count: Number(item.count)
    }));
    console.log(`📊 Todos by category: ${JSON.stringify(categoryCounts)}`);
    
    // 11. Get recently updated todos
    const recentlyUpdated = await prisma.todo.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        id: true,
        title: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    });
    console.log(`📋 Retrieved ${recentlyUpdated.length} recently updated todos`);
    
    // 12. Get most used tags
    const mostUsedTags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            todos: true
          }
        }
      },
      orderBy: {
        todos: {
          _count: 'desc'
        }
      },
      take: 5
    });
    console.log(`🏷️ Retrieved ${mostUsedTags.length} most used tags`);
    
    // Prepare response
    const response = {
      data: todos.map(todo => ({
        ...todo,
        tags: todo.tags.map(t => t.tag)
      })),
      pagination: {
        total: filteredCount,
        totalPages: Math.ceil(filteredCount / take),
        currentPage: parseInt(page),
        limit: take
      },
      stats: {
        total: totalTodosCount,
        completed: completedCount,
        byPriority: priorityCounts,
        byCategory: categoryCounts
      },
      recentlyUpdated,
      mostUsedTags: mostUsedTags.map(tag => ({
        id: tag.id,
        name: tag.name,
        count: tag._count.todos
      }))
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// GET todo by id with complex queries
app.get('/api/todos/:id', async (req, res) => {
  try {
    console.log(`🔍 Processing GET /api/todos/${req.params.id} with complex queries`);
    const id = parseInt(req.params.id);
    
    // 1. Get the todo with all relations
    const todo = await prisma.todo.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
        tags: {
          include: {
            tag: true
          }
        },
        notes: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        dependencies: {
          select: {
            id: true,
            title: true,
            completed: true,
            priority: true
          }
        },
        dependencyOf: {
          select: {
            id: true,
            title: true,
            completed: true,
            priority: true
          }
        },
        history: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        attachments: true
      }
    });
    
    if (!todo) {
      console.log(`❌ Todo with ID ${id} not found`);
      return res.status(404).json({ error: 'Todo not found' });
    }
    
    // 2. Get similar todos (same category)
    const similarTodos = await prisma.todo.findMany({
      where: {
        categoryId: todo.categoryId,
        id: { not: id }
      },
      select: {
        id: true,
        title: true,
        completed: true,
        priority: true
      },
      take: 5
    });
    console.log(`📋 Found ${similarTodos.length} similar todos in same category`);
    
    // 3. Get todos by same user
    const userTodos = todo.userId ? await prisma.todo.findMany({
      where: {
        userId: todo.userId,
        id: { not: id }
      },
      select: {
        id: true,
        title: true,
        completed: true,
        priority: true
      },
      take: 5
    }) : [];
    console.log(`📋 Found ${userTodos.length} other todos by same user`);
    
    // 4. Get todos with same tags
    const tagIds = todo.tags.map(t => t.tagId);
    const relatedByTags = tagIds.length > 0 ? await prisma.todo.findMany({
      where: {
        id: { not: id },
        tags: {
          some: {
            tagId: { in: tagIds }
          }
        }
      },
      select: {
        id: true,
        title: true,
        tags: {
          include: {
            tag: true
          }
        }
      },
      take: 5
    }) : [];
    console.log(`📋 Found ${relatedByTags.length} todos with similar tags`);
    
    // 5. Get history count
    const historyCount = await prisma.todoHistory.count({
      where: { todoId: id }
    });
    console.log(`📊 Todo has ${historyCount} history entries`);
    
    // 6. Get notes count
    const notesCount = await prisma.note.count({
      where: { todoId: id }
    });
    console.log(`📊 Todo has ${notesCount} notes`);
    
    // 7. Get attachments count
    const attachmentsCount = await prisma.attachment.count({
      where: { todoId: id }
    });
    console.log(`📊 Todo has ${attachmentsCount} attachments`);
    
    // 8. Get dependencies count
    const dependenciesCount = await prisma.todo.count({
      where: {
        dependencyOf: {
          some: {
            id
          }
        }
      }
    });
    console.log(`📊 Todo has ${dependenciesCount} dependencies`);
    
    // 9. Check if all dependencies are completed
    const uncompletedDependencies = await prisma.todo.count({
      where: {
        dependencyOf: {
          some: {
            id
          }
        },
        completed: false
      }
    });
    const allDependenciesCompleted = uncompletedDependencies === 0;
    console.log(`📊 All dependencies completed: ${allDependenciesCompleted}`);
    
    // 10. Get recent changes
    const recentChanges = await prisma.todoHistory.findMany({
      where: {
        todoId: id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    console.log(`📋 Retrieved ${recentChanges.length} recent changes`);
    
    // 11. Count todos with same priority
    const samePriorityCount = await prisma.todo.count({
      where: {
        priority: todo.priority,
        id: { not: id }
      }
    });
    console.log(`📊 Found ${samePriorityCount} other todos with ${todo.priority} priority`);
    
    // 12. Build complex response
    const response = {
      todo: {
        ...todo,
        tags: todo.tags.map(t => t.tag)
      },
      related: {
        similarTodos,
        userTodos,
        relatedByTags: relatedByTags.map(t => ({
          ...t,
          tags: t.tags.map(tag => tag.tag)
        }))
      },
      stats: {
        historyCount,
        notesCount,
        attachmentsCount,
        dependenciesCount,
        allDependenciesCompleted,
        samePriorityCount
      },
      recentChanges
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ error: 'Failed to fetch todo' });
  }
});

// CREATE todo with complex operations
app.post('/api/todos', async (req, res) => {
  try {
    console.log('🔍 Processing POST /api/todos with complex operations');
    const { 
      title, 
      description, 
      priority, 
      categoryId, 
      userId, 
      tagIds = [], 
      notes = [], 
      dependencies = [] 
    } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // 1. Validate category exists if provided
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });
      
      if (!categoryExists) {
        return res.status(400).json({ error: 'Category not found' });
      }
      console.log(`✅ Validated category ID ${categoryId}`);
    }
    
    // 2. Validate user exists if provided
    if (userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: parseInt(userId) }
      });
      
      if (!userExists) {
        return res.status(400).json({ error: 'User not found' });
      }
      console.log(`✅ Validated user ID ${userId}`);
    }
    
    // 3. Validate tags exist
    if (tagIds.length > 0) {
      const tagCount = await prisma.tag.count({
        where: {
          id: { in: tagIds.map(id => parseInt(id)) }
        }
      });
      
      if (tagCount !== tagIds.length) {
        return res.status(400).json({ error: 'Some tags not found' });
      }
      console.log(`✅ Validated ${tagIds.length} tags`);
    }
    
    // 4. Validate dependencies exist
    if (dependencies.length > 0) {
      const depCount = await prisma.todo.count({
        where: {
          id: { in: dependencies.map(id => parseInt(id)) }
        }
      });
      
      if (depCount !== dependencies.length) {
        return res.status(400).json({ error: 'Some dependencies not found' });
      }
      console.log(`✅ Validated ${dependencies.length} dependencies`);
    }
    
    // 5. Count todos for user
    let userTodoCount = 0;
    if (userId) {
      userTodoCount = await prisma.todo.count({
        where: { userId: parseInt(userId) }
      });
      console.log(`📊 User has ${userTodoCount} existing todos`);
    }
    
    // 6. Count todos in category
    let categoryTodoCount = 0;
    if (categoryId) {
      categoryTodoCount = await prisma.todo.count({
        where: { categoryId: parseInt(categoryId) }
      });
      console.log(`📊 Category has ${categoryTodoCount} existing todos`);
    }
    
    // 7. Count todos with same priority
    const priorityTodoCount = await prisma.todo.count({
      where: { priority: priority || 'MEDIUM' }
    });
    console.log(`📊 Found ${priorityTodoCount} existing todos with priority ${priority || 'MEDIUM'}`);
    
    // 8. Count all todos
    const totalTodoCount = await prisma.todo.count();
    console.log(`📊 Total todos in system: ${totalTodoCount}`);
    
    // 9. Create the todo with all relations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the todo
      const todo = await tx.todo.create({
        data: {
          title,
          description: description || null,
          priority: priority || 'MEDIUM',
          userId: userId ? parseInt(userId) : null,
          categoryId: categoryId ? parseInt(categoryId) : null,
          dependencies: dependencies.length > 0 ? {
            connect: dependencies.map(depId => ({ id: parseInt(depId) }))
          } : undefined
        }
      });
      console.log(`✅ Created todo with ID ${todo.id}`);
      
      // Add tags
      if (tagIds.length > 0) {
        for (const tagId of tagIds) {
          await tx.tagsOnTodos.create({
            data: {
              todoId: todo.id,
              tagId: parseInt(tagId)
            }
          });
        }
        console.log(`✅ Added ${tagIds.length} tags to todo`);
      }
      
      // Add notes
      if (notes.length > 0) {
        for (const noteContent of notes) {
          await tx.note.create({
            data: {
              todoId: todo.id,
              content: noteContent
            }
          });
        }
        console.log(`✅ Added ${notes.length} notes to todo`);
      }
      
      // Create history entry
      await tx.todoHistory.create({
        data: {
          todoId: todo.id,
          action: 'CREATED',
          description: 'Todo was created'
        }
      });
      console.log(`✅ Added creation history entry for todo`);
      
      return todo;
    });
    
    // 10. Get the created todo with all relations
    const createdTodo = await prisma.todo.findUnique({
      where: { id: result.id },
      include: {
        category: true,
        user: true,
        tags: {
          include: {
            tag: true
          }
        },
        notes: true,
        dependencies: {
          select: {
            id: true,
            title: true
          }
        },
        history: true
      }
    });
    
    console.log(`🎉 Successfully completed creation of todo ID ${result.id}`);
    
    res.status(201).json({
      todo: {
        ...createdTodo,
        tags: createdTodo.tags.map(t => t.tag)
      },
      stats: {
        userTodoCount: userTodoCount + 1,
        categoryTodoCount: categoryTodoCount + 1,
        totalTodoCount: totalTodoCount + 1
      }
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// UPDATE todo with complex operations
app.put('/api/todos/:id', async (req, res) => {
  try {
    console.log(`🔍 Processing PUT /api/todos/${req.params.id} with complex operations`);
    const id = parseInt(req.params.id);
    const { 
      title, 
      description, 
      completed, 
      priority, 
      categoryId, 
      userId,
      tagIds,
      notes,
      dependencies,
      removeTags = [],
      removeNotes = [],
      removeDependencies = []
    } = req.body;
    
    // 1. Check if todo exists
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
      include: {
        tags: true,
        notes: true,
        dependencies: true
      }
    });
    
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    console.log(`✅ Found existing todo with ID ${id}`);
    
    // 2. Validate category exists if provided
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: parseInt(categoryId) }
      });
      
      if (!categoryExists) {
        return res.status(400).json({ error: 'Category not found' });
      }
      console.log(`✅ Validated category ID ${categoryId}`);
    }
    
    // 3. Validate user exists if provided
    if (userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: parseInt(userId) }
      });
      
      if (!userExists) {
        return res.status(400).json({ error: 'User not found' });
      }
      console.log(`✅ Validated user ID ${userId}`);
    }
    
    // 4. Track changes for history
    const changes = [];
    if (title !== undefined && title !== existingTodo.title) changes.push('title');
    if (description !== undefined && description !== existingTodo.description) changes.push('description');
    if (completed !== undefined && completed !== existingTodo.completed) changes.push('completed');
    if (priority !== undefined && priority !== existingTodo.priority) changes.push('priority');
    if (categoryId !== undefined && categoryId !== existingTodo.categoryId) changes.push('category');
    if (userId !== undefined && userId !== existingTodo.userId) changes.push('user');
    if (tagIds && tagIds.length > 0) changes.push('tags');
    if (notes && notes.length > 0) changes.push('notes');
    if (dependencies && dependencies.length > 0) changes.push('dependencies');
    
    console.log(`📋 Detected changes in fields: ${changes.join(', ')}`);
    
    // 5. Validate tags exist if adding new ones
    if (tagIds && tagIds.length > 0) {
      const tagCount = await prisma.tag.count({
        where: {
          id: { in: tagIds.map(id => parseInt(id)) }
        }
      });
      
      if (tagCount !== tagIds.length) {
        return res.status(400).json({ error: 'Some tags not found' });
      }
      console.log(`✅ Validated ${tagIds.length} tags to add`);
    }
    
    // 6. Validate dependencies exist if adding new ones
    if (dependencies && dependencies.length > 0) {
      const depCount = await prisma.todo.count({
        where: {
          id: { in: dependencies.map(id => parseInt(id)) }
        }
      });
      
      if (depCount !== dependencies.length) {
        return res.status(400).json({ error: 'Some dependencies not found' });
      }
      console.log(`✅ Validated ${dependencies.length} dependencies to add`);
    }
    
    // 7. Check for circular dependencies
    if (dependencies && dependencies.length > 0) {
      // Ensure the todo doesn't depend on itself
      if (dependencies.includes(id)) {
        return res.status(400).json({ error: 'A todo cannot depend on itself' });
      }
      
      // Check for circular dependencies - todos that depend on this todo
      const todosThatDependOnThis = await prisma.todo.findMany({
        where: {
          dependencies: {
            some: {
              id
            }
          }
        },
        select: { id: true }
      });
      
      const dependentIds = todosThatDependOnThis.map(t => t.id);
      const hasCircularDep = dependencies.some(depId => 
        dependentIds.includes(parseInt(depId))
      );
      
      if (hasCircularDep) {
        return res.status(400).json({ error: 'Circular dependency detected' });
      }
      console.log(`✅ No circular dependencies detected`);
    }
    
    // 8. Check notes to remove exist
    if (removeNotes && removeNotes.length > 0) {
      const noteCount = await prisma.note.count({
        where: {
          id: { in: removeNotes.map(id => parseInt(id)) },
          todoId: id
        }
      });
      
      if (noteCount !== removeNotes.length) {
        return res.status(400).json({ error: 'Some notes to remove not found' });
      }
      console.log(`✅ Validated ${removeNotes.length} notes to remove`);
    }
    
    // 9. Perform update in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update the todo
      const todo = await tx.todo.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          completed: completed !== undefined ? completed : undefined,
          priority: priority !== undefined ? priority : undefined,
          categoryId: categoryId !== undefined ? parseInt(categoryId) : undefined,
          userId: userId !== undefined ? parseInt(userId) : undefined,
        }
      });
      console.log(`✅ Updated core todo fields`);
      
      // Remove tags if specified
      if (removeTags && removeTags.length > 0) {
        await tx.tagsOnTodos.deleteMany({
          where: {
            todoId: id,
            tagId: { in: removeTags.map(tagId => parseInt(tagId)) }
          }
        });
        console.log(`✅ Removed ${removeTags.length} tags`);
      }
      
      // Add new tags if specified
      if (tagIds && tagIds.length > 0) {
        // Get existing tags to avoid duplicates
        const existingTags = await tx.tagsOnTodos.findMany({
          where: { todoId: id },
          select: { tagId: true }
        });
        const existingTagIds = existingTags.map(t => t.tagId);
        
        for (const tagId of tagIds) {
          const parsedId = parseInt(tagId);
          if (!existingTagIds.includes(parsedId)) {
            await tx.tagsOnTodos.create({
              data: {
                todoId: id,
                tagId: parsedId
              }
            });
          }
        }
        console.log(`✅ Added new tags`);
      }
      
      // Add new notes if specified
      if (notes && notes.length > 0) {
        for (const noteContent of notes) {
          await tx.note.create({
            data: {
              todoId: id,
              content: noteContent
            }
          });
        }
        console.log(`✅ Added ${notes.length} new notes`);
      }
      
      // Remove notes if specified
      if (removeNotes && removeNotes.length > 0) {
        await tx.note.deleteMany({
          where: {
            id: { in: removeNotes.map(noteId => parseInt(noteId)) }
          }
        });
        console.log(`✅ Removed ${removeNotes.length} notes`);
      }
      
      // Handle dependencies
      if (dependencies && dependencies.length > 0) {
        // Connect new dependencies
        await tx.todo.update({
          where: { id },
          data: {
            dependencies: {
              connect: dependencies.map(depId => ({ id: parseInt(depId) }))
            }
          }
        });
        console.log(`✅ Added dependencies`);
      }
      
      // Remove dependencies if specified
      if (removeDependencies && removeDependencies.length > 0) {
        await tx.todo.update({
          where: { id },
          data: {
            dependencies: {
              disconnect: removeDependencies.map(depId => ({ id: parseInt(depId) }))
            }
          }
        });
        console.log(`✅ Removed dependencies`);
      }
      
      // Add history entry for the update
      await tx.todoHistory.create({
        data: {
          todoId: id,
          action: 'UPDATED',
          description: `Updated fields: ${changes.join(', ')}`
        }
      });
      console.log(`✅ Added history entry for update`);
      
      return todo;
    });
    
    // 10. Get the updated todo with all relations
    const updatedTodo = await prisma.todo.findUnique({
      where: { id },
      include: {
        category: true,
        user: true,
        tags: {
          include: {
            tag: true
          }
        },
        notes: true,
        dependencies: {
          select: {
            id: true,
            title: true,
            completed: true
          }
        },
        dependencyOf: {
          select: {
            id: true,
            title: true,
            completed: true
          }
        },
        history: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }
      }
    });
    
    console.log(`🎉 Successfully completed update of todo ID ${id}`);
    
    res.json({
      todo: {
        ...updatedTodo,
        tags: updatedTodo.tags.map(t => t.tag)
      },
      changedFields: changes
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE todo with complex operations
app.delete('/api/todos/:id', async (req, res) => {
  try {
    console.log(`🔍 Processing DELETE /api/todos/${req.params.id} with complex operations`);
    const id = parseInt(req.params.id);
    
    // 1. Check if todo exists with relations
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
      include: {
        tags: true,
        notes: true,
        attachments: true,
        history: true,
        dependencies: true,
        dependencyOf: true
      }
    });
    
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    console.log(`✅ Found todo to delete with ID ${id}`);
    
    // 2. Check if this todo is a dependency for others
    const dependentTodos = await prisma.todo.findMany({
      where: {
        dependencies: {
          some: {
            id
          }
        }
      },
      select: {
        id: true,
        title: true
      }
    });
    
    console.log(`📊 Found ${dependentTodos.length} todos dependent on this one`);
    
    // 3. Count relations
    const tagCount = existingTodo.tags.length;
    const noteCount = existingTodo.notes.length;
    const attachmentCount = existingTodo.attachments.length;
    const historyCount = existingTodo.history.length;
    const dependencyCount = existingTodo.dependencies.length;
    
    console.log(`📊 Todo has: ${tagCount} tags, ${noteCount} notes, ${attachmentCount} attachments, ${historyCount} history entries, ${dependencyCount} dependencies`);
    
    // 4. Get related data counts for statistics
    const userTodoCount = existingTodo.userId ? await prisma.todo.count({
      where: {
        userId: existingTodo.userId
      }
    }) : 0;
    
    const categoryTodoCount = existingTodo.categoryId ? await prisma.todo.count({
      where: {
        categoryId: existingTodo.categoryId
      }
    }) : 0;
    
    console.log(`📊 User has ${userTodoCount} todos, Category has ${categoryTodoCount} todos`);
    
    // 5. Find todos with similar tags
    const tagIds = existingTodo.tags.map(t => t.tagId);
    const todosWithSimilarTags = tagIds.length > 0 ? await prisma.todo.count({
      where: {
        id: { not: id },
        tags: {
          some: {
            tagId: { in: tagIds }
          }
        }
      }
    }) : 0;
    
    console.log(`📊 Found ${todosWithSimilarTags} todos with similar tags`);
    
    // 6. Calculate statistics about the todo
    const ageInDays = Math.floor((Date.now() - existingTodo.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const completionTime = existingTodo.completed 
      ? Math.floor((existingTodo.updatedAt.getTime() - existingTodo.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    console.log(`📊 Todo age: ${ageInDays} days, Completion time: ${completionTime ?? 'not completed'} days`);
    
    // 7. Check for any attachments that need special handling
    const hasAttachments = existingTodo.attachments.length > 0;
    
    console.log(`📊 Todo has attachments: ${hasAttachments}`);
    
    // 8. Calculate system impact
    const totalTodoCount = await prisma.todo.count();
    const percentOfSystem = ((1 / totalTodoCount) * 100).toFixed(2);
    
    console.log(`📊 Todo represents ${percentOfSystem}% of all todos`);
    
    // 9. Delete the todo and all relations in a transaction
    await prisma.$transaction(async (tx) => {
      // Automatically cascades to delete related tagsOnTodos, notes, history, and attachments
      // thanks to the onDelete: Cascade in our schema
      await tx.todo.delete({
        where: { id }
      });
      
      console.log(`✅ Deleted todo ID ${id} and all its relations`);
    });
    
    // 10. Update dependent todos to remove this dependency
    if (dependentTodos.length > 0) {
      console.log(`📊 Updating ${dependentTodos.length} dependent todos`);
      
      // In a real app, you might want to add history entries for each dependent todo
      // or notify users that a dependency was removed
      console.log(`✅ Dependencies have been automatically removed by the database`);
    }
    
    console.log(`🎉 Successfully completed deletion of todo ID ${id}`);
    
    res.json({
      id,
      deleted: true,
      stats: {
        relations: {
          tags: tagCount,
          notes: noteCount,
          attachments: attachmentCount,
          history: historyCount,
          dependencies: dependencyCount,
          dependents: dependentTodos.length
        },
        impact: {
          userTodoCount: userTodoCount - 1,
          categoryTodoCount: categoryTodoCount - 1,
          totalTodoCount: totalTodoCount - 1,
          percentOfSystem
        },
        todo: {
          ageInDays,
          completionTime
        }
      },
      dependentTodos
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// TOGGLE todo completion with complex operations
app.patch('/api/todos/:id/toggle', async (req, res) => {
  try {
    console.log(`🔍 Processing PATCH /api/todos/${req.params.id}/toggle with complex operations`);
    const id = parseInt(req.params.id);
    
    // 1. Check if todo exists
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
      include: {
        dependencies: {
          select: {
            id: true,
            title: true,
            completed: true
          }
        },
        dependencyOf: {
          select: {
            id: true,
            title: true,
            completed: true
          }
        }
      }
    });
    
    if (!existingTodo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    console.log(`✅ Found todo to toggle with ID ${id}`);
    
    // 2. Check dependencies if completing
    const uncompletedDependencies = !existingTodo.completed ? existingTodo.dependencies.filter(d => !d.completed) : [];
    if (!existingTodo.completed && uncompletedDependencies.length > 0) {
      console.log(`⚠️ Found ${uncompletedDependencies.length} uncompleted dependencies`);
    }
    
    // 3. Get user's completion statistics
    let userCompletionStats = null;
    if (existingTodo.userId) {
      const userTodos = await prisma.todo.count({
        where: {
          userId: existingTodo.userId
        }
      });
      
      const userCompletedTodos = await prisma.todo.count({
        where: {
          userId: existingTodo.userId,
          completed: true
        }
      });
      
      userCompletionStats = {
        total: userTodos,
        completed: userCompletedTodos,
        completionRate: ((userCompletedTodos / userTodos) * 100).toFixed(2)
      };
      console.log(`📊 User completion stats: ${userCompletionStats.completionRate}% complete`);
    }
    
    // 4. Get category completion statistics
    let categoryCompletionStats = null;
    if (existingTodo.categoryId) {
      const categoryTodos = await prisma.todo.count({
        where: {
          categoryId: existingTodo.categoryId
        }
      });
      
      const categoryCompletedTodos = await prisma.todo.count({
        where: {
          categoryId: existingTodo.categoryId,
          completed: true
        }
      });
      
      categoryCompletionStats = {
        total: categoryTodos,
        completed: categoryCompletedTodos,
        completionRate: ((categoryCompletedTodos / categoryTodos) * 100).toFixed(2)
      };
      console.log(`📊 Category completion stats: ${categoryCompletionStats.completionRate}% complete`);
    }
    
    // 5. Calculate time metrics
    const now = new Date();
    const createdAt = existingTodo.createdAt;
    const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`📊 Todo age: ${ageInDays} days`);
    
    // 6. Get overall system completion statistics
    const totalTodos = await prisma.todo.count();
    const totalCompletedTodos = await prisma.todo.count({
      where: {
        completed: true
      }
    });
    
    const systemCompletionRate = ((totalCompletedTodos / totalTodos) * 100).toFixed(2);
    console.log(`📊 System completion rate: ${systemCompletionRate}% complete`);
    
    // 7. Check how many todos depend on this one
    const dependentTodosCount = await prisma.todo.count({
      where: {
        dependencies: {
          some: {
            id
          }
        }
      }
    });
    
    console.log(`📊 ${dependentTodosCount} todos depend on this one`);
    
    // 8. Check if any dependent todos are blocked by this one
    const blockedTodos = await prisma.todo.findMany({
      where: {
        dependencies: {
          some: {
            id
          }
        },
        // Only todos that have all other dependencies completed would be unblocked
        NOT: {
          dependencies: {
            some: {
              id: { not: id },
              completed: false
            }
          }
        }
      },
      select: {
        id: true,
        title: true
      }
    });
    
    console.log(`📊 ${blockedTodos.length} todos will be unblocked if this is completed`);
    
    // 9. Get similar todos with same priority and completion status
    const similarTodos = await prisma.todo.count({
      where: {
        id: { not: id },
        priority: existingTodo.priority,
        completed: existingTodo.completed
      }
    });
    
    console.log(`📊 Found ${similarTodos} todos with same priority and completion status`);
    
    // 10. Perform the toggle in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Toggle the completion status
      const newCompletionStatus = !existingTodo.completed;
      const todo = await tx.todo.update({
        where: { id },
        data: {
          completed: newCompletionStatus
        }
      });
      
      // Add history entry
      await tx.todoHistory.create({
        data: {
          todoId: id,
          action: newCompletionStatus ? 'COMPLETED' : 'REOPENED',
          description: newCompletionStatus 
            ? `Todo was marked as completed` 
            : `Todo was reopened`
        }
      });
      
      return todo;
    });
    
    // Collect updated metrics after the change
    const newSystemCompletionRate = result.completed 
      ? (((totalCompletedTodos + 1) / totalTodos) * 100).toFixed(2)
      : (((totalCompletedTodos - 1) / totalTodos) * 100).toFixed(2);
    
    console.log(`🎉 Successfully toggled todo ID ${id} to ${result.completed ? 'completed' : 'not completed'}`);
    
    res.json({
      todo: result,
      dependencyStatus: {
        uncompletedDependencies,
        dependentTodosCount,
        blockedTodos: result.completed ? blockedTodos : []
      },
      stats: {
        user: userCompletionStats,
        category: categoryCompletionStats,
        system: {
          previousCompletionRate: systemCompletionRate,
          newCompletionRate: newSystemCompletionRate,
          totalTodos,
          totalCompletedTodos: result.completed ? totalCompletedTodos + 1 : totalCompletedTodos - 1
        },
        todo: {
          ageInDays,
          timeToComplete: result.completed ? ageInDays : null
        }
      }
    });
  } catch (error) {
    console.error('Error toggling todo:', error);
    res.status(500).json({ error: 'Failed to toggle todo' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Create HTTP server
const server = http.createServer(app);

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
  
  server.on('listening', () => {
    const address = server.address();
    const port = address.port;
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`📚 API documentation:`);
    console.log(`  GET    /health                - Health check`);
    console.log(`  GET    /api/todos             - Get all todos`);
    console.log(`  GET    /api/todos/:id         - Get todo by ID`);
    console.log(`  POST   /api/todos             - Create new todo`);
    console.log(`  PUT    /api/todos/:id         - Update todo`);
    console.log(`  DELETE /api/todos/:id         - Delete todo`);
    console.log(`  PATCH  /api/todos/:id/toggle  - Toggle completion`);
  });
  
  tryBinding();
};

// Start with the initial preferred port
const PORT = parseInt(process.env.PORT) || 3000;
startServer(PORT);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Graceful shutdown...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Graceful shutdown...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
});
