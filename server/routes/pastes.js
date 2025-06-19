import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get recent public pastes
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.syntax_language,
        p.view_count,
        p.created_at,
        p.updated_at,
        COALESCE(u.id, 0) as author_id,
        COALESCE(u.username, 'Anonymous') as author_username,
        u.avatar_url as author_avatar,
        COALESCE(
          JSON_AGG(
            CASE WHEN pt.tag IS NOT NULL 
            THEN pt.tag 
            ELSE NULL END
          ) FILTER (WHERE pt.tag IS NOT NULL), 
          '[]'
        ) as tags
      FROM pastes p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN paste_tags pt ON p.id = pt.paste_id
      WHERE p.is_private = FALSE 
        AND p.is_zero_knowledge = FALSE 
        AND (p.expiration IS NULL OR p.expiration > NOW())
      GROUP BY p.id, u.id, u.username, u.avatar_url
      ORDER BY p.created_at DESC
      LIMIT $1
    `, [limit]);
    
    const pastes = result.rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      content: row.content,
      language: row.syntax_language,
      author: {
        id: row.author_id ? row.author_id.toString() : 'anonymous',
        username: row.author_username,
        avatar: row.author_avatar
      },
      views: row.view_count,
      forks: 0, // TODO: Implement forks
      stars: 0, // TODO: Implement stars
      tags: row.tags || [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      isPublic: true,
      version: 1,
      versions: []
    }));
    
    res.json(pastes);
  } catch (error) {
    console.error('Error fetching recent pastes:', error);
    res.status(500).json({ error: 'Failed to fetch recent pastes' });
  }
});

// Get paginated archive of public pastes
router.get('/archive', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM pastes p
      WHERE p.is_private = FALSE 
        AND p.is_zero_knowledge = FALSE 
        AND (p.expiration IS NULL OR p.expiration > NOW())
    `);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    // Get paginated results
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.syntax_language,
        p.view_count,
        p.created_at,
        p.updated_at,
        COALESCE(u.id, 0) as author_id,
        COALESCE(u.username, 'Anonymous') as author_username,
        u.avatar_url as author_avatar,
        COALESCE(
          JSON_AGG(
            CASE WHEN pt.tag IS NOT NULL 
            THEN pt.tag 
            ELSE NULL END
          ) FILTER (WHERE pt.tag IS NOT NULL), 
          '[]'
        ) as tags
      FROM pastes p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN paste_tags pt ON p.id = pt.paste_id
      WHERE p.is_private = FALSE 
        AND p.is_zero_knowledge = FALSE 
        AND (p.expiration IS NULL OR p.expiration > NOW())
      GROUP BY p.id, u.id, u.username, u.avatar_url
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const pastes = result.rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      content: row.content,
      language: row.syntax_language,
      author: {
        id: row.author_id ? row.author_id.toString() : 'anonymous',
        username: row.author_username,
        avatar: row.author_avatar
      },
      views: row.view_count,
      forks: 0,
      stars: 0,
      tags: row.tags || [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      isPublic: true,
      version: 1,
      versions: []
    }));
    
    res.json({
      pastes,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching archive:', error);
    res.status(500).json({ error: 'Failed to fetch archive' });
  }
});

