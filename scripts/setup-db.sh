#!/bin/bash

# Database Setup Script for Todo API
# This script helps set up the PostgreSQL database for the Todo API

echo "🗄️  Todo API Database Setup"
echo "================================"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   On macOS: brew install postgresql"
    echo "   On Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

echo "✅ PostgreSQL is installed"

# Database configuration
DB_NAME="todo_db"
DB_USER="postgres"

echo "📋 Setting up database: $DB_NAME"

# Create database (if it doesn't exist)
echo "Creating database if it doesn't exist..."
createdb $DB_NAME 2>/dev/null || echo "Database $DB_NAME already exists or couldn't be created"

echo "✅ Database setup complete!"
echo ""
echo "🔧 Next steps:"
echo "1. Make sure your .env file has the correct DATABASE_URL"
echo "2. Run: npm run db:migrate"
echo "3. Run: npm run db:seed (optional - adds sample data)"
echo "4. Run: npm run dev"
echo ""
echo "🌐 Your API will be available at: http://localhost:3000"
