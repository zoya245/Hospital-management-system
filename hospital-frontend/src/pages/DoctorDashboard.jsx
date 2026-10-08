import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import AddRecordForm from '../components/AddRecordForm';
import ManageAvailability from '../components/ManageAvailability';
import DoctorSchedule from './DoctorSchedule';
import DoctorPatients from './DoctorPatients';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import { 
  Calendar, Clock, User, Activity, ThumbsUp, ThumbsDown, 
  Search, Users, Award, ArrowRight, FileText, Pill, BrainCircuit,
  LayoutDashboard, CalendarRange, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, Stethoscope, ShieldCheck, Sparkles, Phone, Mail, ChevronRight,
  Zap, Radio, Database, HeartPulse
} from 'lucide-react';
import { getPatientName, getDepartmentName } from '../mockData';
import { api } from '../services/api';
import { io } from "socket.io-client";
import { BACKEND_URL } from '../config';

const DOCTOR_TABS = {
  CONSULTATION: 'consultation',
  DASHBOARD: 'dashboard',
  SCHEDULE: 'schedule',
  PATIENTS: 'patients',
  AVAILABILITY: 'availability'
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
  const [inventoryUpdateTrigger, setInventoryUpdateTrigger] = useState(0);

  // Search & Filter for Today's Appointments table
  const [todaySearch, setTodaySearch] = useState('');
  const [todayStatusFilter, setTodayStatusFilter] = useState('ALL');

  // Consultation queue search
  const [queueSearch, setQueueSearch] = useState('');

  // Fallback Doctor object if API hasn't loaded yet
  const doctorFromProps = data?.doctors?.find(d => String(d.doctor_id) === String(userId));
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
      setPatientHistory(history || []);
    } catch (err) {
      console.error(err);
      setPatientHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleComplianceUpdate = async (change) => {
    if (!selectedPatient) return;
    const currentScore = selectedPatient.compliance_score ?? 100;
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
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Confirmed
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Scheduled
          </span>
        );
    }
  };

  const summary = dashboardData?.summary || {
    today_appointments: 0,
    upcoming_appointments: 0,
    completed_appointments: 0,
    cancelled_appointments: 0
  };

  // Filter today's appointments table
  const filteredTodayAppointments = useMemo(() => {
    const list = dashboardData?.today_appointments || [];
    return list.filter(appt => {
      const matchSearch = !todaySearch.trim() || 
        (appt.patient_name && appt.patient_name.toLowerCase().includes(todaySearch.toLowerCase())) ||
        (appt.patient_phone && appt.patient_phone.includes(todaySearch));
      const matchStatus = todayStatusFilter === 'ALL' || appt.status === todayStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [dashboardData?.today_appointments, todaySearch, todayStatusFilter]);

  // Filter consultation queue
  const filteredQueue = useMemo(() => {
    const list = dashboardData?.today_appointments || [];
    if (!queueSearch.trim()) return list;
    const term = queueSearch.toLowerCase();
    return list.filter(a => 
      (a.patient_name && a.patient_name.toLowerCase().includes(term)) ||
      (a.patient_phone && a.patient_phone.includes(term))
    );
  }, [dashboardData?.today_appointments, queueSearch]);

  const navItems = [
    { 
      id: DOCTOR_TABS.CONSULTATION, 
      label: 'Clinical Consult & Rx', 
      subtitle: 'Examination, Rx & Notes',
      icon: Activity, 
      badge: 'LIVE RX',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
    },
    { 
      id: DOCTOR_TABS.DASHBOARD, 
      label: 'Dashboard Overview', 
      subtitle: 'Analytics & Today Queue',
      icon: LayoutDashboard, 
      badge: summary.today_appointments > 0 ? `${summary.today_appointments} Today` : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30'
    },
    { 
      id: DOCTOR_TABS.SCHEDULE, 
      label: 'Doctor Schedule', 
      subtitle: 'Timeline & Bookings',
      icon: CalendarRange, 
      badge: summary.upcoming_appointments > 0 ? `${summary.upcoming_appointments} Queued` : null,
      badgeColor: 'bg-blue-500/20 text-blue-200 border-blue-400/30'
    },
    { 
      id: DOCTOR_TABS.PATIENTS, 
      label: 'Patient Directory', 
      subtitle: 'Assigned Demographics',
      icon: Users, 
      badge: 'Registry',
      badgeColor: 'bg-violet-500/20 text-violet-200 border-violet-400/30'
    },
    { 
      id: DOCTOR_TABS.AVAILABILITY, 
      label: 'Manage Availability', 
      subtitle: 'Weekly Slots & Hours',
      icon: Clock, 
      badge: 'Slots',
      badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-400/30'
    }
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 xl:gap-8 items-start pb-16 animate-fade-in">
      
      {/* ========================================================= */}
      {/* 1. AESTHETIC LEFT SIDEBAR NAVIGATION (ON THE SIDE)        */}
      {/* ========================================================= */}
      <aside className="w-full lg:w-80 xl:w-[340px] shrink-0 lg:sticky lg:top-24 space-y-6">
        
        {/* Physician Identity Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden group">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/40 transition-all"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            
            {/* Top row: Live OPD badge + Doctor ID */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-400/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>OPD-1 • Online</span>
              </span>
              <span className="font-mono text-xs font-black text-indigo-300 bg-white/10 px-2.5 py-1 rounded-xl border border-white/15">
                #{doctor.doctor_id}
              </span>
            </div>

            {/* Avatar & Doctor Name */}
            <div className="flex items-center gap-4 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-indigo-500/30 border border-white/20 shrink-0">
                {(doctor?.name || 'Doctor').replace('Dr. ', '').split(' ').filter(Boolean).map(n => n[0]).join('') || 'DR'}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white tracking-tight truncate">
                  {doctor.name.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`}
                </h2>
                <p className="text-indigo-200 text-xs font-semibold truncate mt-0.5">
                  {doctor.specialization}
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar in Sidebar */}
            <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Specialty</span>
                <span className="font-black text-indigo-300 flex items-center gap-1.5 mt-0.5">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  Senior Attending
                </span>
              </div>
              <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Today</span>
                <span className="font-black text-emerald-300 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  {summary.today_appointments} Consults
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Aesthetic Navigation List */}
        <div className="aesthetic-sidebar rounded-3xl p-3.5 space-y-1.5 shadow-sm">
          
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Clinical Workspace
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          </div>

          <nav className="space-y-1.5">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full p-3 rounded-2xl text-left transition-all duration-200 flex items-center justify-between cursor-pointer group ${
                    isActive
                      ? 'glow-pill-active text-white shadow-xl scale-[1.02]'
                      : 'text-slate-600 hover:text-indigo-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-all ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-xs block leading-tight">
                        {item.label}
                      </span>
                      <span className={`text-[10px] font-medium leading-none block mt-0.5 ${
                        isActive ? 'text-indigo-100' : 'text-slate-400'
                      }`}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                      isActive 
                        ? 'bg-white/20 text-white border-white/30' 
                        : `${item.badgeColor} bg-slate-100 text-slate-600 border-slate-200`
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Action Refresh in Sidebar */}
          <div className="pt-3 border-t border-slate-100 px-1">
            <button
              onClick={fetchDashboard}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-xs border border-slate-200/80 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDashboard ? 'animate-spin' : ''}`} />
              <span>Sync Cloud Database</span>
            </button>
          </div>

        </div>

      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN CONTENT CANVAS (RIGHT SIDE - FULLY EXPANSIVE)     */}
      {/* ========================================================= */}
      <main className="flex-1 min-w-0 w-full space-y-6">
        
        {/* Top Header Bar for Canvas */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Active Portal
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500">
                {navItems.find(n => n.id === activeTab)?.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {navItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-100 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Session Date</span>
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                {dashboardData?.doctor?.formatted_today || new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>

            <button
              onClick={() => setActiveTab(DOCTOR_TABS.CONSULTATION)}
              className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Consultation Room</span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: CLINICAL CONSULTATION & RX ROOM (SIDE-BY-SIDE)     */}
        {/* ========================================================= */}
        {activeTab === DOCTOR_TABS.CONSULTATION && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8 animate-fade-in w-full">
            
            {/* Left Queue Panel inside Consult View (4 Cols) */}
            <div className="xl:col-span-4 space-y-4">
              <div className="aesthetic-card rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Clinical Queue</span>
                  </h3>
                  <span className="text-xs font-extrabold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                    {filteredQueue.length} Waiting
                  </span>
                </div>

                {/* Search Queue */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search patient in queue..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Queue Cards */}
                {filteredQueue.length > 0 ? (
                  <div className="space-y-2.5 max-h-[640px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredQueue.map(a => {
                      const isSelected = selectedPatient?.patient_id === a.patient_id;
                      return (
                        <div 
                          key={a.appointment_id}
                          onClick={() => handleSelectPatientForConsultation(a.patient_id)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-400 shadow-md ring-2 ring-indigo-500/20 scale-[1.01]' 
                              : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {a.patient_name?.[0] || 'P'}
                              </div>
                              <div>
                                <span className="font-black text-slate-900 text-xs block leading-tight">{a.patient_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{a.patient_phone || 'No phone'}</span>
                              </div>
                            </div>
                            {getStatusBadge(a.status)}
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2 border-t border-slate-100 mt-2">
                            <span className="flex items-center gap-1 text-indigo-700 font-bold font-mono text-[11px]">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              {a.formatted_time || a.appointment_time?.slice(0, 5) || '10:00 AM'}
                            </span>
                            <span className="text-indigo-600 font-bold flex items-center gap-0.5 text-[11px]">
                              <span>Examine</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No patients queued</p>
                    <p className="text-[11px] text-slate-400 mt-1">Select from the Patient Directory to review any patient record.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Clinical Workstation (8 Cols) */}
            <div className="xl:col-span-8">
              {selectedPatient ? (
                <div className="space-y-6">
                  
                  {/* Patient Executive Header Card */}
                  <div className="aesthetic-card rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/25 shrink-0">
                        {(selectedPatient.name || 'Patient').split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedPatient.name}</h2>
                          <span className="bg-indigo-50 text-indigo-700 font-mono text-xs px-2.5 py-0.5 rounded-lg border border-indigo-100 font-bold">
                            #{selectedPatient.patient_id}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600 mt-2">
                          <span className="bg-slate-100 px-3 py-1 rounded-xl">{selectedPatient.age || 'N/A'} yrs</span>
                          <span className="bg-slate-100 px-3 py-1 rounded-xl">{selectedPatient.gender === 'M' ? 'Male' : selectedPatient.gender === 'F' ? 'Female' : 'Other'}</span>
                          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl font-mono">{selectedPatient.phone || 'No phone'}</span>
                          {selectedPatient.email && <span className="bg-slate-100 px-3 py-1 rounded-xl">{selectedPatient.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`flex flex-col items-center px-5 py-3 rounded-2xl border ${
                        (selectedPatient.compliance_score ?? 100) >= 80 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : (selectedPatient.compliance_score ?? 100) >= 50
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        <span className="text-2xl font-black leading-none">{selectedPatient.compliance_score ?? 100}%</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-80">Adherence</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Triage Pre-Assessment */}
                  {selectedPatient.symptoms_medical && (
                    <div className="bg-gradient-to-r from-indigo-50 via-white to-violet-50 border border-indigo-100 p-6 rounded-3xl shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-indigo-100/60 pb-3">
                        <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                            <BrainCircuit className="w-4 h-4"/>
                          </div>
                          AI Triage Clinical Pre-Assessment
                        </h4>
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-wider">
                          Validated Engine
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Patient Complaint</span>
                          <p className="text-sm text-slate-700 italic leading-relaxed">"{selectedPatient.symptoms_raw}"</p>
                        </div>
                        <div className="bg-indigo-600/5 p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">Clinical Translation</span>
                          <p className="text-sm font-bold text-indigo-950 leading-relaxed">{selectedPatient.symptoms_medical}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Compliance Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => handleComplianceUpdate(-10)} 
                      className="py-3 px-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-black text-xs hover:bg-rose-50 hover:border-rose-300 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <ThumbsDown className="w-4 h-4" /> 
                      <span>Deduct Adherence (-10)</span>
                    </button>
                    <button 
                      onClick={() => handleComplianceUpdate(10)} 
                      className="py-3 px-4 bg-white border border-emerald-200 text-emerald-600 rounded-2xl font-black text-xs hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center justify-center gap-2 shadow-2xs cursor-pointer active:scale-95"
                    >
                      <ThumbsUp className="w-4 h-4" /> 
                      <span>Reward Adherence (+10)</span>
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
                      <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-sm">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <span>No previous consultation records found for this patient.</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {patientHistory.map(rec => (
                          <div key={rec.record_id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-2xs space-y-3">
                            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                              <h4 className="font-black text-slate-900 text-base">{rec.diagnosis}</h4>
                              <span className="text-xs font-bold text-slate-400">{rec.visit_date?.split('T')[0]}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-100">
                                <span className="font-bold text-amber-800 block mb-1">Clinical Notes:</span>
                                <div dangerouslySetInnerHTML={{ __html: rec.notes || 'None recorded' }} />
                              </div>
                              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
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
                /* Empty state */
                <div className="aesthetic-card rounded-3xl p-8 sm:p-12 text-center space-y-6">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner animate-subtle-float">
                    <Stethoscope className="w-10 h-10" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="text-2xl font-black text-slate-900">Clinical Examination Console</h3>
                    <p className="text-sm text-slate-500">
                      Select a patient from the queue on the left to begin examination, prescribe medicines with live pharmacy inventory checks, and issue official clinical records.
                    </p>
                  </div>

                  {dashboardData?.today_appointments && dashboardData.today_appointments.length > 0 && (
                    <div className="pt-6 border-t border-slate-100 max-w-xl mx-auto">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-4">
                        Today's Queued Patients:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dashboardData.today_appointments.slice(0, 4).map(p => (
                          <button
                            key={p.appointment_id}
                            onClick={() => handleSelectPatientForConsultation(p.patient_id)}
                            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/80 hover:border-indigo-300 text-left transition flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                {p.patient_name?.[0] || 'P'}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 text-xs group-hover:text-indigo-700">{p.patient_name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{p.formatted_time || p.appointment_time?.slice(0, 5)}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: MAIN DASHBOARD OVERVIEW                            */}
        {/* ========================================================= */}
        {activeTab === DOCTOR_TABS.DASHBOARD && (
          <div className="space-y-8 animate-fade-in w-full">
            
            {/* 4 AESTHETIC METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              
              <div className="aesthetic-card p-6 rounded-3xl group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Today's Visits</span>
                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.today_appointments}</span>
                  <span className="text-xs font-bold text-slate-400">Patients</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-indigo-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Live queue active
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="aesthetic-card p-6 rounded-3xl group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Upcoming Queue</span>
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.upcoming_appointments}</span>
                  <span className="text-xs font-bold text-slate-400">Scheduled</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-blue-600">
                  <span>Future timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="aesthetic-card p-6 rounded-3xl group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Completed Consults</span>
                  <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.completed_appointments}</span>
                  <span className="text-xs font-bold text-slate-400">Finished</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-emerald-600">
                  <span>Prescriptions issued</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="aesthetic-card p-6 rounded-3xl group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Cancelled</span>
                  <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 group-hover:scale-110 transition-transform">
                    <XCircle className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">{summary.cancelled_appointments}</span>
                  <span className="text-xs font-bold text-slate-400">Voided</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black text-rose-600">
                  <span>Rescheduled</span>
                  <XCircle className="w-3.5 h-3.5" />
                </div>
              </div>

            </div>

            {/* FULL-WIDTH TODAY'S CONSULTATION QUEUE CARD */}
            <div className="aesthetic-card rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <span>Today's Consultation List</span>
                    <span className="bg-indigo-100 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-black">
                      {filteredTodayAppointments.length} Available
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Click any patient row to open clinical examination & e-prescription console</p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search patient or phone..."
                      value={todaySearch}
                      onChange={(e) => setTodaySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    {['ALL', 'Confirmed', 'Scheduled', 'Completed'].map(status => (
                      <button
                        key={status}
                        onClick={() => setTodayStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                          todayStatusFilter === status ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table / List */}
              <div className="p-0">
                {isLoadingDashboard ? (
                  <div className="p-8 space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>)}
                  </div>
                ) : filteredTodayAppointments.length === 0 ? (
                  <div className="text-center py-16 px-4 bg-slate-50/50">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-base font-bold text-slate-700">No appointments matching criteria for today.</p>
                    <p className="text-xs text-slate-400 mt-1">Check the Doctor Schedule tab to review upcoming appointments across other dates.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 text-[11px] uppercase tracking-wider bg-slate-50/80">
                          <th className="py-3.5 px-6 font-extrabold">Patient Name</th>
                          <th className="py-3.5 px-6 font-extrabold">Scheduled Time</th>
                          <th className="py-3.5 px-6 font-extrabold">Chief Complaint / AI Triage</th>
                          <th className="py-3.5 px-6 font-extrabold">Visit Status</th>
                          <th className="py-3.5 px-6 font-extrabold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredTodayAppointments.map(appt => (
                          <tr 
                            key={appt.appointment_id}
                            className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                            onClick={() => setSelectedAppointment(appt)}
                          >
                            <td className="py-4 px-6 font-bold text-slate-800">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm border border-indigo-100">
                                  {appt.patient_name?.[0] || 'P'}
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {appt.patient_name}
                                  </p>
                                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {appt.patient_phone || 'No phone'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-indigo-900 rounded-xl font-mono font-bold text-xs border border-slate-200/80">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                {appt.formatted_time || appt.appointment_time?.slice(0, 5) || '10:00 AM'}
                              </span>
                            </td>

                            <td className="py-4 px-6">
                              {appt.symptoms_medical ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
                                  <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                                  <span className="truncate max-w-[220px]">{appt.symptoms_medical}</span>
                                </span>
                              ) : appt.symptoms_raw ? (
                                <span className="text-xs text-slate-600 italic truncate max-w-[220px] block">
                                  "{appt.symptoms_raw}"
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Routine Consult</span>
                              )}
                            </td>

                            <td className="py-4 px-6 whitespace-nowrap">
                              {getStatusBadge(appt.status)}
                            </td>

                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectPatientForConsultation(appt.patient_id);
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95"
                                >
                                  <span>Examine & Rx</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAppointment(appt);
                                  }}
                                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 3 QUICK LAUNCHER CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div 
                onClick={() => setActiveTab(DOCTOR_TABS.AVAILABILITY)}
                className="aesthetic-card p-7 rounded-3xl cursor-pointer space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-7 h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-lg">Manage Availability & Slots</h4>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Configure recurring weekly consultation hours, break intervals, and custom calendar dates for patient appointment booking.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 pt-2 group-hover:translate-x-1.5 transition-transform">
                  <span>Configure Slots</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              <div 
                onClick={() => setActiveTab(DOCTOR_TABS.SCHEDULE)}
                className="aesthetic-card p-7 rounded-3xl cursor-pointer space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CalendarRange className="w-7 h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-lg">Doctor Schedule & Timeline</h4>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Review complete patient queues across today, upcoming, completed, and rescheduled sessions with full medical notes.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 pt-2 group-hover:translate-x-1.5 transition-transform">
                  <span>Open Full Schedule</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              <div 
                onClick={() => setActiveTab(DOCTOR_TABS.PATIENTS)}
                className="aesthetic-card p-7 rounded-3xl cursor-pointer space-y-3 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="font-black text-slate-900 text-lg">Assigned Patient Directory</h4>
                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                  Search patients registered with your OPD, inspect treatment compliance scores, contact information, and medical histories.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-black text-violet-600 pt-2 group-hover:translate-x-1.5 transition-transform">
                  <span>Explore Patients</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: DOCTOR SCHEDULE                                    */}
        {/* ========================================================= */}
        {activeTab === DOCTOR_TABS.SCHEDULE && (
          <div className="w-full">
            <DoctorSchedule 
              doctorId={userId} 
              onStartConsultation={handleSelectPatientForConsultation} 
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PATIENT DETAILS DIRECTORY                          */}
        {/* ========================================================= */}
        {activeTab === DOCTOR_TABS.PATIENTS && (
          <div className="w-full">
            <DoctorPatients 
              doctorId={userId} 
              onSelectPatient={handleSelectPatientForConsultation} 
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: MANAGE AVAILABILITY                                */}
        {/* ========================================================= */}
        {activeTab === DOCTOR_TABS.AVAILABILITY && (
          <div className="w-full">
            <ManageAvailability doctorId={userId} />
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* 3. APPOINTMENT DETAILS MODAL                              */}
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