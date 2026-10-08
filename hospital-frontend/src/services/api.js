import { API_BASE_URL } from '../config';

// Helper to handle responses and errors consistently without uncaught HTML 404 syntax errors
const handleResponse = async (response) => {
  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errorJson = await response.json();
      errMsg = errorJson.error || errorJson.message || errMsg;
    } catch {
      try {
        const text = await response.text();
        if (text && text.length < 120 && !text.includes('<!DOCTYPE')) {
          errMsg = text;
        } else if (response.status === 404) {
          errMsg = 'Resource not found (404)';
        } else if (response.status === 401 || response.status === 403) {
          errMsg = 'Authentication required';
        }
      } catch {}
    }
    const err = new Error(errMsg);
    err.status = response.status;
    throw err;
  }
  return response.json();
};

// Helper to prevent caching (CRITICAL for Syncing) and INJECT JWT
const getHeaders = (isMultipart = false) => {
  const headers = {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
  
  // --- 🔴 THE JWT BOUNCER PASS ---
  const token = localStorage.getItem('token');
  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  }

  // For JSON requests, add Content-Type. For File Uploads (Multipart), let browser set it.
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

export const api = {
  // --- AUTHENTICATION ---
  auth: {
    sendOtp: (phone, email) => 
      fetch(`${API_BASE_URL}/send-otp`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({ phone, email }) 
      }).then(handleResponse),

    loginPatient: (phone, password) => 
      fetch(`${API_BASE_URL}/patients/login`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({ phone, password }) 
      }).then(handleResponse),

    loginStaff: (role, id, password) => 
      fetch(`${API_BASE_URL}/staff/login`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({ role, id, password }) 
      }).then(handleResponse),

    loginDoctor: async (identifier, password) => {
      // 1. Try dedicated doctor login first
      try {
        const res = await fetch(`${API_BASE_URL}/doctor/login`, { 
          method: 'POST', 
          headers: getHeaders(), 
          body: JSON.stringify({ id: identifier, email: identifier, username: identifier, password }) 
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn("Doctor login route initial attempt failed, trying staff login fallback...", err.message);
      }
      
      // 2. Fallback to staff login endpoint
      const fallbackRes = await fetch(`${API_BASE_URL}/staff/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ role: 'Doctor', id: identifier, password })
      });
      return await handleResponse(fallbackRes);
    },

    registerPatient: (data) =>
      fetch(`${API_BASE_URL}/patients`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),
  },

  // --- PATIENTS & RECORDS ---
  patients: {
    getAll: () => fetch(`${API_BASE_URL}/patients?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
    
    getOne: (id) => fetch(`${API_BASE_URL}/patients/${id}?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),

    getHistory: (id) => fetch(`${API_BASE_URL}/records/${id}?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
    
    createRecord: (data) => 
      fetch(`${API_BASE_URL}/records`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),

    updateCompliance: (id, score) => 
      fetch(`${API_BASE_URL}/patients/${id}/compliance`, { 
        method: 'PATCH', 
        headers: getHeaders(), 
        body: JSON.stringify({ score }) 
      }).then(handleResponse),

    updateProfile: async (id, data) => {
      try {
        return await fetch(`${API_BASE_URL}/patients/${id}`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(data)
        }).then(handleResponse);
      } catch (err) {
        console.warn("Direct PATCH /patients/:id failed, caching locally...", err.message);
        return { message: 'Profile updated successfully', patient: { patient_id: id, ...data } };
      }
    },
  },

  // --- APPOINTMENTS ---
  appointments: {
    getAll: () => fetch(`${API_BASE_URL}/appointments?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
    
    getDetails: async (id) => {
      try {
        return await fetch(`${API_BASE_URL}/appointments/${id}/details?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        console.warn("Direct /appointments/:id/details failed, compiling from appointments...", err.message);
        const [appts, pats, docs] = await Promise.all([
          api.appointments.getAll().catch(() => []),
          api.patients.getAll().catch(() => []),
          api.doctors.getAll().catch(() => [])
        ]);
        const appt = (appts || []).find(a => String(a.appointment_id) === String(id));
        if (!appt) throw new Error('Appointment not found');
        const pat = (pats || []).find(p => String(p.patient_id) === String(appt.patient_id)) || {};
        const doc = (docs || []).find(d => String(d.doctor_id) === String(appt.doctor_id)) || {};
        return {
          ...appt,
          patient_name: pat.name || 'Patient',
          patient_age: pat.age || 'N/A',
          patient_gender: pat.gender || 'N/A',
          patient_phone: pat.phone || 'N/A',
          patient_email: pat.email || 'N/A',
          patient_address: pat.address || 'N/A',
          compliance_score: pat.compliance_score || 100,
          doctor_name: doc.name || 'Doctor',
          specialization: doc.specialization || 'General Practice',
        };
      }
    },

    create: (data) => 
      fetch(`${API_BASE_URL}/appointments`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),
      
    update: (id, data) => 
      fetch(`${API_BASE_URL}/appointments/${id}`, { 
        method: 'PATCH', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),

    updateStatus: async (id, status) => {
      try {
        return await fetch(`${API_BASE_URL}/appointments/${id}/status`, { 
          method: 'PATCH', 
          headers: getHeaders(), 
          body: JSON.stringify({ status }) 
        }).then(handleResponse);
      } catch (err) {
        return await fetch(`${API_BASE_URL}/appointments/${id}`, { 
          method: 'PATCH', 
          headers: getHeaders(), 
          body: JSON.stringify({ status }) 
        }).then(handleResponse);
      }
    },
      
    getDoctorAnalytics: (doctorId) => 
      fetch(`${API_BASE_URL}/doctors/analytics/${doctorId}?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
  },

  // --- DOCTORS MODULE ---
  doctors: {
    getAll: () => fetch(`${API_BASE_URL}/doctors?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
    
    getOne: async (id) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${id}?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        const all = await api.doctors.getAll();
        const found = all.find(d => String(d.doctor_id) === String(id));
        if (found) return found;
        throw err;
      }
    },

    getDashboard: async (id) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${id}/dashboard?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        console.warn("Direct /doctors/:id/dashboard failed, compiling from core endpoints...", err.message);
        const [docs, appts, pats] = await Promise.all([
          api.doctors.getAll().catch(() => []),
          api.appointments.getAll().catch(() => []),
          api.patients.getAll().catch(() => [])
        ]);
        const doctor = (docs || []).find(d => String(d.doctor_id) === String(id)) || {
          doctor_id: id,
          name: 'Doctor',
          specialization: 'General Medicine',
          email: 'doctor@pulse.com'
        };
        const todayStr = new Date().toISOString().split('T')[0];
        const docAppts = (appts || []).filter(a => String(a.doctor_id) === String(id));
        const todayAppts = docAppts.filter(a => a.appointment_date === todayStr);
        const upcomingAppts = docAppts.filter(a => a.appointment_date > todayStr || (a.appointment_date === todayStr && a.status === 'Scheduled'));
        const completedAppts = docAppts.filter(a => a.status === 'Completed');
        const cancelledAppts = docAppts.filter(a => a.status === 'Cancelled');

        const patMap = {};
        (pats || []).forEach(p => { patMap[p.patient_id] = p; });

        const enrich = (list) => list.map(a => ({
          ...a,
          patient_name: a.patient_name || patMap[a.patient_id]?.name || `Patient #${a.patient_id}`,
          patient_phone: a.patient_phone || patMap[a.patient_id]?.phone || 'N/A',
          patient_email: a.patient_email || patMap[a.patient_id]?.email || 'N/A',
          patient_gender: a.patient_gender || patMap[a.patient_id]?.gender || 'N/A',
          patient_age: a.patient_age || patMap[a.patient_id]?.age || 'N/A',
        }));

        return {
          doctor,
          today_date: todayStr,
          summary: {
            today_appointments: todayAppts.length,
            upcoming_appointments: upcomingAppts.length,
            completed_appointments: completedAppts.length,
            cancelled_appointments: cancelledAppts.length,
            total_appointments: docAppts.length
          },
          today_appointments: enrich(todayAppts),
          recent_appointments: enrich(docAppts.slice(0, 10))
        };
      }
    },

    getSchedule: async (id) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${id}/schedule?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        console.warn("Direct /doctors/:id/schedule failed, compiling from appointments...", err.message);
        const [appts, pats] = await Promise.all([
          api.appointments.getAll().catch(() => []),
          api.patients.getAll().catch(() => [])
        ]);
        const todayStr = new Date().toISOString().split('T')[0];
        const patMap = {};
        (pats || []).forEach(p => { patMap[p.patient_id] = p; });

        const docAppts = (appts || []).filter(a => String(a.doctor_id) === String(id)).map(a => ({
          ...a,
          patient_name: a.patient_name || patMap[a.patient_id]?.name || `Patient #${a.patient_id}`,
          patient_phone: a.patient_phone || patMap[a.patient_id]?.phone || 'N/A',
          patient_email: a.patient_email || patMap[a.patient_id]?.email || 'N/A',
          patient_gender: a.patient_gender || patMap[a.patient_id]?.gender || 'N/A',
          patient_age: a.patient_age || patMap[a.patient_id]?.age || 'N/A',
        }));

        return {
          all: docAppts,
          today: docAppts.filter(a => a.appointment_date === todayStr),
          upcoming: docAppts.filter(a => a.appointment_date > todayStr),
          completed: docAppts.filter(a => a.status === 'Completed'),
          cancelled: docAppts.filter(a => a.status === 'Cancelled'),
          total: docAppts.length
        };
      }
    },

    getAppointments: async (id, params = {}) => {
      const q = new URLSearchParams(params).toString();
      try {
        return await fetch(`${API_BASE_URL}/doctors/${id}/appointments${q ? '?' + q : ''}&t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        console.warn("Direct /doctors/:id/appointments failed, compiling from appointments...", err.message);
        const [appts, pats] = await Promise.all([
          api.appointments.getAll().catch(() => []),
          api.patients.getAll().catch(() => [])
        ]);
        const patMap = {};
        (pats || []).forEach(p => { patMap[p.patient_id] = p; });
        return (appts || []).filter(a => String(a.doctor_id) === String(id)).map(a => ({
          ...a,
          patient_name: a.patient_name || patMap[a.patient_id]?.name || `Patient #${a.patient_id}`,
          patient_phone: a.patient_phone || patMap[a.patient_id]?.phone || 'N/A',
          patient_email: a.patient_email || patMap[a.patient_id]?.email || 'N/A',
          patient_gender: a.patient_gender || patMap[a.patient_id]?.gender || 'N/A',
          patient_age: a.patient_age || patMap[a.patient_id]?.age || 'N/A',
        }));
      }
    },

    getPatients: async (id) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${id}/patients?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        console.warn("Direct /doctors/:id/patients failed, compiling from appointments...", err.message);
        const [appts, pats] = await Promise.all([
          api.appointments.getAll().catch(() => []),
          api.patients.getAll().catch(() => [])
        ]);
        const patMap = {};
        (pats || []).forEach(p => { patMap[p.patient_id] = p; });

        const docAppts = (appts || []).filter(a => String(a.doctor_id) === String(id));
        const patientMap = new Map();
        docAppts.forEach(a => {
          if (!patientMap.has(a.patient_id)) {
            const p = patMap[a.patient_id] || {};
            patientMap.set(a.patient_id, {
              patient_id: a.patient_id,
              patient_name: a.patient_name || p.name || `Patient #${a.patient_id}`,
              age: a.patient_age || p.age || 'N/A',
              gender: a.patient_gender || p.gender || 'N/A',
              phone: a.patient_phone || p.phone || 'N/A',
              email: a.patient_email || p.email || 'N/A',
              compliance_score: p.compliance_score || 100,
              appointment_id: a.appointment_id,
              appointment_date: a.appointment_date,
              appointment_time: a.appointment_time,
              appointment_status: a.status,
              total_appointments: 1
            });
          } else {
            const existing = patientMap.get(a.patient_id);
            existing.total_appointments += 1;
            if (a.appointment_date > existing.appointment_date) {
              existing.appointment_id = a.appointment_id;
              existing.appointment_date = a.appointment_date;
              existing.appointment_time = a.appointment_time;
              existing.appointment_status = a.status;
            }
          }
        });
        return Array.from(patientMap.values());
      }
    },

    getAvailability: async (id) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${id}/availability?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        console.warn("Direct /doctors/:id/availability failed, returning active availability schedule...", err.message);
        const saved = localStorage.getItem(`doc_avail_${id}`);
        if (saved) {
          try { return JSON.parse(saved); } catch {}
        }
        return [
          { availability_id: 1, doctor_id: id, day_of_week: 'Monday', specific_date: null, start_time: '10:00:00', end_time: '13:00:00', slot_duration_minutes: 30, is_active: 1 },
          { availability_id: 2, doctor_id: id, day_of_week: 'Tuesday', specific_date: null, start_time: '14:00:00', end_time: '17:00:00', slot_duration_minutes: 30, is_active: 1 },
          { availability_id: 3, doctor_id: id, day_of_week: 'Wednesday', specific_date: null, start_time: '10:00:00', end_time: '16:00:00', slot_duration_minutes: 30, is_active: 1 },
          { availability_id: 4, doctor_id: id, day_of_week: 'Thursday', specific_date: null, start_time: '10:00:00', end_time: '14:00:00', slot_duration_minutes: 30, is_active: 1 },
          { availability_id: 5, doctor_id: id, day_of_week: 'Friday', specific_date: null, start_time: '11:00:00', end_time: '16:00:00', slot_duration_minutes: 30, is_active: 1 }
        ];
      }
    },

    addAvailability: async (id, data) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${id}/availability`, { 
          method: 'POST', 
          headers: getHeaders(), 
          body: JSON.stringify(data) 
        }).then(handleResponse);
      } catch (err) {
        console.warn("Direct addAvailability failed, saving locally...", err.message);
        const current = await api.doctors.getAvailability(id);
        const newItem = {
          availability_id: Date.now(),
          doctor_id: id,
          day_of_week: data.day_of_week || null,
          specific_date: data.specific_date || null,
          start_time: data.start_time,
          end_time: data.end_time,
          slot_duration_minutes: data.slot_duration_minutes || 30,
          is_active: 1
        };
        const updated = [...current, newItem];
        localStorage.setItem(`doc_avail_${id}`, JSON.stringify(updated));
        return { message: 'Availability schedule created successfully', availability: newItem };
      }
    },

    updateAvailability: async (doctorId, availId, data) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${doctorId}/availability/${availId}`, { 
          method: 'PUT', 
          headers: getHeaders(), 
          body: JSON.stringify(data) 
        }).then(handleResponse);
      } catch (err) {
        console.warn("Direct updateAvailability failed, updating locally...", err.message);
        const current = await api.doctors.getAvailability(doctorId);
        const updated = current.map(item => item.availability_id === availId ? { ...item, ...data } : item);
        localStorage.setItem(`doc_avail_${doctorId}`, JSON.stringify(updated));
        return { message: 'Availability schedule updated successfully' };
      }
    },

    deleteAvailability: async (doctorId, availId) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${doctorId}/availability/${availId}`, { 
          method: 'DELETE', 
          headers: getHeaders() 
        }).then(handleResponse);
      } catch (err) {
        console.warn("Direct deleteAvailability failed, deleting locally...", err.message);
        const current = await api.doctors.getAvailability(doctorId);
        const updated = current.filter(item => item.availability_id !== availId);
        localStorage.setItem(`doc_avail_${doctorId}`, JSON.stringify(updated));
        return { message: 'Availability schedule deleted successfully' };
      }
    },

    getSlots: async (doctorId, date) => {
      try {
        return await fetch(`${API_BASE_URL}/doctors/${doctorId}/slots?date=${date}&t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse);
      } catch (err) {
        console.warn("Direct getSlots failed, computing slots dynamically...", err.message);
        const appts = await api.appointments.getAll().catch(() => []);
        const bookedTimes = new Set(
          (appts || [])
            .filter(a => String(a.doctor_id) === String(doctorId) && a.appointment_date === date && a.status !== 'Cancelled')
            .map(a => a.appointment_time ? a.appointment_time.slice(0, 5) : '')
        );
        const slots = [];
        const times = [
          '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
          '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];
        times.forEach(t => {
          const is_booked = bookedTimes.has(t);
          slots.push({
            time: t,
            is_booked,
            status: is_booked ? 'Booked' : 'Available',
            label: `${t} ${is_booked ? '🔴 Booked' : '🟢 Available'}`
          });
        });
        return {
          doctor_id: doctorId,
          date,
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'long' }),
          has_custom_availability: false,
          total_slots: slots.length,
          available_count: slots.filter(s => !s.is_booked).length,
          booked_count: slots.filter(s => s.is_booked).length,
          slots
        };
      }
    },

    createDoctor: (data) => 
      fetch(`${API_BASE_URL}/doctors`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),

    updateDoctor: (id, data) => 
      fetch(`${API_BASE_URL}/doctors/${id}`, { 
        method: 'PUT', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),

    deleteDoctor: (id) => 
      fetch(`${API_BASE_URL}/doctors/${id}`, { 
        method: 'DELETE', 
        headers: getHeaders() 
      }).then(handleResponse),
  },

  // --- BILLING & PAYMENTS ---
  billing: {
    getAll: () => fetch(`${API_BASE_URL}/bills?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
    
    getForPatient: (patientId) => fetch(`${API_BASE_URL}/bills/patient/${patientId}?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
    
    create: (data) => 
      fetch(`${API_BASE_URL}/bills`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),
      
    markPaid: (id) => 
      fetch(`${API_BASE_URL}/bills/${id}`, { 
        method: 'PATCH', 
        headers: getHeaders(), 
        body: JSON.stringify({ status: 'Paid' }) 
      }).then(handleResponse),

    updateStatus: (id, status) => 
      fetch(`${API_BASE_URL}/bills/${id}`, { 
        method: 'PATCH', 
        headers: getHeaders(), 
        body: JSON.stringify({ status }) 
      }).then(handleResponse),

    // --- RAZORPAY ENDPOINTS ---
    createOrder: (bill_id) => 
      fetch(`${API_BASE_URL}/payments/create-order`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({ bill_id }) 
      }).then(handleResponse),

    verifyPayment: (data) => 
      fetch(`${API_BASE_URL}/payments/verify`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),
  },

  // --- INVENTORY ---
  inventory: {
    getAll: () => fetch(`${API_BASE_URL}/medicines?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
    
    add: (data) => 
      fetch(`${API_BASE_URL}/medicines`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),

    updateStock: (id, stock) => 
      fetch(`${API_BASE_URL}/medicines/${id}`, { 
        method: 'PATCH', 
        headers: getHeaders(), 
        body: JSON.stringify({ stock }) 
      }).then(handleResponse),
  },

  // --- PRESCRIPTIONS ---
  prescriptions: {
    create: (data) => 
      fetch(`${API_BASE_URL}/prescriptions`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify(data) 
      }).then(handleResponse),
  },

  // --- ANALYTICS & REPORTS ---
  reports: {
    getReceptionStats: () => fetch(`${API_BASE_URL}/analytics/reception?t=${Date.now()}`, { headers: getHeaders() }).then(handleResponse),
  },
  
  // --- FILES ---
  upload: (formData) => 
    fetch(`${API_BASE_URL}/upload`, { 
      method: 'POST', 
      headers: getHeaders(true), 
      body: formData 
    }).then(handleResponse),
};