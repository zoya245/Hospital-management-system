const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    console.log('--- Seeding Rich Demo Appointments and Ensuring Demo Credentials ---');

    // 1. Ensure Bcrypt Hash for password123
    const hash = await bcrypt.hash('password123', 10);

    // Ensure Dr. Anil's password and email
    await pool.query("UPDATE doctor SET password_hash = ?, email = 'dr.anil@pulse.com' WHERE doctor_id = 1", [hash]);

    // Ensure Patient 1 & Patient 60007 passwords and emails
    await pool.query("UPDATE patient SET password_hash = ?, email = 'patient@pulse.com', phone = '9073957504' WHERE patient_id = 1", [hash]);
    await pool.query("UPDATE patient SET password_hash = ?, email = 'rahul@gmail.com', phone = '9876543210' WHERE patient_id = 60007", [hash]);

    // Ensure Receptionist staff_id = 2 password and email
    await pool.query("UPDATE staff SET password_hash = ?, email = 'receptionist@pulse.com' WHERE staff_id = 2", [hash]);

    console.log('✅ Passwords verified for Dr. Anil (1), Patient (1 & 60007), Receptionist (2).');

    // 2. Clear old appointments on today for doctor 1 to avoid duplicates, or insert clean ones
    await pool.query('DELETE FROM appointment WHERE appointment_date = CURDATE() AND doctor_id = 1');

    // Insert 3 diverse appointments for Dr. Anil Patil today (CURDATE())
    await pool.query(`
      INSERT INTO appointment 
      (patient_id, doctor_id, appointment_date, appointment_time, status, is_emergency, symptoms_raw, symptoms_medical)
      VALUES 
      (1, 1, CURDATE(), '10:30:00', 'Confirmed', 0, 
       'Occasional resting palpitations and mild chest tightness during morning exertion',
       'Sinus tachycardia pre-screening, exertional angina evaluation'),
      (60007, 1, CURDATE(), '11:45:00', 'Confirmed', 0,
       'Shortness of breath on climbing stairs and post-lunch lethargy',
       'Dyspnea on mild exertion, routine lipid review'),
      (2, 1, CURDATE(), '14:15:00', 'Scheduled', 0,
       'Elevated ambulatory BP (148/92 mmHg) and occasional occipital headache',
       'Essential Stage-1 hypertension follow-up')
    `);
    console.log("✅ Seeded 3 active appointments for Dr. Anil today (CURDATE()).");

    // 3. Ensure upcoming appointments for Patient 1 (Abhigyan Varma)
    await pool.query("DELETE FROM appointment WHERE patient_id = 1 AND appointment_date > CURDATE()");
    await pool.query(`
      INSERT INTO appointment 
      (patient_id, doctor_id, appointment_date, appointment_time, status, is_emergency, symptoms_raw, symptoms_medical)
      VALUES 
      (1, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:00:00', 'Confirmed', 0,
       'Follow-up 24-hr Holter ECG & lipid profile review',
       'Post-treatment cardiac rhythm and metabolic monitoring'),
      (1, 4, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '15:30:00', 'Scheduled', 0,
       'Preventive healthcare & annual biometric evaluation',
       'Annual comprehensive wellness panel')
    `);
    console.log("✅ Seeded upcoming appointments for Patient 1 (in 3 days and 7 days).");

    // 4. Ensure Dr. Anil has availability for everyday so booking works anytime
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const d of days) {
      const [existing] = await pool.query('SELECT availability_id FROM availability WHERE doctor_id = 1 AND day_of_week = ?', [d]);
      if (existing.length === 0) {
        await pool.query(
          "INSERT INTO availability (doctor_id, day_of_week, start_time, end_time, slot_duration, status) VALUES (1, ?, '09:00:00', '17:00:00', 30, 'Active')",
          [d]
        );
      }
    }
    console.log("✅ Verified Dr. Anil availability schedule.");

    console.log('--- Seeding Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
