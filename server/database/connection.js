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
        tagline TEXT,
        website VARCHAR(255),
        profile_picture TEXT,
        location VARCHAR(100),
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        preferences JSONB DEFAULT '{}'::jsonb
      )
    `);

    // Ensure new profile columns exist
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline TEXT`
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT`
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb`
    );

    // Create pastes table - Modified to allow NULL author_id for anonymous pastes
    await client.query(`
      CREATE TABLE IF NOT EXISTS pastes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        syntax_language VARCHAR(50) NOT NULL DEFAULT 'text',
        author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        is_private BOOLEAN DEFAULT FALSE,
        is_zero_knowledge BOOLEAN DEFAULT FALSE,
        encrypted_content TEXT,
        expiration TIMESTAMP WITH TIME ZONE,
        burn_after_read BOOLEAN DEFAULT FALSE,
        has_been_viewed BOOLEAN DEFAULT FALSE,
        password TEXT,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Ensure content column allows NULL values for zero-knowledge pastes
    await client.query(
      `ALTER TABLE pastes ALTER COLUMN content DROP NOT NULL`
    );

    // Ensure burn_after_read column exists for existing installations
    await client.query(
      `ALTER TABLE pastes ADD COLUMN IF NOT EXISTS burn_after_read BOOLEAN DEFAULT FALSE`
    );

    await client.query(
      `ALTER TABLE pastes ADD COLUMN IF NOT EXISTS has_been_viewed BOOLEAN DEFAULT FALSE`
    );

    // Add password column for optional paste protection
    await client.query(
      `ALTER TABLE pastes ADD COLUMN IF NOT EXISTS password TEXT`
    );
    
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

    // Create followers table for social features
    await client.query(`
      CREATE TABLE IF NOT EXISTS followers (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        followee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(follower_id, followee_id)
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

    // Create collections tables for organizing pastes
    await client.query(`
      CREATE TABLE IF NOT EXISTS collections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_public BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS collection_pastes (
        id SERIAL PRIMARY KEY,
        collection_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
        paste_id INTEGER REFERENCES pastes(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(collection_id, paste_id)
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

    // Track unique paste views by IP address
    await client.query(`
      CREATE TABLE IF NOT EXISTS paste_views (
        paste_id INTEGER REFERENCES pastes(id) ON DELETE CASCADE,
        ip_address VARCHAR(45) NOT NULL,
        viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (paste_id, ip_address)
      )
    `);

    // Achievements system tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        points INTEGER DEFAULT 0,
        icon TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        achievement_id INTEGER REFERENCES achievements(id),
        awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, achievement_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_achievement_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        code TEXT,
        progress INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, code)
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
      CREATE INDEX IF NOT EXISTS idx_projects_author_id ON projects(author_id);
      CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public);
    `);

    // Seed initial achievements
    await client.query(`
      INSERT INTO achievements (code, name, description, category, points)
      VALUES
        ('first_paste', 'First Paste', 'Created your very first paste.', 'creator', 10),
        ('paste_creator_10', '10 Pastes Created', 'Created 10 pastes.', 'creator', 25),
        ('popular_paste_100', 'Popular Creator', 'Paste reached 100 views.', 'popularity', 30),
        ('first_chain', 'Chain Builder', 'Created your first paste chain.', 'collaboration', 20),
        ('early_adopter', 'Early Adopter', 'Joined PasteForge.', 'milestone', 5),
        ('collection_creator', 'Organizer', 'Created your first collection.', 'organization', 15)
      ON CONFLICT (code) DO NOTHING
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
