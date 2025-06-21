import express from 'express';
import pool from '../database/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Get user profile by username
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await pool.query(`
      SELECT 
        u.*,
        COUNT(DISTINCT p.id) as paste_count,
        COUNT(DISTINCT pr.id) as project_count
      FROM users u
      LEFT JOIN pastes p ON u.id = p.author_id AND p.is_private = FALSE
      LEFT JOIN projects pr ON u.id = pr.author_id AND pr.is_public = TRUE
      WHERE u.username = $1
      GROUP BY u.id
    `, [username]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      id: user.id.toString(),
      username: user.username,
      avatar: user.profile_picture || user.avatar_url,
      profilePicture: user.profile_picture || user.avatar_url,
      bio: user.bio,
      website: user.website,
      location: user.location,
      isAdmin: user.is_admin,
      joinDate: user.created_at.toISOString(),
      followers: 0, // TODO: Implement
      following: 0, // TODO: Implement
      pasteCount: parseInt(user.paste_count),
      projectCount: parseInt(user.project_count)
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Get user's public pastes
router.get('/:username/pastes', async (req, res) => {
  try {
    const { username } = req.params;
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
        COALESCE(
          JSON_AGG(
            CASE WHEN pt.tag IS NOT NULL 
            THEN pt.tag 
            ELSE NULL END
          ) FILTER (WHERE pt.tag IS NOT NULL), 
          '[]'
        ) as tags
      FROM pastes p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN paste_tags pt ON p.id = pt.paste_id
      WHERE u.username = $1
        AND p.is_private = FALSE 
        AND p.is_zero_knowledge = FALSE 
        AND (p.expiration IS NULL OR p.expiration > NOW())
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [username, limit]);
    
    const pastes = result.rows.map(row => ({
      id: row.id.toString(),
      title: row.title,
      content: row.content,
      language: row.syntax_language,
      views: row.view_count,
      forks: 0,
      stars: 0,
      tags: row.tags || [],
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      isPublic: true
    }));
    
    res.json(pastes);
  } catch (error) {
    console.error('Error fetching user pastes:', error);
    res.status(500).json({ error: 'Failed to fetch user pastes' });
  }
});

// Profile summary for user by ID
router.get('/:userId/profile-summary', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get join date
    const userResult = await pool.query(
      'SELECT created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const joinDate = userResult.rows[0].created_at;

    const pasteCountRes = await pool.query(
      'SELECT COUNT(*) FROM pastes WHERE author_id = $1',
      [userId]
    );

    const totalViewsRes = await pool.query(
      'SELECT COALESCE(SUM(view_count), 0) FROM pastes WHERE author_id = $1',
      [userId]
    );

    const followersRes = await pool.query(
      'SELECT COUNT(*) FROM followers WHERE followee_id = $1',
      [userId]
    );

    const commentsRes = await pool.query(
      'SELECT COUNT(*) FROM comments WHERE author_id = $1',
      [userId]
    );

    const pasteCount = parseInt(pasteCountRes.rows[0].count, 10);
    const totalViews = parseInt(totalViewsRes.rows[0].coalesce || totalViewsRes.rows[0].sum || 0, 10);
    const followers = parseInt(followersRes.rows[0].count, 10);
    const comments = parseInt(commentsRes.rows[0].count, 10);

    const engagement = pasteCount + comments;
    const avgViews = pasteCount > 0 ? Math.round(totalViews / pasteCount) : 0;
    const activityLevel = engagement >= 10 ? 'Regular contributor' : 'Getting started';

    res.json({
      accountStatus: 'Active Member',
      joinDate: joinDate.toISOString().split('T')[0],
      activity: activityLevel,
      totalEngagement: engagement,
      averageViews: avgViews,
      followers
    });
  } catch (error) {
    console.error('Error fetching profile summary:', error);
    res.status(500).json({ error: 'Failed to fetch profile summary' });
  }
});

// Get profile data for editing
router.get('/:userId/profile-edit', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query(
      'SELECT tagline, website, profile_picture FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      tagline: user.tagline || '',
      website: user.website || '',
      profilePicture: user.profile_picture || ''
    });
  } catch (error) {
    console.error('Error fetching profile for edit:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/:userId/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { tagline, website } = req.body;

    if (tagline && tagline.length > 100) {
      return res.status(400).json({ error: 'Tagline must be under 100 characters' });
    }

    if (website) {
      try {
        new URL(website);
      } catch {
        return res.status(400).json({ error: 'Invalid website URL' });
      }
    }

    let profilePath;
    if (req.file) {
      profilePath = `/uploads/avatars/${req.file.filename}`;
    }

    const current = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [userId]);
    const finalPath = profilePath || current.rows[0]?.profile_picture || null;

    await pool.query(
      'UPDATE users SET tagline = $1, website = $2, profile_picture = $3, updated_at = NOW() WHERE id = $4',
      [tagline || null, website || null, finalPath, userId]
    );

    res.json({ tagline, website, profilePicture: finalPath });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;