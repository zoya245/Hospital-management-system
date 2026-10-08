const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');

// --- HELPER FUNCTIONS ---
const formatTo12Hr = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.toString().split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] ? parts[1].padStart(2, '0') : '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    return `${hours}:${minutes} ${ampm}`;
};

const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
};

const minutesToTimeStr = (minutes) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}:00`;
};

// ==========================================
// 1. GET ALL DOCTORS (With Department, Rating, & Available Timings)
// ==========================================
router.get('/doctors', async (req, res) => {
    try {
        const sql = `
            SELECT 
                d.doctor_id, 
                d.name, 
                d.specialization, 
                d.department_id,
                d.email,
                dep.name AS department_name,
                COALESCE(AVG(a.doctor_rating), 0) AS average_rating,
                COUNT(DISTINCT a.appointment_id) AS total_appointments,
                COUNT(a.doctor_rating) AS total_ratings
            FROM doctor d
            LEFT JOIN department dep ON d.department_id = dep.department_id
            LEFT JOIN appointment a ON d.doctor_id = a.doctor_id
            GROUP BY d.doctor_id, d.name, d.specialization, d.department_id, d.email, dep.name
            ORDER BY d.doctor_id ASC
        `;
        const [doctors] = await pool.query(sql);

        // Fetch all active availability windows to compute available timings
        const [availabilities] = await pool.query(`
            SELECT doctor_id, day_of_week, specific_date, start_time, end_time, slot_duration 
            FROM availability 
            WHERE status = 'Active'
            ORDER BY doctor_id, FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
        `);

        // Group availability by doctor
        const availMap = {};
        for (const av of availabilities) {
            if (!availMap[av.doctor_id]) availMap[av.doctor_id] = [];
            const timeLabel = `${formatTo12Hr(av.start_time)} – ${formatTo12Hr(av.end_time)}`;
            const dayLabel = av.day_of_week || (av.specific_date ? av.specific_date.toString().split('T')[0] : 'Daily');
            availMap[av.doctor_id].push(`${dayLabel} (${timeLabel})`);
        }

        const enrichedDoctors = doctors.map(doc => ({
            ...doc,
            average_rating: parseFloat(doc.average_rating || 0).toFixed(1),
            available_timings: (availMap[doc.doctor_id] && availMap[doc.doctor_id].length > 0)
                ? availMap[doc.doctor_id].slice(0, 3).join(', ')
                : 'Mon – Fri: 10:00 AM – 1:00 PM'
        }));

        res.json(enrichedDoctors);
    } catch (err) {
        console.error("Get Doctors Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 2. GET SINGLE DOCTOR
// ==========================================
router.get('/doctors/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT d.doctor_id, d.name, d.specialization, d.department_id, d.email, dep.name AS department_name
            FROM doctor d
            LEFT JOIN department dep ON d.department_id = dep.department_id
            WHERE d.doctor_id = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Doctor not found' });
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 3. ADMIN: ADD DOCTOR
// ==========================================
router.post('/doctors', async (req, res) => {
    const { name, specialization, department_id, email, password } = req.body;
    if (!name || !specialization) return res.status(400).json({ error: 'Name and Specialization are required.' });

    try {
        const hash = await bcrypt.hash(password || 'password123', 10);
        const [result] = await pool.query(
            'INSERT INTO doctor (name, specialization, department_id, email, password_hash) VALUES (?, ?, ?, ?, ?)',
            [name, specialization, department_id || 1, email || null, hash]
        );

        // Add standard default availability
        await pool.query(
            "INSERT INTO availability (doctor_id, day_of_week, start_time, end_time, slot_duration, status) VALUES (?, 'Monday', '10:00:00', '13:00:00', 30, 'Active')",
            [result.insertId]
        );

        const [newDoc] = await pool.query('SELECT doctor_id, name, specialization, department_id, email FROM doctor WHERE doctor_id = ?', [result.insertId]);
        res.status(201).json(newDoc[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 4. ADMIN: EDIT DOCTOR
// ==========================================
router.put('/doctors/:id', async (req, res) => {
    const { name, specialization, department_id, email } = req.body;
    try {
        await pool.query(
            'UPDATE doctor SET name = COALESCE(?, name), specialization = COALESCE(?, specialization), department_id = COALESCE(?, department_id), email = COALESCE(?, email) WHERE doctor_id = ?',
            [name, specialization, department_id, email, req.params.id]
        );
        const [updated] = await pool.query('SELECT doctor_id, name, specialization, department_id, email FROM doctor WHERE doctor_id = ?', [req.params.id]);
        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 5. ADMIN: DELETE DOCTOR
// ==========================================
router.delete('/doctors/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM doctor WHERE doctor_id = ?', [req.params.id]);
        res.json({ message: 'Doctor deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 6. DOCTOR DASHBOARD (Doctor Info, Summary Counts, & Today's Appointments)
// ==========================================
router.get('/doctors/:id/dashboard', async (req, res) => {
    const doctorId = req.params.id;

    try {
        // A. Doctor Information
        const [docRows] = await pool.query(`
            SELECT d.doctor_id, d.name, d.specialization, d.department_id, d.email, dep.name AS department_name
            FROM doctor d
            LEFT JOIN department dep ON d.department_id = dep.department_id
            WHERE d.doctor_id = ?
        `, [doctorId]);

        if (docRows.length === 0) return res.status(404).json({ error: 'Doctor not found.' });
        const doctor = docRows[0];

        // B. Today's Date String (YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // C. Appointment Summary Counts
        const [counts] = await pool.query(`
            SELECT 
                COUNT(*) as total_appointments,
                SUM(CASE WHEN appointment_date = CURDATE() THEN 1 ELSE 0 END) as today_appointments,
                SUM(CASE WHEN appointment_date >= CURDATE() AND status NOT IN ('Completed', 'Cancelled') THEN 1 ELSE 0 END) as upcoming_appointments,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_appointments,
                SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_appointments,
                AVG(doctor_rating) as average_rating,
                COUNT(doctor_rating) as total_ratings
            FROM appointment 
            WHERE doctor_id = ?
        `, [doctorId]);

        // Distinct patient count for this doctor
        const [patientCount] = await pool.query(`
            SELECT COUNT(DISTINCT patient_id) as total_patients FROM appointment WHERE doctor_id = ?
        `, [doctorId]);

        // D. Today's Appointment List (JOIN Doctor -> Appointment -> Patient)
        const [todayAppts] = await pool.query(`
            SELECT 
                a.appointment_id,
                a.patient_id,
                a.doctor_id,
                DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
                a.appointment_time,
                a.status,
                a.is_emergency,
                a.doctor_rating,
                a.symptoms_raw,
                a.symptoms_medical,
                p.name AS patient_name,
                p.age AS patient_age,
                p.gender AS patient_gender,
                p.phone AS patient_phone,
                p.email AS patient_email,
                p.compliance_score
            FROM appointment a
            JOIN patient p ON a.patient_id = p.patient_id
            WHERE a.doctor_id = ? AND a.appointment_date = CURDATE()
            ORDER BY a.appointment_time ASC
        `, [doctorId]);

        res.json({
            doctor: {
                ...doctor,
                today_date: today,
                formatted_today: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })
            },
            summary: {
                today_appointments: Number(counts[0].today_appointments || 0),
                upcoming_appointments: Number(counts[0].upcoming_appointments || 0),
                completed_appointments: Number(counts[0].completed_appointments || 0),
                cancelled_appointments: Number(counts[0].cancelled_appointments || 0),
                total_appointments: Number(counts[0].total_appointments || 0),
                total_patients: Number(patientCount[0].total_patients || 0),
                average_rating: parseFloat(counts[0].average_rating || 5.0).toFixed(1),
                total_ratings: Number(counts[0].total_ratings || 0)
            },
            today_appointments: todayAppts.map(a => ({
                ...a,
                formatted_time: formatTo12Hr(a.appointment_time)
            }))
        });
    } catch (err) {
        console.error("Doctor Dashboard Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 7. GET DOCTOR APPOINTMENTS (All with full Patient Details)
// ==========================================
router.get('/doctors/:id/appointments', async (req, res) => {
    const doctorId = req.params.id;
    const { status, date } = req.query;

    let sql = `
        SELECT 
            a.appointment_id,
            a.patient_id,
            a.doctor_id,
            DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
            a.appointment_time,
            a.status,
            a.is_emergency,
            a.doctor_rating,
            a.symptoms_raw,
            a.symptoms_medical,
            p.name AS patient_name,
            p.age AS patient_age,
            p.gender AS patient_gender,
            p.phone AS patient_phone,
            p.email AS patient_email,
            p.address AS patient_address,
            p.compliance_score,
            d.name AS doctor_name,
            d.specialization
        FROM appointment a
        JOIN patient p ON a.patient_id = p.patient_id
        JOIN doctor d ON a.doctor_id = d.doctor_id
        WHERE a.doctor_id = ?
    `;
    const params = [doctorId];

    if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
    }
    if (date) {
        sql += ' AND a.appointment_date = ?';
        params.push(date);
    }

    sql += ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';

    try {
        const [rows] = await pool.query(sql, params);
        res.json(rows.map(r => ({
            ...r,
            formatted_time: formatTo12Hr(r.appointment_time)
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 8. GET DOCTOR SCHEDULE (Categorized: Today, Upcoming, Completed, Cancelled)
// ==========================================
router.get('/doctors/:id/schedule', async (req, res) => {
    const doctorId = req.params.id;

    try {
        const [rows] = await pool.query(`
            SELECT 
                a.appointment_id,
                a.patient_id,
                a.doctor_id,
                DATE_FORMAT(a.appointment_date, '%Y-%m-%d') as appointment_date,
                a.appointment_time,
                a.status,
                a.is_emergency,
                a.doctor_rating,
                a.symptoms_raw,
                a.symptoms_medical,
                p.name AS patient_name,
                p.age AS patient_age,
                p.gender AS patient_gender,
                p.phone AS patient_phone,
                p.email AS patient_email,
                p.compliance_score,
                d.name AS doctor_name,
                d.specialization
            FROM appointment a
            JOIN patient p ON a.patient_id = p.patient_id
            JOIN doctor d ON a.doctor_id = d.doctor_id
            WHERE a.doctor_id = ?
            ORDER BY a.appointment_date ASC, a.appointment_time ASC
        `, [doctorId]);

        const todayStr = new Date().toISOString().split('T')[0];

        const formatted = rows.map(r => {
            const dateStr = r.appointment_date instanceof Date 
                ? r.appointment_date.toISOString().split('T')[0] 
                : String(r.appointment_date).split('T')[0];
            return {
                ...r,
                appointment_date: dateStr,
                formatted_time: formatTo12Hr(r.appointment_time),
                schedule_text: `${formatTo12Hr(r.appointment_time)} → ${r.patient_name} → ${r.status}`
            };
        });

        const today = formatted.filter(a => a.appointment_date === todayStr);
        const upcoming = formatted.filter(a => a.appointment_date > todayStr && a.status !== 'Cancelled' && a.status !== 'Completed');
        const completed = formatted.filter(a => a.status === 'Completed');
        const cancelled = formatted.filter(a => a.status === 'Cancelled');

        res.json({
            all: formatted,
            today,
            upcoming,
            completed,
            cancelled,
            total: formatted.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 9. GET DOCTOR'S PATIENTS (Only Patients with appointments for this doctor)
// ==========================================
router.get('/doctors/:id/patients', async (req, res) => {
    const doctorId = req.params.id;

    try {
        const [patients] = await pool.query(`
            SELECT 
                p.patient_id,
                p.name AS patient_name,
                p.age,
                p.gender,
                p.phone,
                p.email,
                p.address,
                p.compliance_score,
                COUNT(a.appointment_id) AS total_appointments_with_doctor,
                MAX(a.appointment_date) AS last_appointment_date,
                SUBSTRING_INDEX(GROUP_CONCAT(a.appointment_time ORDER BY a.appointment_date DESC, a.appointment_time DESC), ',', 1) AS last_appointment_time,
                SUBSTRING_INDEX(GROUP_CONCAT(a.status ORDER BY a.appointment_date DESC, a.appointment_time DESC), ',', 1) AS last_appointment_status
            FROM patient p
            JOIN appointment a ON p.patient_id = a.patient_id
            WHERE a.doctor_id = ?
            GROUP BY p.patient_id, p.name, p.age, p.gender, p.phone, p.email, p.address, p.compliance_score
            ORDER BY last_appointment_date DESC
        `, [doctorId]);

        res.json(patients.map(p => ({
            ...p,
            last_appointment_formatted_time: formatTo12Hr(p.last_appointment_time)
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 10. GET DOCTOR AVAILABILITY
// ==========================================
router.get('/doctors/:id/availability', async (req, res) => {
    const doctorId = req.params.id;
    try {
        const [rows] = await pool.query(`
            SELECT 
                availability_id,
                doctor_id,
                day_of_week,
                DATE_FORMAT(specific_date, '%Y-%m-%d') AS specific_date,
                start_time,
                end_time,
                slot_duration,
                status,
                created_at
            FROM availability
            WHERE doctor_id = ?
            ORDER BY FIELD(day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), start_time ASC
        `, [doctorId]);

        res.json(rows.map(r => ({
            ...r,
            start_time_formatted: formatTo12Hr(r.start_time),
            end_time_formatted: formatTo12Hr(r.end_time),
            display_slot: `${r.day_of_week || r.specific_date}: ${formatTo12Hr(r.start_time)} – ${formatTo12Hr(r.end_time)}`
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 11. ADD DOCTOR AVAILABILITY
// ==========================================
router.post('/doctors/:id/availability', async (req, res) => {
    const doctorId = req.params.id;
    const { day_of_week, specific_date, start_time, end_time, slot_duration } = req.body;

    if (!start_time || !end_time) {
        return res.status(400).json({ error: 'Start time and End time are required.' });
    }
    if (!day_of_week && !specific_date) {
        return res.status(400).json({ error: 'Please specify either a Day of the week or a Specific Date.' });
    }

    try {
        const startStr = start_time.length === 5 ? `${start_time}:00` : start_time;
        const endStr = end_time.length === 5 ? `${end_time}:00` : end_time;

        if (timeToMinutes(startStr) >= timeToMinutes(endStr)) {
            return res.status(400).json({ error: 'End time must be after Start time.' });
        }

        const [result] = await pool.query(`
            INSERT INTO availability (doctor_id, day_of_week, specific_date, start_time, end_time, slot_duration, status)
            VALUES (?, ?, ?, ?, ?, ?, 'Active')
        `, [
            doctorId,
            day_of_week || null,
            specific_date || null,
            startStr,
            endStr,
            slot_duration || 30
        ]);

        const [newAvail] = await pool.query('SELECT * FROM availability WHERE availability_id = ?', [result.insertId]);

        // Socket emit for real-time doctor availability change
        const io = req.app.get('io');
        if (io) {
            io.emit('doctor_availability_updated', { doctor_id: doctorId });
        }

        res.status(201).json({
            ...newAvail[0],
            start_time_formatted: formatTo12Hr(newAvail[0].start_time),
            end_time_formatted: formatTo12Hr(newAvail[0].end_time)
        });
    } catch (err) {
        console.error("Add Availability Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 12. EDIT DOCTOR AVAILABILITY
// ==========================================
router.put('/doctors/:id/availability/:availId', async (req, res) => {
    const { availId, id: doctorId } = req.params;
    const { day_of_week, specific_date, start_time, end_time, slot_duration, status } = req.body;

    try {
        const startStr = start_time ? (start_time.length === 5 ? `${start_time}:00` : start_time) : null;
        const endStr = end_time ? (end_time.length === 5 ? `${end_time}:00` : end_time) : null;

        await pool.query(`
            UPDATE availability 
            SET 
                day_of_week = COALESCE(?, day_of_week),
                specific_date = COALESCE(?, specific_date),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                slot_duration = COALESCE(?, slot_duration),
                status = COALESCE(?, status)
            WHERE availability_id = ? AND doctor_id = ?
        `, [day_of_week, specific_date, startStr, endStr, slot_duration, status, availId, doctorId]);

        const [updated] = await pool.query('SELECT * FROM availability WHERE availability_id = ?', [availId]);

        const io = req.app.get('io');
        if (io) {
            io.emit('doctor_availability_updated', { doctor_id: doctorId });
        }

        res.json(updated[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 13. DELETE DOCTOR AVAILABILITY
// ==========================================
router.delete('/doctors/:id/availability/:availId', async (req, res) => {
    const { availId, id: doctorId } = req.params;

    try {
        await pool.query('DELETE FROM availability WHERE availability_id = ? AND doctor_id = ?', [availId, doctorId]);

        const io = req.app.get('io');
        if (io) {
            io.emit('doctor_availability_updated', { doctor_id: doctorId });
        }

        res.json({ message: 'Availability schedule removed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// 14. GET AVAILABLE SLOTS FOR A SPECIFIC DATE (Connected to Patient Booking)
// ==========================================
router.get('/doctors/:id/slots', async (req, res) => {
    const doctorId = req.params.id;
    const { date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Query parameter "date" (YYYY-MM-DD) is required.' });
    }

    try {
        // Find day of week for the given date (e.g. 'Monday', 'Tuesday')
        const targetDate = new Date(`${date}T00:00:00`);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = days[targetDate.getDay()];

        // 1. Fetch matching availability rules for this doctor
        const [rules] = await pool.query(`
            SELECT * FROM availability 
            WHERE doctor_id = ? 
              AND status = 'Active'
              AND (
                specific_date = ? 
                OR (day_of_week = ? AND (specific_date IS NULL OR specific_date = '0000-00-00'))
              )
            ORDER BY start_time ASC
        `, [doctorId, date, dayOfWeek]);

        // 2. Fetch all booked appointments on this date for this doctor
        const [bookedAppts] = await pool.query(`
            SELECT appointment_id, appointment_time, status 
            FROM appointment 
            WHERE doctor_id = ? 
              AND appointment_date = ? 
              AND status != 'Cancelled'
        `, [doctorId, date]);

        // Set of booked start times (normalized to HH:mm)
        const bookedTimeSet = new Set(bookedAppts.map(b => (b.appointment_time || '').slice(0, 5)));

        // 3. Generate time slots
        const slots = [];

        // If no explicit doctor rules exist for that day, fall back to standard clinic hours
        const activeRules = rules.length > 0 ? rules : [
            { start_time: '10:00:00', end_time: '13:00:00', slot_duration: 30 },
            { start_time: '14:00:00', end_time: '17:00:00', slot_duration: 30 }
        ];

        for (const rule of activeRules) {
            const startMins = timeToMinutes(rule.start_time);
            const endMins = timeToMinutes(rule.end_time);
            const duration = rule.slot_duration || 30;

            for (let current = startMins; current + duration <= endMins; current += duration) {
                const slotStartTime = minutesToTimeStr(current).slice(0, 5); // '10:00'
                const slotEndTime = minutesToTimeStr(current + duration).slice(0, 5); // '10:30'
                const isBooked = bookedTimeSet.has(slotStartTime);

                const label12 = `${formatTo12Hr(slotStartTime)} – ${formatTo12Hr(slotEndTime)}`;

                slots.push({
                    slot_id: `${date}_${slotStartTime}`,
                    date: date,
                    day: dayOfWeek,
                    start_time: slotStartTime,
                    end_time: slotEndTime,
                    time_value: slotStartTime, // Value sent during booking
                    label: label12,
                    display_text: `${label12} ${isBooked ? '🔴 Booked' : '🟢 Available'}`,
                    is_booked: isBooked,
                    status: isBooked ? 'Booked' : 'Available'
                });
            }
        }

        res.json({
            doctor_id: parseInt(doctorId, 10),
            date: date,
            day: dayOfWeek,
            has_custom_availability: rules.length > 0,
            total_slots: slots.length,
            available_count: slots.filter(s => !s.is_booked).length,
            booked_count: slots.filter(s => s.is_booked).length,
            slots
        });
    } catch (err) {
        console.error("Get Slots Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;