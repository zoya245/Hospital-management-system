const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// 🔴 Import the centralized EmailJS functions from our Master Hub
const { 
    sendRegistrationOtpEmail, 
    sendResetEmail, 
    sendWelcomeEmail 
} = require('../utils/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_hospital_key_2025';

const otpStore = {}; // In-Memory store for Email OTPs

// ==========================================
// 1. REGISTRATION ROUTES (USING EMAILJS)
// ==========================================

// Send Email OTP
router.post('/send-otp', async (req, res) => {
    const { email, phone } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Please enter a valid email address first.' });
    }

    try {
        // Check if email already exists
        const [emailExists] = await pool.query('SELECT * FROM patient WHERE email = ?', [email]);
        if (emailExists.length > 0) return res.status(409).json({ error: 'Email already registered. Please login.' });

        // Check if phone already exists (if they typed it in)
        if (phone) {
            const [phoneExists] = await pool.query('SELECT * FROM patient WHERE phone = ?', [phone]);
            if (phoneExists.length > 0) return res.status(409).json({ error: 'Phone number already registered.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[email] = otp; // Store OTP mapped to email
        console.log(`\n========================================`);
        console.log(`🔐 REGISTRATION OTP FOR [${email}]: ${otp}`);
        console.log(`========================================\n`);

        // Fire EmailJS if configured
        let emailSent = false;
        if (process.env.EMAILJS_SERVICE_ID) {
            emailSent = await sendRegistrationOtpEmail(email, otp);
        }
        
        if (emailSent) {
            res.json({ message: 'OTP sent to your email!' });
        } else {
            res.json({ message: `OTP sent! Verification Code: ${otp}`, otp: otp });
        }
    } catch (error) {
        console.error("OTP Error:", error);
        res.status(500).json({ error: 'Server error while sending OTP.' });
    }
});

// Register Patient
router.post('/patients', async (req, res) => {
    const { name, email, age, gender, phone, address, password, otp } = req.body;
    
    if (!name || !email || !phone || !password || !otp) return res.status(400).json({ error: 'Missing required fields.' });

    if (otpStore[email] !== otp) return res.status(400).json({ error: 'Invalid or expired OTP.' });

    try {
        const hash = await bcrypt.hash(password, 10);
        
        const [result] = await pool.query(
            'INSERT INTO patient (name, email, age, gender, phone, address, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [name, email, age, gender, phone, address, hash]
        );
        delete otpStore[email]; 

        // 🔴 Fire the EmailJS Welcome Trigger
        sendWelcomeEmail(email, name);

        res.status(201).json({ patient_id: result.insertId, name, phone, email });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.sqlMessage && error.sqlMessage.includes('email')) {
                return res.status(409).json({ error: 'Email already registered.' });
            }
            return res.status(409).json({ error: 'Phone number already registered.' });
        }
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// ==========================================
// 2. LOGIN ROUTES
// ==========================================
router.post('/patients/login', async (req, res) => {
    const { phone, password } = req.body; 
    if (!phone || !password) return res.status(400).json({ error: 'Required fields missing.' });

    try {
        const identifier = phone.toString().trim();
        const isEmail = identifier.includes('@');
        const query = isEmail 
            ? 'SELECT * FROM patient WHERE LOWER(email) = LOWER(?)' 
            : 'SELECT * FROM patient WHERE phone = ?';
        
        const [patients] = await pool.query(query, [identifier]);
        if (patients.length === 0) return res.status(404).json({ error: 'Invalid credentials. Patient account not found.' });

        const match = await bcrypt.compare(password, patients[0].password_hash);
        if (match) {
            const token = jwt.sign({ userId: patients[0].patient_id, role: 'Patient', name: patients[0].name }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ user: { patient_id: patients[0].patient_id, name: patients[0].name, role: 'Patient' }, token });
        } else {
            res.status(401).json({ error: 'Invalid password. Default password is password123.' });
        }
    } catch (err) { 
        console.log("🚨 REAL LOGIN ERROR:", err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

router.post('/doctor/login', async (req, res) => {
    const { email, username, id, password } = req.body;
    const rawIdentifier = email || username || id;
    if (!rawIdentifier || !password) return res.status(400).json({ error: 'Missing email/username or password.' });

    try {
        const identifier = rawIdentifier.toString().trim();
        const isEmail = identifier.includes('@');
        const query = isEmail 
            ? 'SELECT * FROM doctor WHERE LOWER(email) = LOWER(?)' 
            : 'SELECT * FROM doctor WHERE doctor_id = ?';
        const [doctors] = await pool.query(query, [identifier]);

        if (doctors.length === 0) return res.status(401).json({ error: 'Doctor account not found for this email/ID.' });

        const doctor = doctors[0];
        const match = await bcrypt.compare(password, doctor.password_hash);
        if (match) {
            const token = jwt.sign(
                { userId: doctor.doctor_id, role: 'Doctor', name: doctor.name, email: doctor.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            res.json({
                user: {
                    id: doctor.doctor_id,
                    doctor_id: doctor.doctor_id,
                    name: doctor.name,
                    email: doctor.email,
                    specialization: doctor.specialization,
                    role: 'Doctor'
                },
                token
            });
        } else {
            res.status(401).json({ error: 'Invalid password. Default password is password123.' });
        }
    } catch (err) {
        console.error("Doctor Login Error:", err);
        res.status(500).json({ error: 'Doctor login failed.' });
    }
});

router.post('/staff/login', async (req, res) => {
    const { role, id, password } = req.body; 
    if (!id || !password || !role) return res.status(400).json({ error: 'Missing credentials.' });

    try {
        const identifier = id.toString().trim();
        const isEmail = identifier.includes('@');

        let users = [];
        let idColumn = 'staff_id';
        let assignedRole = role;

        if (role === 'Doctor') {
            idColumn = 'doctor_id';
            const query = isEmail 
                ? 'SELECT * FROM doctor WHERE LOWER(email) = LOWER(?)' 
                : 'SELECT * FROM doctor WHERE doctor_id = ?';
            [users] = await pool.query(query, [identifier]);
        } else {
            // Staff / Receptionist / Nurse
            idColumn = 'staff_id';
            const query = isEmail 
                ? 'SELECT * FROM staff WHERE LOWER(email) = LOWER(?)' 
                : 'SELECT * FROM staff WHERE staff_id = ?';
            [users] = await pool.query(query, [identifier]);
            if (users.length > 0) {
                assignedRole = users[0].role || 'Receptionist';
            }
        }

        if (users.length === 0) return res.status(401).json({ error: 'Staff account not found for this email/ID.' });

        const match = await bcrypt.compare(password, users[0].password_hash);
        if (match) {
            const token = jwt.sign({ userId: users[0][idColumn], role: assignedRole, name: users[0].name }, JWT_SECRET, { expiresIn: '12h' });
            res.json({ user: { id: users[0][idColumn], name: users[0].name, role: assignedRole }, token });
        } else {
            res.status(401).json({ error: 'Invalid password. Default password is password123.' });
        }
    } catch (err) { 
        console.log("🚨 REAL LOGIN ERROR:", err);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// ==========================================
// 3. FORGOT PASSWORD ROUTES
// ==========================================
router.post('/forgot-password', async (req, res) => {
    const { email, role } = req.body;

    let table = 'patient';
    if (role.toLowerCase() === 'doctor') table = 'doctor';
    if (role.toLowerCase() === 'staff' || role.toLowerCase() === 'receptionist') table = 'staff';

    try {
        const [exists] = await pool.query(`SELECT * FROM ${table} WHERE email = ?`, [email]);
        if (exists.length === 0) return res.status(404).json({ error: 'Email not found.' });

        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60000); 

        console.log(`\n========================================`);
        console.log(`🔑 PASSWORD RESET OTP FOR [${email}]: ${otp}`);
        console.log(`========================================\n`);

        let emailSent = false;
        if (process.env.EMAILJS_SERVICE_ID) {
            emailSent = await sendResetEmail(email, otp);
        }

        await pool.query(
            'INSERT INTO passwordreset (email, otp, role, expires_at) VALUES (?, ?, ?, ?)',
            [email, otp, role, expiresAt]
        );

        if (emailSent) {
            res.json({ message: `Reset code sent to ${email}` });
        } else {
            res.json({ message: `Reset code sent! Code: ${otp}`, otp: otp });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword, role } = req.body;

    let table = 'patient';
    if (role.toLowerCase() === 'doctor') table = 'doctor';
    if (role.toLowerCase() === 'staff' || role.toLowerCase() === 'receptionist') table = 'staff';

    try {
        const [records] = await pool.query(
            'SELECT * FROM passwordreset WHERE email = ? AND otp = ? AND role = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, otp, role]
        );

        if (records.length === 0) return res.status(400).json({ error: 'Invalid or Expired OTP' });

        const hash = await bcrypt.hash(newPassword, 10);
        await pool.query(`UPDATE ${table} SET password_hash = ? WHERE email = ?`, [hash, email]);
        
        await pool.query('DELETE FROM passwordreset WHERE email = ?', [email]);

        res.json({ message: 'Password Reset Successful. Please Login.' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;