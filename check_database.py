#!/usr/bin/env python3
"""
Database query script to check users and tasks in the todo app database.
"""

import asyncio
import asyncpg
import os
from datetime import datetime

# Database configuration
DATABASE_URL = "postgresql://postgres:admin@localhost:5432/tododb"

async def check_database():
    """Check the database for users and tasks."""
    try:
        # Connect to the database
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connected to PostgreSQL database successfully!")
        print("=" * 60)
        
        # Check users table
        print("👥 USERS TABLE:")
        print("-" * 40)
        users = await conn.fetch("""
            SELECT id, username, email, created_at 
            FROM users 
            ORDER BY created_at DESC
        """)
        
        if users:
            print(f"Found {len(users)} user(s):")
            for user in users:
                created_at = user['created_at'].strftime("%Y-%m-%d %H:%M:%S") if user['created_at'] else "N/A"
                print(f"  • ID: {user['id']}")
                print(f"    Username: {user['username']}")
                print(f"    Email: {user['email']}")
                print(f"    Created: {created_at}")
                print()
        else:
            print("  No users found in the database.")
        
        print("=" * 60)
        
        # Check tasks table
        print("📋 TASKS TABLE:")
        print("-" * 40)
        tasks = await conn.fetch("""
            SELECT t.id, t.title, t.status, t.priority, t.created_at, u.username
            FROM tasks t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        """)
        
        if tasks:
            print(f"Found {len(tasks)} task(s):")
            for task in tasks:
                created_at = task['created_at'].strftime("%Y-%m-%d %H:%M:%S") if task['created_at'] else "N/A"
                print(f"  • ID: {task['id']}")
                print(f"    Title: {task['title']}")
                print(f"    Status: {task['status']}")
                print(f"    Priority: {task['priority']}")
                print(f"    Owner: {task['username']}")
                print(f"    Created: {created_at}")
                print()
        else:
            print("  No tasks found in the database.")
        
        print("=" * 60)
        
        # Get table information
        print("📊 TABLE STATISTICS:")
        print("-" * 40)
        
        # Count users
        user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        print(f"  Total Users: {user_count}")
        
        # Count tasks by status
        task_stats = await conn.fetch("""
            SELECT status, COUNT(*) as count
            FROM tasks
            GROUP BY status
            ORDER BY count DESC
        """)
        
        if task_stats:
            print("  Task Status Distribution:")
            for stat in task_stats:
                print(f"    - {stat['status']}: {stat['count']}")
        else:
            print("  No tasks to analyze.")
        
        # Count tasks by priority
        priority_stats = await conn.fetch("""
            SELECT priority, COUNT(*) as count
            FROM tasks
            GROUP BY priority
            ORDER BY count DESC
        """)
        
        if priority_stats:
            print("  Task Priority Distribution:")
            for stat in priority_stats:
                print(f"    - {stat['priority']}: {stat['count']}")
        
        await conn.close()
        print("\n✅ Database check completed successfully!")
        
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure PostgreSQL is running on localhost:5432")
        print("2. Check if database 'tododb' exists")
        print("3. Verify username 'postgres' and password 'admin'")
        print("4. Ensure the backend has been started at least once to create tables")

if __name__ == "__main__":
    print("🔍 Checking Todo App Database...")
    print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    asyncio.run(check_database())