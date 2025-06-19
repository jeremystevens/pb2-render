import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database schema
export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        website VARCHAR(255),
        location VARCHAR(100),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create pastes table - Modified to allow NULL author_id for anonymous pastes
    await client.query(`
      CREATE TABLE IF NOT EXISTS pastes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        syntax_language VARCHAR(50) NOT NULL DEFAULT 'text',
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_private BOOLEAN DEFAULT FALSE,
        is_zero_knowledge BOOLEAN DEFAULT FALSE,
        encrypted_content TEXT,
        expiration TIMESTAMP WITH TIME ZONE,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create paste_tags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS paste_tags (
        id SERIAL PRIMARY KEY,
        paste_id INTEGER REFERENCES pastes(id) ON DELETE CASCADE,
        tag VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        paste_id INTEGER REFERENCES pastes(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT TRUE,
        readme TEXT,
        license VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create project_collaborators table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_collaborators (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'collaborator',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      )
    `);
    
    // Create project_tags table
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_tags (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        tag VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    
    // Create ai_summaries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_summaries (
        id SERIAL PRIMARY KEY,
        paste_id INTEGER REFERENCES pastes(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        confidence DECIMAL(3,2) NOT NULL,
        model VARCHAR(50) NOT NULL,
        tokens INTEGER NOT NULL,
        approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create discussion tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_threads (
        id SERIAL PRIMARY KEY,
        paste_id INTEGER REFERENCES pastes(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_posts (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER REFERENCES discussion_threads(id) ON DELETE CASCADE,
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        parent_id INTEGER REFERENCES discussion_posts(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Track unique paste views by IP address
    await client.query(`
      CREATE TABLE IF NOT EXISTS paste_views (
        paste_id INTEGER REFERENCES pastes(id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NOT NULL,
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (paste_id, ip_address)
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pastes_author_id ON pastes(author_id);
      CREATE INDEX IF NOT EXISTS idx_pastes_created_at ON pastes(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_pastes_public ON pastes(is_private, is_zero_knowledge, expiration);
      CREATE INDEX IF NOT EXISTS idx_pastes_language ON pastes(syntax_language);
      CREATE INDEX IF NOT EXISTS idx_paste_tags_paste_id ON paste_tags(paste_id);
      CREATE INDEX IF NOT EXISTS idx_paste_tags_tag ON paste_tags(tag);
      CREATE INDEX IF NOT EXISTS idx_comments_paste_id ON comments(paste_id);
      CREATE INDEX IF NOT EXISTS idx_discussion_threads_paste_id ON discussion_threads(paste_id);
      CREATE INDEX IF NOT EXISTS idx_discussion_posts_thread_id ON discussion_posts(thread_id);
      CREATE INDEX IF NOT EXISTS idx_projects_author_id ON projects(author_id);
      CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public);
    `);
    
    // Insert default admin user if not exists
    const adminExists = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );
    
    if (adminExists.rows.length === 0) {
      // Import bcrypt for password hashing
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash('password', 10);
      
      await client.query(`
        INSERT INTO users (username, email, password_hash, is_admin, bio)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        'admin',
        'admin@pasteforge.com',
        hashedPassword,
        true,
        'Platform Administrator & Full-Stack Developer'
      ]);
      
      console.log('✅ Default admin user created');
    }
    
    await client.query('COMMIT');
    console.log('✅ Database schema initialized successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Export pool for use in other modules
export default pool;