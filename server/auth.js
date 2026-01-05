import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import db from './db.js';

// Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '358731752606-5i776ll87ql2ehees6iu68qiloea0b8s.apps.googleusercontent.com';
const JWT_SECRET = process.env.JWT_SECRET || 'stoxy-secret-key-change-in-production';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Verify Google ID Token and return user payload
 */
export async function verifyGoogleToken(idToken) {
    if (!GOOGLE_CLIENT_ID) {
        throw new Error('GOOGLE_CLIENT_ID not configured');
    }

    const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
    };
}

/**
 * Create or update user in database
 */
export function upsertUser(user) {
    const stmt = db.prepare(`
    INSERT INTO users (id, email, name, picture, created_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      picture = excluded.picture
  `);
    stmt.run(user.id, user.email, user.name, user.picture);
    return user;
}

/**
 * Get user by ID
 */
export function getUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/**
 * Generate JWT session token
 */
export function generateSessionToken(user) {
    return jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * Verify JWT session token
 */
export function verifySessionToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Middleware to require authentication
 * Extracts user from Authorization header (Bearer token)
 */
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const decoded = verifySessionToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user info to request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    next();
}

/**
 * Optional authentication middleware
 * Does not reject if no token, but attaches user if present
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifySessionToken(token);

        if (decoded) {
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
        }
    }

    next();
}

/**
 * Migrate existing data to a specific user
 */
export function migrateDataToUser(userId) {
    // Migrate portfolios without user_id
    db.prepare(`
    UPDATE portfolios SET user_id = ? WHERE user_id IS NULL
  `).run(userId);

    // Migrate notes without user_id
    db.prepare(`
    UPDATE notes SET user_id = ? WHERE user_id IS NULL
  `).run(userId);

    return {
        portfolios: db.prepare('SELECT COUNT(*) as count FROM portfolios WHERE user_id = ?').get(userId).count,
        notes: db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?').get(userId).count,
    };
}
