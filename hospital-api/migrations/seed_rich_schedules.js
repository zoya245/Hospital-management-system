const pool = require('../config/db');

async function seedRichSchedules() {
  try {
    console.log('--- Starting Rich Schedule & Appointment Seeding ---');

    // 1. Ensure Full Availability Schedules for All 4 Doctors
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const doctorConfigs = [
      { id: 1, start: '09:00:00', end: '17:00:00' },
      { id: 2, start: '09:30:00', end: '16:30:00' },
      { id: 3, start: '10:00:00', end: '17:00:00' },
      { id: 4, start: '09:00:00', end: '15:00:00' }
    ];

    for (const doc of doctorConfigs) {
      for (const day of days) {
        const [existing] = await pool.query(
          'SELECT availability_id FROM availability WHERE doctor_id = ? AND day_of_week = ?',
          [doc.id, day]
        );
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO availability (doctor_id, day_of_week, start_time, end_time, slot_duration, status) VALUES (?, ?, ?, ?, 30, "Active")',
            [doc.id, day, doc.start, doc.end]
          );
        }
      }
    }
    console.log('✅ Doctor availability schedules verified for Monday-Saturday.');

    // 2. Clean today's and near future demo appointments to re-seed cleanly
    await pool.query(`
      DELETE FROM appointment 
      WHERE appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 5 DAY)
    `);

    // 3. Insert Rich Appointments across Today and the Next 4 Days
    // Today's appointments (CURDATE())
    await pool.query(`
      INSERT INTO appointment 
      (patient_id, doctor_id, appointment_date, appointment_time, status, is_emergency, doctor_rating, symptoms_raw, symptoms_medical)
      VALUES
      -- Dr. Anil Patil (Cardiologist, ID 1) Today
      (1, 1, CURDATE(), '09:30:00', 'Confirmed', 0, NULL,
       'Occasional resting palpitations and mild chest tightness during morning exertion',
       'Sinus tachycardia pre-screening, exertional angina evaluation'),

      (60007, 1, CURDATE(), '10:45:00', 'Confirmed', 0, NULL,
       'Shortness of breath on climbing stairs and post-lunch lethargy',
       'Dyspnea on mild exertion, routine lipid review'),

      (4, 1, CURDATE(), '11:30:00', 'Scheduled', 0, NULL,
       'Elevated ambulatory BP (148/92 mmHg) and occasional occipital headache',
       'Essential Stage-1 hypertension follow-up'),

      (60008, 1, CURDATE(), '14:15:00', 'Confirmed', 0, NULL,
       'Chest tightness after evening walks and irregular pulse',
       'Cardiac stress screening and 24-hr Holter review'),

      (3, 1, CURDATE(), '16:00:00', 'Completed', 0, 5,
       'Post-medication cardiac follow-up and blood pressure check',
       'Controlled blood pressure (122/80 mmHg), medication compliance optimal'),

      -- Dr. Nisha Rao (Neurologist, ID 2) Today
      (2, 2, CURDATE(), '10:00:00', 'Confirmed', 0, NULL,
       'Frequent throbbing unilateral migraines with photophobia and nausea',
       'Chronic migraine with aura assessment'),

      (150007, 2, CURDATE(), '14:30:00', 'Scheduled', 0, NULL,
       'Tingling numbness in left fingertips radiating from cervical spine',
       'Cervical radiculopathy clinical evaluation'),

      -- Dr. Rajesh Kulkarni (Orthopedic Surgeon, ID 3) Today
      (5, 3, CURDATE(), '11:00:00', 'Confirmed', 0, NULL,
       'Severe right knee swelling and instability following soccer injury',
       'Suspected ACL and medial meniscus injury review'),

      (6, 3, CURDATE(), '15:30:00', 'Scheduled', 0, NULL,
       'Persistent lower lumbar stiffness and localized muscular spasms',
       'Acute lumbar muscular strain management'),

      -- Dr. Sneha Joshi (Pediatrician, ID 4) Today
      (60008, 4, CURDATE(), '09:15:00', 'Confirmed', 0, NULL,
       'Routine pediatric milestone wellness examination and scheduled vaccinations',
       '6-month pediatric developmental assessment & MMR booster')
    `);
    console.log("✅ Seeded 10 complete appointments for Today across all 4 doctors.");

    // Tomorrow's appointments (CURDATE() + 1 DAY)
    await pool.query(`
      INSERT INTO appointment 
      (patient_id, doctor_id, appointment_date, appointment_time, status, is_emergency, doctor_rating, symptoms_raw, symptoms_medical)
      VALUES
      (150007, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00', 'Confirmed', 0, NULL,
       'Hypertension therapeutic monitoring and ACE-inhibitor dosage titration',
       'Stage-1 Essential Hypertension clinical follow-up'),

      (5, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', 'Scheduled', 0, NULL,
       'Pre-athletic sports physical and resting cardiovascular review',
       'Cardiovascular sports clearance screening'),

      (60007, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:30:00', 'Scheduled', 0, NULL,
       'Persistent tension-type headache with visual fatigue',
       'Chronic tension headache evaluation')
    `);
    console.log("✅ Seeded 3 appointments for Tomorrow.");

    // In 2 Days (CURDATE() + 2 DAYS)
    await pool.query(`
      INSERT INTO appointment 
      (patient_id, doctor_id, appointment_date, appointment_time, status, is_emergency, doctor_rating, symptoms_raw, symptoms_medical)
      VALUES
      (2, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:30:00', 'Confirmed', 0, NULL,
       'Follow-up fasting lipid profile and ASCVD risk evaluation',
       'Hyperlipidemia & metabolic monitoring'),

      (3, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:15:00', 'Scheduled', 0, NULL,
       'Follow-up ambulatory Holter monitoring discussion',
       'Arrhythmia surveillance review'),

      (1, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', 'Scheduled', 0, NULL,
       'Right shoulder rotator cuff strain physical therapy review',
       'Rotator cuff tendinopathy follow-up')
    `);
    console.log("✅ Seeded 3 appointments for Day 2.");

    // In 3 Days (CURDATE() + 3 DAYS)
    await pool.query(`
      INSERT INTO appointment 
      (patient_id, doctor_id, appointment_date, appointment_time, status, is_emergency, doctor_rating, symptoms_raw, symptoms_medical)
      VALUES
      (1, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '11:00:00', 'Confirmed', 0, NULL,
       'Comprehensive 24-hr Holter ECG & lipid profile final review',
       'Post-treatment cardiac rhythm and metabolic clearance'),

      (1, 4, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:30:00', 'Scheduled', 0, NULL,
       'Preventive healthcare & annual biometric evaluation',
       'Annual comprehensive wellness panel')
    `);
    console.log("✅ Seeded upcoming appointments for Day 3.");

    // 4. Ensure bills exist for today's new appointments
    const [todayAppts] = await pool.query(
      "SELECT appointment_id, patient_id FROM appointment WHERE appointment_date = CURDATE()"
    );
    for (const a of todayAppts) {
      const [existingBill] = await pool.query(
        "SELECT bill_id FROM bill WHERE appointment_id = ?",
        [a.appointment_id]
      );
      if (existingBill.length === 0) {
        await pool.query(
          "INSERT INTO bill (patient_id, appointment_id, amount, description, status) VALUES (?, ?, 500.00, 'Consultation & Clinical Evaluation Fee', 'Pending')",
          [a.patient_id, a.appointment_id]
        );
      }
    }
    console.log("✅ Created matching billing invoices for today's consultations.");

    console.log('--- Rich Seeding Finished Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  }
}

seedRichSchedules();
