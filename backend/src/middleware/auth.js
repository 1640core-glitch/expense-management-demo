const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change-me-in-production';

const ROLES = Object.freeze({
  EMPLOYEE: 'employee',
  APPROVER: 'approver',
  ACCOUNTING: 'accounting',
  ADMIN: 'admin',
});
const ALL_ROLES = Object.freeze(Object.values(ROLES));

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: '認証が必要です' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'トークンが無効です' });
  }
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '認証が必要です' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '権限がありません' });
    }
    next();
  };
}

module.exports = { authRequired, signToken, requireRole, ROLES, ALL_ROLES };
