const pool = require('../config/db');
const bcrypt = require('bcrypt');

async function setup() {
  try {
    console.log('--- Setting up Doctor Module DB Schema ---');

    // 1. Create availability table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS availability (
        availability_id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id INT NOT NULL,
        day_of_week VARCHAR(20) NULL,
        specific_date DATE NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        slot_duration INT DEFAULT 30,
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES doctor(doctor_id) ON DELETE CASCADE
      )
    `);
    console.log('✅ availability table verified/created');

    // 1b. Expand Appointment status to include 'Confirmed'
    try {
      await pool.query(`
        ALTER TABLE appointment 
        MODIFY COLUMN status ENUM('Scheduled', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Scheduled'
      `);
      console.log('✅ appointment.status ENUM updated to include Confirmed');
    } catch (e) {
      console.log('Note on altering status:', e.message);
    }

    // 2. Ensure Doctor table has password_hash and email columns
    const [cols] = await pool.query('SHOW COLUMNS FROM doctor');
    const colNames = cols.map(c => c.Field.toLowerCase());
    
    if (!colNames.includes('password_hash')) {
      await pool.query('ALTER TABLE doctor ADD COLUMN password_hash VARCHAR(255) NULL');
      console.log('Added password_hash to doctor');
    }
    if (!colNames.includes('email')) {
      await pool.query('ALTER TABLE doctor ADD COLUMN email VARCHAR(100) UNIQUE NULL');
      console.log('Added email to doctor');
    }

    // 3. Set standard bcrypt passwords for mock doctors ('password123')
    const hash = await bcrypt.hash('password123', 10);
    await pool.query('UPDATE doctor SET password_hash = ?', [hash]);
    
    // Set standard emails
    await pool.query("UPDATE doctor SET email = 'dr.anil@pulse.com' WHERE doctor_id = 1");
    await pool.query("UPDATE doctor SET email = 'dr.nisha@pulse.com' WHERE doctor_id = 2");
    await pool.query("UPDATE doctor SET email = 'dr.rajesh@pulse.com' WHERE doctor_id = 3");
    await pool.query("UPDATE doctor SET email = 'dr.sneha@pulse.com' WHERE doctor_id = 4");

    // 4. Seed sample availability if empty
    const [countRows] = await pool.query('SELECT COUNT(*) as count FROM availability');
    if (countRows[0].count === 0) {
      await pool.query(`
        INSERT INTO availability (doctor_id, day_of_week, start_time, end_time, slot_duration, status) VALUES
        (1, 'Monday', '10:00:00', '13:00:00', 30, 'Active'),
        (1, 'Wednesday', '10:00:00', '13:00:00', 30, 'Active'),
        (1, 'Friday', '14:00:00', '17:00:00', 30, 'Active'),
        (2, 'Tuesday', '14:00:00', '17:00:00', 30, 'Active'),
        (2, 'Thursday', '10:00:00', '13:00:00', 30, 'Active'),
        (3, 'Monday', '14:00:00', '17:00:00', 30, 'Active'),
        (3, 'Wednesday', '14:00:00', '17:00:00', 30, 'Active'),
        (4, 'Monday', '09:00:00', '12:00:00', 30, 'Active'),
        (4, 'Friday', '10:00:00', '13:00:00', 30, 'Active')
      `);
      console.log('✅ Seeded default availability slots for doctors');
    }

    const [doctors] = await pool.query('SELECT doctor_id, name, specialization, email FROM doctor');
    console.log('Doctors in DB:', doctors);

    const [avails] = await pool.query('SELECT * FROM availability');
    console.log(`✅ Total availability rules: ${avails.length}`);

    console.log('--- Migration Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

setup();
