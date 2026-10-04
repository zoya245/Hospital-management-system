import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import AddRecordForm from '../components/AddRecordForm';
import ManageAvailability from '../components/ManageAvailability';
import DoctorSchedule from './DoctorSchedule';
import DoctorPatients from './DoctorPatients';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import { 
  Calendar, Clock, User, Activity, ThumbsUp, ThumbsDown, 
  Search, Users, Star, ArrowRight, FileText, Pill, BrainCircuit,
  LayoutDashboard, CalendarRange, CheckCircle2, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import { getPatientName, getDepartmentName } from '../mockData';
import { api } from '../services/api';
import { io } from "socket.io-client";
import { BACKEND_URL } from '../config';

const DOCTOR_TABS = {
  DASHBOARD: 'dashboard',
  AVAILABILITY: 'availability',
  SCHEDULE: 'schedule',
  PATIENTS: 'patients',
  CONSULTATION: 'consultation'
};

const DoctorDashboard = ({ data, userId }) => {
  const [activeTab, setActiveTab] = useState(DOCTOR_TABS.DASHBOARD);
  
  // Dashboard Core Data
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // Selected Appointment Modal
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Consultation Room State
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [recentAppointmentsMap, setRecentAppointmentsMap] = useState({});
  const [inventoryUpdateTrigger, setInventoryUpdateTrigger] = useState(0);

  // Fallback Doctor object if API hasn't loaded yet
  const doctorFromProps = data?.doctors?.find(d => d.doctor_id === userId);
  const doctor = dashboardData?.doctor || doctorFromProps || {
    doctor_id: userId,
    name: 'Doctor',
    specialization: 'General Medicine',
    email: 'doctor@pulse.com'
  };

  // --- FETCH COMPREHENSIVE DASHBOARD DATA ---
  const fetchDashboard = async () => {
    if (!userId) return;
    setIsLoadingDashboard(true);
    try {
      const dash = await api.doctors.getDashboard(userId);
      setDashboardData(dash);
    } catch (err) {
      console.error("Failed to load doctor dashboard:", err);
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [userId]);

  // --- REAL-TIME LISTENERS ---
  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on("inventory_updated", () => {
      setInventoryUpdateTrigger(prev => prev + 1);
    });

    socket.on("appointment_updated", (eventData) => {
      if (eventData.doctor_id == userId) {
        fetchDashboard();
      }
    });

    socket.on("doctor_availability_updated", (eventData) => {
      if (eventData.doctor_id == userId) {
        fetchDashboard();
      }
    });

    return () => socket.disconnect();
  }, [userId]);

  // --- CONSULTATION PATIENT SELECTION ---
  const handleSelectPatientForConsultation = async (patientId) => {
    setIsLoadingHistory(true);
    setActiveTab(DOCTOR_TABS.CONSULTATION);
    try {
      const freshProfile = await api.patients.getOne(patientId);
      const todayAppt = dashboardData?.today_appointments?.find(a => a.patient_id === patientId);

      setSelectedPatient({
        ...freshProfile,
        symptoms_raw: todayAppt?.symptoms_raw || null,
        symptoms_medical: todayAppt?.symptoms_medical || null
      });

      const history = await api.patients.getHistory(patientId);
      setPatientHistory(history);
    } catch (err) {
      console.error(err);
      setPatientHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleComplianceUpdate = async (change) => {
    if (!selectedPatient) return;
    const currentScore = selectedPatient.compliance_score || 100;
    const newScore = Math.min(100, Math.max(0, currentScore + change));
    setSelectedPatient(prev => ({ ...prev, compliance_score: newScore }));
    try {
      await api.patients.updateCompliance(selectedPatient.patient_id, newScore);
    } catch (error) {
      setSelectedPatient(prev => ({ ...prev, compliance_score: currentScore }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">Confirmed</span>;
      case 'Completed':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-blue-200">Completed</span>;
      case 'Cancelled':
        return <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200">Cancelled</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">Scheduled</span>;
    }
  };

  const summary = dashboardData?.summary || {
    today_appointments: 0,
    upcoming_appointments: 0,
    completed_appointments: 0,
    cancelled_appointments: 0
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      
      {/* ========================================================= */}
      {/* 1. DOCTOR PORTAL BANNER (Info, Specialization, Date)      */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-white via-indigo-50/30 to-white border border-slate-200/80 shadow-sm rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-500/25 shrink-0">
            {(doctor?.name || 'Doctor').replace('Dr. ', '').split(' ').filter(Boolean).map(n => n[0]).join('') || 'DR'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`}
              </h1>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
              <span className="bg-indigo-100/80 text-indigo-700 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-200/60">
                {doctor.specialization}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 text-xs font-semibold">
                {doctor.email}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Date & Doctor ID Badge */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
          <div className="text-left md:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Today's Date</span>
            <p className="text-sm font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>{dashboardData?.doctor?.formatted_today || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Doctor ID</span>
            <p className="text-base font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 mt-0.5">
              #{doctor.doctor_id}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. DOCTOR WORKSPACE: SIDEBAR NAVIGATION + MAIN CONTENT     */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* LEFT PROFESSIONAL SIDEBAR */}
        <aside className="w-full lg:w-72 shrink-0">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-6 lg:sticky lg:top-24">
            
            {/* Station Status */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Station Status</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active on Duty
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white px-2 py-1 rounded-lg border border-slate-200 text-slate-600">
                OPD-1
              </span>
            </div>

            {/* Vertical Navigation Bar */}
            <nav className="space-y-1.5">
              {[
                { id: DOCTOR_TABS.DASHBOARD, label: 'Dashboard Overview', icon: LayoutDashboard, badge: summary.today_appointments > 0 ? `${summary.today_appointments} today` : null },
                { id: DOCTOR_TABS.AVAILABILITY, label: 'Manage Availability', icon: Clock, badge: 'Slots' },
                { id: DOCTOR_TABS.SCHEDULE, label: 'Doctor Schedule', icon: CalendarRange, badge: summary.upcoming_appointments > 0 ? summary.upcoming_appointments : null },
                { id: DOCTOR_TABS.PATIENTS, label: 'Patient Details', icon: Users, badge: null },
                { id: DOCTOR_TABS.CONSULTATION, label: 'Clinical Consult & Rx', icon: Activity, badge: 'Rx Lab' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    activeTab === item.id
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25 font-black scale-[1.02]'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                      activeTab === item.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* Doctor Info Mini Footer */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Specialization</span>
                <span className="font-bold text-slate-800">{doctor.specialization}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Rating</span>
                <span className="font-bold text-amber-600">★ {Number(dashboardData?.summary?.average_rating || 5.0).toFixed(1)} / 5</span>
              </div>
            </div>

          </div>
        </aside>

        {/* RIGHT MAIN VIEW AREA */}
        <main className="flex-1 min-w-0 w-full space-y-6">

      {/* --- TAB A: MAIN DASHBOARD --- */}
      {activeTab === DOCTOR_TABS.DASHBOARD && (
        <div className="space-y-8 animate-fade-in">
          
          {/* APPOINTMENT SUMMARY (Today's, Upcoming, Completed, Cancelled) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Card 1: Today's Appointments */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Appointments</span>
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.today_appointments}</span>
                <span className="text-xs font-semibold text-slate-400">Sessions</span>
              </div>
              <p className="text-[11px] text-indigo-600 font-bold mt-2 flex items-center gap-1">
                <span>Real-time DB sync</span>
              </p>
            </div>

            {/* Card 2: Upcoming Appointments */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Appointments</span>
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.upcoming_appointments}</span>
                <span className="text-xs font-semibold text-slate-400">Queued</span>
              </div>
              <p className="text-[11px] text-blue-600 font-bold mt-2">Next upcoming visits</p>
            </div>

            {/* Card 3: Completed Appointments */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Consults</span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.completed_appointments}</span>
                <span className="text-xs font-semibold text-slate-400">Finished</span>
              </div>
              <p className="text-[11px] text-emerald-600 font-bold mt-2">Historical consults</p>
            </div>

            {/* Card 4: Cancelled Appointments */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled Appointments</span>
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.cancelled_appointments}</span>
                <span className="text-xs font-semibold text-slate-400">Cancelled</span>
              </div>
              <p className="text-[11px] text-rose-600 font-bold mt-2">Rescheduled or voided</p>
            </div>

          </div>

          {/* TODAY'S APPOINTMENT LIST TABLE */}
          <Card title="Today's Consultation List" icon={Calendar}>
            {isLoadingDashboard ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>)}
              </div>
            ) : !dashboardData?.today_appointments || dashboardData.today_appointments.length === 0 ? (
              <div className="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-700">No appointments scheduled for today.</p>
                <p className="text-xs text-slate-400 mt-1">Check the Doctor Schedule or Manage Availability tabs to review upcoming consultations.</p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider bg-slate-50/50">
                      <th className="py-3 px-4 font-extrabold">Patient</th>
                      <th className="py-3 px-4 font-extrabold">Date</th>
                      <th className="py-3 px-4 font-extrabold">Time</th>
                      <th className="py-3 px-4 font-extrabold">Status</th>
                      <th className="py-3 px-4 font-extrabold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {dashboardData.today_appointments.map(appt => (
                      <tr 
                        key={appt.appointment_id}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => setSelectedAppointment(appt)}
                      >
                        {/* Patient */}
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                              {appt.patient_name?.[0] || 'P'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {appt.patient_name}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">{appt.patient_phone || ''}</span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                          {appt.appointment_date}
                        </td>

                        {/* Time */}
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700 whitespace-nowrap">
                          {appt.formatted_time || appt.appointment_time?.slice(0, 5) || '10:00 AM'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(appt.status)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPatientForConsultation(appt.patient_id);
                            }}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer shadow-sm"
                          >
                            <span>Consult</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Quick Shortcuts to other modules */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div 
              onClick={() => setActiveTab(DOCTOR_TABS.AVAILABILITY)}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-indigo-300 transition cursor-pointer space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-900 text-base">Manage Availability</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Add, edit, or delete consultation windows for patient booking slots.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 pt-2 group-hover:translate-x-1 transition-transform">
                <span>Set hours</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div 
              onClick={() => setActiveTab(DOCTOR_TABS.SCHEDULE)}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-indigo-300 transition cursor-pointer space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <CalendarRange className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-900 text-base">Full Schedule</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Review past and upcoming consultation queues with complete patient histories.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 pt-2 group-hover:translate-x-1 transition-transform">
                <span>View timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>

            <div 
              onClick={() => setActiveTab(DOCTOR_TABS.PATIENTS)}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-indigo-300 transition cursor-pointer space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="font-black text-slate-900 text-base">Patient Directory</h4>
              <p className="text-slate-500 text-xs leading-relaxed">
                Search patients assigned to your consultations and review medical records.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 pt-2 group-hover:translate-x-1 transition-transform">
                <span>View patients</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB B: MANAGE AVAILABILITY --- */}
      {activeTab === DOCTOR_TABS.AVAILABILITY && (
        <ManageAvailability doctorId={userId} />
      )}

      {/* --- TAB C: DOCTOR SCHEDULE --- */}
      {activeTab === DOCTOR_TABS.SCHEDULE && (
        <DoctorSchedule 
          doctorId={userId} 
          onStartConsultation={handleSelectPatientForConsultation} 
        />
      )}

      {/* --- TAB D: PATIENT DETAILS --- */}
      {activeTab === DOCTOR_TABS.PATIENTS && (
        <DoctorPatients 
          doctorId={userId} 
          onSelectPatient={handleSelectPatientForConsultation} 
        />
      )}

      {/* --- TAB E: CLINICAL CONSULTATION & RX ROOM --- */}
      {activeTab === DOCTOR_TABS.CONSULTATION && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          
          {/* Patient Quick Selector Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Card title="Clinical Queue" icon={Users}>
              {dashboardData?.today_appointments && dashboardData.today_appointments.length > 0 ? (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {dashboardData.today_appointments.map(a => (
                    <div 
                      key={a.appointment_id}
                      onClick={() => handleSelectPatientForConsultation(a.patient_id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        selectedPatient?.patient_id === a.patient_id 
                          ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                          : 'bg-slate-50 hover:bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-slate-800 text-sm">{a.patient_name}</span>
                        {getStatusBadge(a.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>{a.formatted_time || a.appointment_time?.slice(0, 5)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-xs text-slate-400">
                  Switch to the "Patient Details" tab to consult any patient in your registry.
                </p>
              )}
            </Card>
          </div>

          {/* Active Patient Details & Prescription Console */}
          <div className="lg:col-span-8">
            {selectedPatient ? (
              <div className="space-y-6">
                
                {/* Patient Header Card */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/25 shrink-0">
                      {(selectedPatient.name || 'Patient').split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">{selectedPatient.name}</h2>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600 mt-2">
                        <span className="bg-slate-100 px-3 py-1 rounded-xl">{selectedPatient.age || 'N/A'} yrs</span>
                        <span className="bg-slate-100 px-3 py-1 rounded-xl">{selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</span>
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl font-mono">{selectedPatient.phone}</span>
                        {selectedPatient.email && <span className="bg-slate-100 px-3 py-1 rounded-xl">{selectedPatient.email}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center px-5 py-3 rounded-2xl border ${
                      (selectedPatient.compliance_score || 100) >= 80 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : (selectedPatient.compliance_score || 100) >= 50
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      <span className="text-3xl font-black leading-none">{selectedPatient.compliance_score || 100}%</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-80">Compliance</span>
                    </div>
                  </div>
                </div>

                {/* AI Triage Translation if present */}
                {selectedPatient.symptoms_medical && (
                  <div className="bg-gradient-to-r from-indigo-50 via-white to-violet-50 border border-indigo-100 p-6 rounded-3xl shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3">
                      <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                          <BrainCircuit className="w-4 h-4"/>
                        </div>
                        AI Triage Clinical Pre-Assessment
                      </h4>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full uppercase">Verified</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Patient Complaint</span>
                        <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedPatient.symptoms_raw}"</p>
                      </div>
                      <div className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-100">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Clinical Translation</span>
                        <p className="text-sm font-bold text-indigo-950 leading-relaxed">{selectedPatient.symptoms_medical}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Compliance Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => handleComplianceUpdate(-10)} className="py-3 px-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-bold hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                    <ThumbsDown className="w-4 h-4" /> Deduct Compliance (-10)
                  </button>
                  <button onClick={() => handleComplianceUpdate(10)} className="py-3 px-4 bg-white border border-emerald-200 text-emerald-600 rounded-2xl font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                    <ThumbsUp className="w-4 h-4" /> Reward Compliance (+10)
                  </button>
                </div>

                {/* Add Record & Issue Rx Form */}
                <AddRecordForm 
                  patient={selectedPatient}
                  doctorId={userId}
                  appointmentId={
                    dashboardData?.today_appointments?.find(a => a.patient_id === selectedPatient.patient_id)?.appointment_id
                  }
                  onRecordAdded={() => handleSelectPatientForConsultation(selectedPatient.patient_id)}
                  refreshTrigger={inventoryUpdateTrigger}
                />

                {/* Patient History */}
                <Card title="Historical Medical Records" icon={FileText}>
                  {isLoadingHistory ? (
                    <div className="space-y-3 animate-pulse">
                      {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl"></div>)}
                    </div>
                  ) : patientHistory.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm">
                      No previous consultation records found for this patient.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {patientHistory.map(rec => (
                        <div key={rec.record_id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h4 className="font-black text-slate-900 text-base">{rec.diagnosis}</h4>
                            <span className="text-xs font-bold text-slate-400">{rec.visit_date?.split('T')[0]}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                              <span className="font-bold text-amber-800 block mb-1">Clinical Notes:</span>
                              <div dangerouslySetInnerHTML={{ __html: rec.notes || 'None recorded' }} />
                            </div>
                            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                              <span className="font-bold text-emerald-800 block mb-1">Treatment Plan:</span>
                              <div dangerouslySetInnerHTML={{ __html: rec.treatment_plan || 'None recorded' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 bg-gradient-to-b from-slate-50 to-indigo-50/20 rounded-3xl border-2 border-dashed border-slate-200 min-h-[450px] p-8 text-center">
                <div className="p-6 bg-white rounded-3xl shadow-sm border border-slate-100 mb-4">
                  <Users className="w-12 h-12 text-indigo-400" />
                </div>
                <p className="text-xl font-black text-slate-800">Select a Patient to Consult</p>
                <p className="text-slate-400 text-xs mt-1 max-w-sm">
                  Choose a patient from the queue on the left or the Patient Details tab to begin clinical examination, issue e-prescriptions, and document treatment plans.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

        </main>
      </div>

      {/* ========================================================= */}
      {/* 4. APPOINTMENT DETAILS MODAL                              */}
      {/* ========================================================= */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusUpdated={(appId, newStatus) => {
            fetchDashboard();
          }}
          onStartConsultation={(pId) => {
            handleSelectPatientForConsultation(pId);
          }}
        />
      )}

    </div>
  );
};

export default DoctorDashboard;