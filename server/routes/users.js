import express from 'express';
import bcrypt from 'bcrypt';
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
        u.preferences->>'profileVisibility' AS profile_visibility,
        u.preferences->>'showPasteCount' AS show_paste_count,
        u.preferences->>'showPublicPastes' AS show_public_pastes,
        u.allow_messages,
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
      projectCount: parseInt(user.project_count),
      privacy: {
        profileVisibility: user.profile_visibility || 'public',
        showPasteCount: user.show_paste_count !== 'false',
        showPublicPastes: user.show_public_pastes !== 'false',
        allowMessages: user.allow_messages !== false && user.allow_messages !== 'false'
      }
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

// Get collections created by a user by user ID
router.get('/:userId/collections', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, name, description, is_public, created_at, updated_at
       FROM collections WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const collections = result.rows.map(row => ({
      id: row.id.toString(),
      name: row.name,
      description: row.description,
      author: { id: userId },
      pastes: [],
      isPublic: row.is_public,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));

    res.json(collections);
  } catch (err) {
    console.error('Error fetching user collections:', err);
    res.status(500).json({ error: 'Failed to fetch user collections' });
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
      'SELECT bio, tagline, website, location, profile_picture FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      bio: user.bio || user.tagline || '',
      tagline: user.tagline || '',
      website: user.website || '',
      location: user.location || '',
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

    const { bio, tagline, website, location } = req.body;
    const bioText = bio || tagline;

    if (bioText && bioText.length > 100) {
      return res.status(400).json({ error: 'Bio must be under 100 characters' });
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
      'UPDATE users SET bio = $1, tagline = $1, website = $2, location = $3, profile_picture = $4, updated_at = NOW() WHERE id = $5',
      [bioText || null, website || null, location || null, finalPath, userId]
    );

    res.json({ bio: bioText || '', website, location, profilePicture: finalPath });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update user password
router.put('/:userId/password', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const numericUserId = Number(userId);
    if (!Number.isInteger(numericUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (numericUserId !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long' });
    }

    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!valid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashed, userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Get notification preferences
router.get('/:userId/preferences', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0].preferences || {});
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update notification preferences
router.put('/:userId/notification-preferences', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { emailNotifications, pushNotifications, weeklySummary } = req.body;
    const prefs = {
      email_notifications: !!emailNotifications,
      push_notifications: !!pushNotifications,
      weekly_summary: !!weeklySummary
    };

    await pool.query('UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2', [prefs, userId]);

    res.json({ preferences: prefs });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get privacy settings
router.get('/:userId/privacy-settings', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await pool.query(
      'SELECT preferences, allow_messages FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const prefs = result.rows[0].preferences || {};

    res.json({
      profileVisibility: prefs.profileVisibility || 'public',
      showPasteCount: prefs.showPasteCount !== false,
      showPublicPastes: prefs.showPublicPastes !== false,
      allowMessages: result.rows[0].allow_messages !== false
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
});

// Update privacy settings
router.patch('/:userId/privacy-settings', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    if (parseInt(userId) !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { profileVisibility, showPasteCount, showPublicPastes, allowMessages } = req.body;

    const result = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const prefs = result.rows[0].preferences || {};
    const newPrefs = {
      ...prefs,
      profileVisibility: profileVisibility || prefs.profileVisibility || 'public',
      showPasteCount: showPasteCount !== undefined ? !!showPasteCount : prefs.showPasteCount !== false,
      showPublicPastes: showPublicPastes !== undefined ? !!showPublicPastes : prefs.showPublicPastes !== false
    };

    await pool.query(
      'UPDATE users SET preferences = $1, allow_messages = $2, updated_at = NOW() WHERE id = $3',
      [newPrefs, allowMessages !== undefined ? !!allowMessages : true, userId]
    );

    res.json({
      profileVisibility: newPrefs.profileVisibility,
      showPasteCount: newPrefs.showPasteCount,
      showPublicPastes: newPrefs.showPublicPastes,
      allowMessages: allowMessages !== undefined ? !!allowMessages : true
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

export default router;