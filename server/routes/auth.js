import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database/connection.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(`
      INSERT INTO users (username, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, username, email, is_admin, created_at
    `, [username, email, hashedPassword]);
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        isAdmin: user.is_admin,
        joinDate: user.created_at.toISOString(),
        followers: 0,
        following: 0,
        pasteCount: 0,
        projectCount: 0,
        tagline: user.tagline,
        avatar: user.profile_picture,
        profilePicture: user.profile_picture,
        privacy: {
          profileVisibility: 'public',
          showPasteCount: true,
          showPublicPastes: true,
          allowMessages: true
        }
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const result = await pool.query(`
      SELECT
        u.*,
        u.preferences->>'profileVisibility' AS profile_visibility,
        u.preferences->>'showPasteCount' AS show_paste_count,
        u.preferences->>'showPublicPastes' AS show_public_pastes,
        u.allow_messages,
        COUNT(DISTINCT p.id) as paste_count,
        COUNT(DISTINCT pr.id) as project_count
      FROM users u
      LEFT JOIN pastes p ON u.id = p.author_id
      LEFT JOIN projects pr ON u.id = pr.author_id
      WHERE u.email = $1
      GROUP BY u.id
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.profile_picture || user.avatar_url,
        profilePicture: user.profile_picture || null,
        bio: user.bio,
        tagline: user.tagline,
        website: user.website,
        location: user.location,
        isAdmin: user.is_admin,
        joinDate: user.created_at.toISOString(),
        followers: 0, // TODO: Implement followers
        following: 0, // TODO: Implement following
        pasteCount: parseInt(user.paste_count),
        projectCount: parseInt(user.project_count),
        privacy: {
          profileVisibility: user.profile_visibility || 'public',
          showPasteCount: user.show_paste_count !== 'false',
          showPublicPastes: user.show_public_pastes !== 'false',
          allowMessages: user.allow_messages !== false && user.allow_messages !== 'false'
        }
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get fresh user data
    const result = await pool.query(`
      SELECT
        u.*,
        u.preferences->>'profileVisibility' AS profile_visibility,
        u.preferences->>'showPasteCount' AS show_paste_count,
        u.preferences->>'showPublicPastes' AS show_public_pastes,
        u.allow_messages,
        COUNT(DISTINCT p.id) as paste_count,
        COUNT(DISTINCT pr.id) as project_count
      FROM users u
      LEFT JOIN pastes p ON u.id = p.author_id
      LEFT JOIN projects pr ON u.id = pr.author_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [decoded.id]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.profile_picture || user.avatar_url,
        profilePicture: user.profile_picture || null,
        bio: user.bio,
        tagline: user.tagline,
        website: user.website,
        location: user.location,
        isAdmin: user.is_admin,
        joinDate: user.created_at.toISOString(),
        followers: 0,
        following: 0,
        pasteCount: parseInt(user.paste_count),
        projectCount: parseInt(user.project_count),
        privacy: {
          profileVisibility: user.profile_visibility || 'public',
          showPasteCount: user.show_paste_count !== 'false',
          showPublicPastes: user.show_public_pastes !== 'false',
          allowMessages: user.allow_messages !== false && user.allow_messages !== 'false'
        }
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;