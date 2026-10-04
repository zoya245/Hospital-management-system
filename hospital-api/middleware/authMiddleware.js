const jwt = require('jsonwebtoken');

// NOTE: This MUST match the secret key you used in your routes/auth.js file!
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_hospital_key_2025';

const verifyToken = (req, res, next) => {
    // Whitelist public read routes: Doctors listing, doctor profile, and slots calculation
    const isPublicRoute = (
        req.method === 'GET' && (
            req.path === '/doctors' || 
            req.path.includes('/slots') ||
            /^\/doctors\/\d+$/.test(req.path)
        )
    );

    // 1. Check if the Authorization header exists
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        if (isPublicRoute) return next();
        return res.status(403).json({ error: 'Access Denied. No token provided.' });
    }

    // 2. Extract the token (Format is usually "Bearer eyJhbGciOi...")
    const token = authHeader.split(' ')[1]; 
    if (!token) {
        if (isPublicRoute) return next();
        return res.status(403).json({ error: 'Access Denied. Invalid token format.' });
    }

    // 3. Verify the token is real and hasn't expired
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified; // Attach the user's ID and Role to the request
        next(); // The badge is valid! Let them through to the route.
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or Expired Token. Please log in again.' });
    }
};

module.exports = { verifyToken };