// Get single paste by ID
router.get('/:id', async (req, res) => {
  try {
    const pasteId = parseInt(req.params.id);
    
    if (isNaN(pasteId)) {
      return res.status(400).json({ error: 'Invalid paste ID' });
    }
    
    const result = await pool.query(`
      SELECT 
        p.*,
        COALESCE(u.id, 0) as author_id,
        COALESCE(u.username, 'Anonymous') as author_username,
        u.avatar_url as author_avatar,
        u.bio as author_bio,
        COALESCE(
          JSON_AGG(
            CASE WHEN pt.tag IS NOT NULL 
            THEN pt.tag 
            ELSE NULL END
          ) FILTER (WHERE pt.tag IS NOT NULL), 
          '[]'
        ) as tags
      FROM pastes p
      LEFT JOIN users u ON p.author_id = u.id
      LEFT JOIN paste_tags pt ON p.id = pt.paste_id
      WHERE p.id = $1
      GROUP BY p.id, u.id, u.username, u.avatar_url, u.bio
    `, [pasteId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paste not found' });
    }
    
    const row = result.rows[0];
    
    // Check if paste is expired
    if (row.expiration && new Date(row.expiration) < new Date()) {
      return res.status(404).json({ error: 'Paste has expired' });
    }
    
    // Check if paste is private (only owner can view)
    if (row.is_private) {
      // TODO: Check if user is authenticated and is the owner
      return res.status(403).json({ error: 'This paste is private' });
    }
    
    // Track unique views by IP address
    const ip = (req.headers['x-forwarded-for']?.split(',')[0] || req.ip).trim();
    const viewInsert = await pool.query(
      `INSERT INTO paste_views (paste_id, ip_address)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [pasteId, ip]
    );

    let views = row.view_count;

    if (viewInsert.rowCount > 0) {
      const update = await pool.query(
        'UPDATE pastes SET view_count = view_count + 1 WHERE id = $1 RETURNING view_count',
        [pasteId]
      );
      views = update.rows[0].view_count;
    }
    
    const paste = {
      id: row.id.toString(),
      title: row.title,
      content: row.is_zero_knowledge ? null : row.content,
      encryptedContent: row.is_zero_knowledge ? row.encrypted_content : null,
      language: row.syntax_language,
      author: {
        id: row.author_id ? row.author_id.toString() : 'anonymous',
        username: row.author_username,
        avatar: row.author_avatar,
        bio: row.author_bio
      },
      views,
      forks: 0,
      stars: 0,
      tags: row.tags || [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      expiresAt: row.expiration ? row.expiration.toISOString() : null,
      isPublic: !row.is_private,
      isZeroKnowledge: row.is_zero_knowledge,
      version: 1,
      versions: []
    };
    
    res.json(paste);
  } catch (error) {
    console.error('Error fetching paste:', error);
    res.status(500).json({ error: 'Failed to fetch paste' });
  }
});

// Create new paste - Modified to allow anonymous creation
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      title,
      content,
      language = 'text',
      isPrivate = false,
      isZeroKnowledge = false,
      encryptedContent,
      expiration,
      tags = []
    } = req.body;
    
    if (!title || (!content && !isZeroKnowledge)) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    if (isZeroKnowledge && !encryptedContent) {
      return res.status(400).json({ error: 'Encrypted content required for zero-knowledge pastes' });
    }
    
    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // Try to authenticate the user
        const jwt = await import('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists
        const userResult = await client.query(
          'SELECT id FROM users WHERE id = $1',
          [decoded.id]
        );
        
        if (userResult.rows.length > 0) {
          userId = decoded.id;
        }
      } catch (error) {
        // Invalid token, but we'll allow anonymous creation
        console.log('Invalid token, creating anonymous paste');
      }
    }
    
    // Anonymous users cannot create private pastes
    if (!userId && isPrivate) {
      return res.status(400).json({ error: 'Anonymous users cannot create private pastes' });
    }
    
    // Zero-knowledge pastes cannot be private or public (they're always unlisted)
    if (isZeroKnowledge && isPrivate) {
      return res.status(400).json({ error: 'Zero-knowledge pastes cannot be private' });
    }
    
    await client.query('BEGIN');
    
    // Insert paste
    const pasteResult = await client.query(`
      INSERT INTO pastes (
        title, 
        content, 
        syntax_language, 
        author_id, 
        is_private, 
        is_zero_knowledge,
        encrypted_content,
        expiration
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      title,
      isZeroKnowledge ? null : content,
      language,
      userId, // Will be null for anonymous users
      isZeroKnowledge ? false : isPrivate, // Zero-knowledge pastes are always unlisted (not private, not public)
      isZeroKnowledge,
      isZeroKnowledge ? encryptedContent : null,
      expiration ? new Date(expiration) : null
    ]);
    
    const paste = pasteResult.rows[0];
    
    // Insert tags
    if (tags.length > 0) {
      const tagValues = tags.map((tag, index) => 
        `($1, $${index + 2})`
      ).join(', ');
      
      const tagParams = [paste.id, ...tags];
      
      await client.query(
        `INSERT INTO paste_tags (paste_id, tag) VALUES ${tagValues}`,
        tagParams
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      id: paste.id.toString(),
      title: paste.title,
      content: paste.content,
      language: paste.syntax_language,
      isPrivate: paste.is_private,
      isZeroKnowledge: paste.is_zero_knowledge,
      createdAt: paste.created_at.toISOString(),
      tags,
      author: userId ? 'authenticated' : 'anonymous'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating paste:', error);
    res.status(500).json({ error: 'Failed to create paste' });
  } finally {
    client.release();
  }
});

// Download paste as raw text
router.get('/:id/download', async (req, res) => {
  try {
    const pasteId = parseInt(req.params.id);
    
    if (isNaN(pasteId)) {
      return res.status(400).json({ error: 'Invalid paste ID' });
    }
    
    const result = await pool.query(`
      SELECT title, content, syntax_language, is_private, is_zero_knowledge, expiration
      FROM pastes 
      WHERE id = $1
    `, [pasteId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paste not found' });
    }
    
    const paste = result.rows[0];
    
    // Check if paste is expired
    if (paste.expiration && new Date(paste.expiration) < new Date()) {
      return res.status(404).json({ error: 'Paste has expired' });
    }
    
    // Check if paste is private
    if (paste.is_private) {
      return res.status(403).json({ error: 'This paste is private' });
    }
    
    // Can't download zero-knowledge pastes (content is encrypted)
    if (paste.is_zero_knowledge) {
      return res.status(403).json({ error: 'Cannot download zero-knowledge pastes without decryption key' });
    }
    
    const filename = `${paste.title.replace(/[^a-zA-Z0-9]/g, '_')}.${paste.syntax_language}`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(paste.content);
    
  } catch (error) {
    console.error('Error downloading paste:', error);
    res.status(500).json({ error: 'Failed to download paste' });
  }
});

// Get related pastes
router.get('/:id/related', async (req, res) => {
  try {
    const pasteId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 6;
    
    if (isNaN(pasteId)) {
      return res.status(400).json({ error: 'Invalid paste ID' });
    }
    
    // Get current paste info
    const currentPaste = await pool.query(`
      SELECT author_id, syntax_language FROM pastes WHERE id = $1
    `, [pasteId]);
    
    if (currentPaste.rows.length === 0) {
      return res.status(404).json({ error: 'Paste not found' });
    }
    
    const { author_id, syntax_language } = currentPaste.rows[0];
    
    // Get related pastes (same author or same language)
    const result = await pool.query(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.syntax_language,
        p.view_count,
        p.created_at,
        COALESCE(u.id, 0) as author_id,
        COALESCE(u.username, 'Anonymous') as author_username,
        u.avatar_url as author_avatar,
        CASE 
          WHEN p.author_id = $2 AND p.author_id IS NOT NULL THEN 'user'
          WHEN p.syntax_language = $3 THEN 'language'
          ELSE 'other'
        END as relation_type,
        CASE 
          WHEN p.author_id = $2 AND p.author_id IS NOT NULL THEN 0.9
          WHEN p.syntax_language = $3 THEN 0.7
          ELSE 0.5
        END as relevance_score
      FROM pastes p
      LEFT JOIN users u ON p.author_id = u.id
      WHERE p.id != $1
        AND p.is_private = FALSE 
        AND p.is_zero_knowledge = FALSE 
        AND (p.expiration IS NULL OR p.expiration > NOW())
        AND (
          (p.author_id = $2 AND p.author_id IS NOT NULL) OR 
          p.syntax_language = $3
        )
      ORDER BY relevance_score DESC, p.created_at DESC
      LIMIT $4
    `, [pasteId, author_id, syntax_language, limit]);
    
    const relatedPastes = result.rows.map(row => ({
      paste: {
        id: row.id.toString(),
        title: row.title,
        content: row.content.substring(0, 200) + '...', // Truncate for preview
        language: row.syntax_language,
        author: {
          id: row.author_id ? row.author_id.toString() : 'anonymous',
          username: row.author_username,
          avatar: row.author_avatar
        },
        views: row.view_count,
        stars: 0,
        tags: [],
        createdAt: row.created_at.toISOString(),
        isPublic: true
      },
      relevanceScore: parseFloat(row.relevance_score),
      reason: row.relation_type
    }));
    
    res.json(relatedPastes);
  } catch (error) {
    console.error('Error fetching related pastes:', error);
    res.status(500).json({ error: 'Failed to fetch related pastes' });
  }
});

// Get comments for a paste
router.get('/:id/comments', async (req, res) => {
  try {
    const pasteId = parseInt(req.params.id);
    if (isNaN(pasteId)) {
      return res.status(400).json({ error: 'Invalid paste ID' });
    }

    const result = await pool.query(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.paste_id = $1
       ORDER BY c.created_at ASC`,
      [pasteId]
    );

    const comments = result.rows.map(row => ({
      id: row.id.toString(),
      content: row.content,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      parentId: row.parent_id ? row.parent_id.toString() : null,
      author: {
        id: row.author_id ? row.author_id.toString() : 'anonymous',
        username: row.username || 'Anonymous',
        avatar: row.avatar_url
      }
    }));

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get discussion threads for a paste
router.get('/:id/discussions', async (req, res) => {
  try {
    const pasteId = parseInt(req.params.id);
    if (isNaN(pasteId)) {
      return res.status(400).json({ error: 'Invalid paste ID' });
    }

    const result = await pool.query(
      `SELECT t.*, u.username, u.avatar_url,
              (SELECT COUNT(*) FROM discussion_posts p WHERE p.thread_id = t.id) AS post_count
       FROM discussion_threads t
       LEFT JOIN users u ON t.author_id = u.id
       WHERE t.paste_id = $1
       ORDER BY t.created_at DESC`,
      [pasteId]
    );

    const threads = result.rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      category: row.category,
      createdAt: row.created_at.toISOString(),
      author: {
        id: row.author_id ? row.author_id.toString() : 'anonymous',
        username: row.username || 'Anonymous',
        avatar: row.avatar_url
      },
      postCount: parseInt(row.post_count)
    }));

    res.json(threads);
  } catch (error) {
    console.error('Error fetching discussions:', error);
    res.status(500).json({ error: 'Failed to fetch discussions' });
  }
});

export default router;