import React, { useState, useEffect } from 'react';
import { Calendar, Clock, AlertCircle, Sparkles, BrainCircuit, CheckCircle2, XCircle } from 'lucide-react'; 
import Card from './Card'; 
import { API_BASE_URL } from '../config';
import { api } from '../services/api';

const AppointmentScheduler = ({ patientId, doctors, onSchedule }) => {
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState(''); 
  const [isEmergency, setIsEmergency] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Doctor Dynamic Availability Slots
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsMeta, setSlotsMeta] = useState(null);

  // AI TRIAGE STATE
  const [isTriageMode, setIsTriageMode] = useState(false);
  const [symptomsRaw, setSymptomsRaw] = useState('');
  const [symptomsMedical, setSymptomsMedical] = useState('');
  const [patientExplanation, setPatientExplanation] = useState(''); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageSuccess, setTriageSuccess] = useState('');

  // Fetch slots whenever Doctor or Date changes
  useEffect(() => {
    if (!selectedDoctorId || !appointmentDate) {
      setDoctorSlots([]);
      setSlotsMeta(null);
      return;
    }

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setError('');
      try {
        const data = await api.doctors.getSlots(selectedDoctorId, appointmentDate);
        setDoctorSlots(data.slots || []);
        setSlotsMeta({
          day: data.day,
          available_count: data.available_count,
          booked_count: data.booked_count,
          total_slots: data.total_slots
        });

        // If currently selected time is booked, reset it
        if (appointmentTime) {
          const matchingSlot = (data.slots || []).find(s => s.start_time === appointmentTime || s.time_value === appointmentTime);
          if (matchingSlot && matchingSlot.is_booked) {
            setAppointmentTime('');
          }
        }
      } catch (err) {
        console.error("Failed to load doctor slots:", err);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDoctorId, appointmentDate]);

  // AI Analysis Handler
  const handleAnalyzeSymptoms = async () => {
    if (!symptomsRaw.trim()) {
      setError("Please describe your problem first.");
      return;
    }
    
    setIsAnalyzing(true);
    setError('');
    setTriageSuccess('');
    setPatientExplanation(''); 

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/triage`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          symptoms: symptomsRaw,
          available_doctors: doctors 
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI Analysis failed.');

      setSelectedDoctorId(data.recommended_doctor_id.toString());
      setSymptomsMedical(data.medical_terms); 
      setPatientExplanation(data.patient_friendly_explanation); 
      setTriageSuccess(`AI Recommendation: We have selected Dr. ${data.recommended_doctor_name} (${data.specialty}) based on your symptoms.`);
      
    } catch (err) {
      setError("Our AI is currently unavailable. Please select a doctor manually from the dropdown.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !appointmentDate || !appointmentTime) {
      setError("Please select a doctor, consultation date, and an available time slot.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    const newAppointmentData = {
      patient_id: patientId,
      doctor_id: parseInt(selectedDoctorId),
      appointment_date: appointmentDate,
      appointment_time: appointmentTime, 
      is_emergency: isEmergency,
      symptoms_raw: isTriageMode ? symptomsRaw : null,
      symptoms_medical: isTriageMode ? symptomsMedical : null
    };

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newAppointmentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to book appointment.');
      }

      onSchedule(result);
      
      // Reset Form
      setSelectedDoctorId('');
      setAppointmentDate('');
      setAppointmentTime(''); 
      setIsEmergency(false);
      setIsTriageMode(false);
      setSymptomsRaw('');
      setSymptomsMedical('');
      setPatientExplanation(''); 
      setTriageSuccess('');

    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Card title="Book Doctor Consultation" icon={Calendar} className="col-span-1 md:col-span-2">
      
      {/* AI TRIAGE TOGGLE */}
      <div className="mb-6 flex justify-end">
        <button 
          type="button" 
          onClick={() => setIsTriageMode(!isTriageMode)}
          className={`flex items-center px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            isTriageMode 
              ? 'bg-indigo-100 text-indigo-700 shadow-inner' 
              : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-indigo-500/20 hover:scale-[1.02] active:scale-95'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isTriageMode ? 'Switch to Manual Selection' : 'Unsure? Let AI Choose Specialist'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl flex items-center text-sm font-medium">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* --- AI TRIAGE INPUT AREA --- */}
        {isTriageMode && (
          <div className="bg-indigo-50/70 border border-indigo-100 p-5 rounded-2xl animate-fade-in space-y-3">
            <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <BrainCircuit className="w-4 h-4 text-indigo-600"/> Describe Your Symptoms in Plain English
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <textarea 
                value={symptomsRaw}
                onChange={(e) => setSymptomsRaw(e.target.value)}
                placeholder="e.g., 'Sharp pain in lower back after lifting weights and stiffness in the morning...'"
                className="flex-grow p-3.5 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none h-20 bg-white"
              />
              <button 
                type="button" 
                onClick={handleAnalyzeSymptoms}
                disabled={isAnalyzing || !symptomsRaw.trim()}
                className="bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex sm:flex-col items-center justify-center gap-1 min-w-[130px] cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {isAnalyzing ? (
                  <span className="animate-pulse text-xs">Analyzing...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs">Analyze Symptoms</span>
                  </>
                )}
              </button>
            </div>
            
            {triageSuccess && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm animate-fade-in">
                <div className="font-bold text-emerald-900 text-xs sm:text-sm flex items-center mb-1.5">
                  <Sparkles className="w-4 h-4 mr-1.5 text-emerald-600"/> 
                  {triageSuccess}
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed italic">
                  "{patientExplanation}"
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* ROW 1: Doctor & Date Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Doctor Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">1. Select Doctor</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className={`w-full p-3.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium ${
                triageSuccess ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200'
              }`}
              required
              disabled={isSubmitting || (isTriageMode && triageSuccess)}
            >
              <option value="" disabled>-- Choose Specialist --</option>
              {doctors.map(d => {
                let ratingDisplay = '';
                if (d.average_rating) ratingDisplay = `⭐ ${parseFloat(d.average_rating).toFixed(1)}`;
                return (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.name} ({d.specialization}) {ratingDisplay}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Date Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">2. Select Consultation Date</label>
            <input
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              min={today} 
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white font-medium"
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* ROW 2: REAL-TIME DOCTOR SLOTS SELECTION */}
        {selectedDoctorId && appointmentDate && (
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Choose Doctor Consultation Slot ({slotsMeta?.day || ''})
              </label>
              {slotsMeta && (
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {slotsMeta.available_count} Available
                  </span>
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    {slotsMeta.booked_count} Booked
                  </span>
                </div>
              )}
            </div>

            {isLoadingSlots ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 animate-pulse py-2">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl"></div>)}
              </div>
            ) : doctorSlots.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200 text-xs text-slate-500">
                No slots configured for this day. Please select a different date.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
                {doctorSlots.map(slot => {
                  const isSelected = appointmentTime === slot.start_time || appointmentTime === slot.time_value;
                  const isBooked = slot.is_booked;

                  return (
                    <button
                      key={slot.slot_id}
                      type="button"
                      disabled={isBooked || isSubmitting}
                      onClick={() => setAppointmentTime(slot.start_time)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                        isBooked
                          ? 'bg-rose-50/70 border-rose-200/80 text-rose-400 opacity-70 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-[1.02]'
                          : 'bg-white hover:bg-indigo-50/60 border-slate-200 text-slate-800 hover:border-indigo-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-mono">{slot.label}</span>
                        {isBooked ? (
                          <span className="text-[10px] text-rose-600 font-black">🔴 Booked</span>
                        ) : isSelected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold">🟢 Available</span>
                        )}
                      </div>
                      <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {isBooked ? 'Slot unavailable' : 'Click to select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ROW 3: Urgent Checkbox & Submit */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <label className={`flex items-center px-4 py-3 rounded-xl border cursor-pointer transition select-none w-full sm:w-auto ${
            isEmergency ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="h-4 w-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500 mr-2"
              disabled={isSubmitting}
            />
            <span className="text-xs font-bold">Mark as Critical / Urgent</span>
          </label>
            
          <button
            type="submit"
            disabled={isSubmitting || !selectedDoctorId || !appointmentDate || !appointmentTime}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition shadow-lg shadow-indigo-500/25 disabled:opacity-50 font-bold text-sm cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>{isSubmitting ? 'Confirming Booking...' : 'Confirm Consultation Booking'}</span>
          </button>
        </div>

      </form>
    </Card>
  );
};

export default AppointmentScheduler;