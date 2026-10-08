import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import { 
  Calendar, User, Pill, CheckSquare, Edit, Save, CreditCard, 
  IndianRupee, BarChart3, Plus, X, RefreshCw, Activity, AlertTriangle, 
  Stethoscope, Clock, Search, UserX, Download, Trash2, CalendarRange, 
  UserPlus, CheckCircle2, ShieldCheck, ArrowRight, CheckCircle, FileText
} from 'lucide-react';
import { getPatientName, getDoctorName } from '../mockData';
import { api } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; 
import { io } from "socket.io-client"; 
import { BACKEND_URL, API_BASE_URL } from '../config'; 

const RECEPTION_TABS = {
  OPERATIONS: 'operations',
  SCHEDULE: 'schedule',
  DOCTORS: 'doctors',
  PATIENTS: 'patients',
  BILLING: 'billing',
  PHARMACY: 'pharmacy'
};

const ReceptionistDashboard = ({ data, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(RECEPTION_TABS.OPERATIONS);
  
  // --- DOCTOR MANAGEMENT STATE ---
  const [doctorList, setDoctorList] = useState(data?.doctors || []);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorFormData, setDoctorFormData] = useState({
    name: '',
    specialization: '',
    email: '',
    department_id: 1,
    password: ''
  });

  // --- DAILY SCHEDULE STATE ---
  const [dailyScheduleDoctorId, setDailyScheduleDoctorId] = useState(data?.doctors?.[0]?.doctor_id?.toString() || '1');
  const [dailyScheduleDate, setDailyScheduleDate] = useState(new Date().toISOString().split('T')[0]);

  // --- INVENTORY STATE ---
  const [inventoryList, setInventoryList] = useState([]); 
  const [editingMedicine, setEditingMedicine] = useState({ id: null, stock: 0 });
  const [showAddMed, setShowAddMed] = useState(false);
  const [newMedData, setNewMedData] = useState({ name: '', type: 'Tablet', price: '', stock: '' });
  const [isSyncing, setIsSyncing] = useState(false); 

  // --- BILLING STATE ---
  const [bills, setBills] = useState([]);
  const [newBillData, setNewBillData] = useState({ patient_id: '', amount: '', description: 'Consultation Fee' });
  const [isBillSubmitting, setIsBillSubmitting] = useState(false);
  const [billSearch, setBillSearch] = useState(''); 

  const [analytics, setAnalytics] = useState({ busy_hours: [], top_medicines: [] });

  // Safely access prop data
  const patients = data?.patients || [];
  const appointments = data?.appointments || [];
  const doctors = doctorList.length > 0 ? doctorList : (data?.doctors || []);

  // --- INITIAL FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [billData, statsData, inventoryData] = await Promise.all([
          api.billing.getAll(),
          api.reports.getReceptionStats(),
          api.inventory.getAll()
        ]);
        setBills(billData || []);
        setAnalytics(statsData || { busy_hours: [], top_medicines: [] });
        setInventoryList(inventoryData || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      }
    };
    fetchData();
  }, []);

  // --- REAL-TIME SOCKET LISTENER ---
  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on("inventory_updated", () => {
      handleRefreshInventory(true); 
    });

    socket.on("patients_updated", () => {
      api.patients.getAll().then(freshPatients => {
        if (onUpdate) onUpdate(prev => ({ ...prev, patients: freshPatients }));
      });
    });

    socket.on("appointment_updated", () => {
      api.appointments.getAll().then(allAppts => {
        if (onUpdate) onUpdate(prev => ({ ...prev, appointments: allAppts }));
      });
    });

    socket.on("billing_updated", () => {
      api.billing.getAll().then(billsData => setBills(billsData || []));
    });

    return () => socket.disconnect();
  }, [onUpdate]);

  // --- AUTO-SYNC INVENTORY ---
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (editingMedicine.id === null) {
        handleRefreshInventory(true);
      }
    }, 15000); 
    return () => clearInterval(intervalId);
  }, [editingMedicine.id]); 

  const handleRefreshInventory = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const freshData = await api.inventory.getAll();
      setInventoryList(freshData || []);
    } catch (error) {
      console.error("Inventory sync failed", error);
    } finally {
      if (!silent) setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // --- HANDLERS ---
  const handleUpdateStock = async () => {
    const { id, stock } = editingMedicine;
    try {
      const res = await api.inventory.updateStock(id, parseInt(stock, 10));
      setInventoryList(prev => prev.map(m => m.medicine_id === id ? res.medicine : m));
      setEditingMedicine({ id: null, stock: 0 });
    } catch (e) { 
      console.error(e); 
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    if (!newMedData.name || !newMedData.stock) return;
    try {
      const addedMed = await api.inventory.add(newMedData);
      setInventoryList([...inventoryList, addedMed]); 
      setNewMedData({ name: '', type: 'Tablet', price: '', stock: '' }); 
      setShowAddMed(false); 
    } catch (e) { 
      console.error(e); 
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    if (!newBillData.patient_id || !newBillData.amount) return;
    setIsBillSubmitting(true);
    try {
      const newBill = await api.billing.create(newBillData);
      setBills([newBill, ...bills]); 
      setNewBillData({ patient_id: '', amount: '', description: 'Consultation Fee' });
      setBillSearch('');
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsBillSubmitting(false); 
    }
  };

  const handleUpdateBillStatus = async (billId, newStatus) => {
    setBills(prev => prev.map(b => b.bill_id === billId ? { ...b, status: newStatus } : b));
    try { 
      await api.billing.updateStatus(billId, newStatus);
    } catch (error) { 
      console.error(error); 
    }
  };

  const handleUpdateAppointment = async (id, data) => {
    if (onUpdate) {
      onUpdate(prev => ({
        ...prev, appointments: prev.appointments.map(a => a.appointment_id === id ? {...a, ...data} : a)
      }));
    }
    try {
      await api.appointments.update(id, data);
    } catch (error) { 
      console.error(error); 
    }
  };

  const handleNoShow = async (appointmentId, patientId) => {
    if (!window.confirm("Mark as 'No Show'?\nThis will Cancel the appointment AND deduct 10 Compliance Points.")) return;
    const patient = patients.find(p => p.patient_id === patientId);
    const currentScore = patient?.compliance_score !== undefined ? patient.compliance_score : 100;
    const newScore = Math.max(0, currentScore - 10);

    if (onUpdate) {
      onUpdate(prev => ({
        ...prev,
        appointments: prev.appointments.map(a => a.appointment_id === appointmentId ? { ...a, status: 'Cancelled' } : a),
        patients: prev.patients.map(p => p.patient_id === patientId ? { ...p, compliance_score: newScore } : p)
      }));
    }

    try {
      await Promise.all([
        api.appointments.update(appointmentId, { status: 'Cancelled' }),
        api.patients.updateCompliance(patientId, newScore)
      ]);
    } catch (error) { 
      console.error("Failed to mark No Show", error); 
    }
  };

  // --- PDF GENERATOR ---
  const generatePDF = (bill, patient) => {
    try {
      const doc = new jsPDF();

      doc.setFillColor(79, 70, 229); 
      doc.rect(0, 0, 210, 40, 'F'); 
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Pulse HMS", 14, 20);
      doc.setFontSize(10);
      doc.text("Excellence in Healthcare Management", 14, 28);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Invoice #: ${bill.bill_id}`, 150, 20);
      doc.text(`Date: ${new Date(bill.issued_date || bill.bill_date || Date.now()).toLocaleDateString()}`, 150, 26);

      doc.setFontSize(14);
      doc.text("Patient Details", 14, 55);
      doc.setFontSize(10);
      doc.text(`Name: ${patient?.name || bill.patient_name || 'N/A'}`, 14, 65);
      doc.text(`Phone: ${patient?.phone || bill.phone || 'N/A'}`, 14, 71);
      doc.text(`Status: ${bill.status}`, 14, 77);

      autoTable(doc, {
        startY: 85,
        head: [['Description', 'Amount']],
        body: [
          [bill.description || 'Medical Services', `Rs. ${bill.amount}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] },
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text(`Total Amount: Rs. ${bill.amount}`, 140, finalY);

      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Thank you for choosing Pulse HMS.", 14, 280);

      doc.save(`Invoice_${bill.patient_name || 'Patient'}_${bill.bill_id}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF invoice.");
    }
  };

  // --- FILTERS & SORTING ---
  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const dateA = new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`);
      const dateB = new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}`);
      return dateB - dateA; 
    });
  }, [appointments]);

  const filteredPatients = useMemo(() => {
    return patients.map(p => {
      const pAppts = appointments.filter(a => a.patient_id === p.patient_id);
      const lastAppt = pAppts.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0];
      const pBills = bills.filter(b => b.patient_id === p.patient_id);
      const lastBill = pBills.sort((a, b) => new Date(b.issued_date || b.bill_date) - new Date(a.issued_date || a.bill_date))[0];

      return {
        ...p,
        lastVisit: lastAppt ? `${lastAppt.appointment_date} (${lastAppt.appointment_time?.slice(0,5) || 'Slot'})` : 'No visits',
        billAmount: lastBill ? lastBill.amount : 0,
        billStatus: lastBill ? lastBill.status : 'N/A',
        complianceScore: p.compliance_score !== undefined ? p.compliance_score : 100
      };
    }).filter(p => (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || (p.phone && p.phone.includes(searchTerm)));
  }, [patients, appointments, bills, searchTerm]);

  const billingPatients = patients.filter(p => 
    p.name.toLowerCase().includes(billSearch.toLowerCase()) || 
    p.phone.includes(billSearch)
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.appointment_date === todayStr && a.status !== 'Cancelled');
  const pendingBills = bills.filter(b => b.status === 'Pending');
  const lowStockMedicines = inventoryList.filter(m => m.stock < 50);
  const getMaxCount = (arr, key) => Math.max(...arr.map(i => i[key]), 1);

  // --- DOCTOR MANAGEMENT HANDLERS ---
  const handleOpenDoctorModal = (doc = null) => {
    if (doc) {
      setEditingDoctor(doc);
      setDoctorFormData({
        name: doc.name,
        specialization: doc.specialization,
        email: doc.email || '',
        department_id: doc.department_id || 1,
        password: ''
      });
    } else {
      setEditingDoctor(null);
      setDoctorFormData({
        name: '',
        specialization: '',
        email: '',
        department_id: 1,
        password: 'password123'
      });
    }
    setShowDoctorModal(true);
  };

  const handleSaveDoctor = async (e) => {
    e.preventDefault();
    try {
      if (editingDoctor) {
        const updated = await api.doctors.updateDoctor(editingDoctor.doctor_id, doctorFormData);
        const newList = doctors.map(d => d.doctor_id === editingDoctor.doctor_id ? { ...d, ...updated } : d);
        setDoctorList(newList);
        if (onUpdate) onUpdate(prev => ({ ...prev, doctors: newList }));
      } else {
        const created = await api.doctors.createDoctor(doctorFormData);
        const newList = [...doctors, created];
        setDoctorList(newList);
        if (onUpdate) onUpdate(prev => ({ ...prev, doctors: newList }));
      }
      setShowDoctorModal(false);
      setEditingDoctor(null);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save doctor.');
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to remove this doctor from the registry?")) return;
    try {
      await api.doctors.deleteDoctor(doctorId);
      const newList = doctors.filter(d => d.doctor_id !== doctorId);
      setDoctorList(newList);
      if (onUpdate) onUpdate(prev => ({ ...prev, doctors: newList }));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to delete doctor.');
    }
  };

  const doctorDailyAppointments = useMemo(() => {
    if (!dailyScheduleDoctorId) return [];
    return appointments.filter(a => 
      a.doctor_id.toString() === dailyScheduleDoctorId.toString() &&
      (!dailyScheduleDate || a.appointment_date === dailyScheduleDate)
    ).sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''));
  }, [appointments, dailyScheduleDoctorId, dailyScheduleDate]);

  const staffNavItems = [
    { id: RECEPTION_TABS.OPERATIONS, label: 'Operations & Queue', subtitle: 'Live Patient Stream', icon: Activity, badge: todayAppointments.length > 0 ? `${todayAppointments.length} Today` : null, badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
    { id: RECEPTION_TABS.SCHEDULE, label: 'Doctor Schedule', subtitle: 'Timelines & Rosters', icon: CalendarRange, badge: null },
    { id: RECEPTION_TABS.DOCTORS, label: 'Manage Doctors', subtitle: 'Registry & Onboarding', icon: Stethoscope, badge: `${doctors.length}`, badgeColor: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' },
    { id: RECEPTION_TABS.PATIENTS, label: 'Patient Registry', subtitle: 'Demographics & Records', icon: User, badge: `${patients.length}`, badgeColor: 'bg-violet-500/20 text-violet-200 border-violet-400/30' },
    { id: RECEPTION_TABS.BILLING, label: 'Billing & Invoices', subtitle: 'Payment Processing', icon: CreditCard, badge: pendingBills.length > 0 ? `${pendingBills.length} Pending` : null, badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-400/30' },
    { id: RECEPTION_TABS.PHARMACY, label: 'Pharmacy Stock', subtitle: 'Inventory & Alerts', icon: Pill, badge: lowStockMedicines.length > 0 ? `${lowStockMedicines.length} Low` : null, badgeColor: 'bg-rose-500/20 text-rose-200 border-rose-400/30' }
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 xl:gap-8 items-start pb-16 animate-fade-in">
      
      {/* ========================================================= */}
      {/* 1. AESTHETIC LEFT SIDEBAR (STAFF OPERATIONS CONSOLE)      */}
      {/* ========================================================= */}
      <aside className="w-full lg:w-80 xl:w-[340px] shrink-0 lg:sticky lg:top-24 space-y-6">
        
        {/* Front Desk Command Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden group">
          
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/35 transition-all"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-600/25 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            
            {/* Top row: Live Badge + Desk ID */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-400/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Front Desk</span>
              </span>
              <span className="font-mono text-xs font-black text-indigo-300 bg-white/10 px-2.5 py-1 rounded-xl border border-white/15">
                Desk-01
              </span>
            </div>

            {/* Title & Desk Subtitle */}
            <div className="pt-1">
              <h2 className="text-xl font-black text-white tracking-tight">
                Hospital Command Desk
              </h2>
              <p className="text-slate-300 text-xs font-medium mt-1 leading-relaxed">
                Centralized OPD operations, billing checkout, clinical registries & live stock.
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="pt-2">
              <button
                onClick={() => handleOpenDoctorModal()}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <UserPlus className="w-4 h-4 text-indigo-200" />
                <span>Register New Doctor</span>
              </button>
            </div>

          </div>
        </div>

        {/* Aesthetic Navigation Menu */}
        <div className="aesthetic-sidebar rounded-3xl p-3.5 space-y-1.5 shadow-sm">
          
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Operations Center
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>

          <nav className="space-y-1.5">
            {staffNavItems.map(item => {
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
                        : `${item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'} bg-slate-100 text-slate-600 border-slate-200`
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Refresh */}
          <div className="pt-3 border-t border-slate-100 px-1">
            <button
              onClick={() => handleRefreshInventory(false)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 font-bold text-xs border border-slate-200/80 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Pharmacy Inventory</span>
            </button>
          </div>

        </div>

      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE CANVAS (RIGHT SIDE - FULLY EXPANSIVE)   */}
      {/* ========================================================= */}
      <main className="flex-1 min-w-0 w-full space-y-6">
        
        {/* Top Header Bar for Receptionist Canvas */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Staff Console
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500">
                {staffNavItems.find(n => n.id === activeTab)?.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {staffNavItems.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-100 text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">System Status</span>
              <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Real-Time Sync Active
              </span>
            </div>

            <button
              onClick={() => handleOpenDoctorModal()}
              className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Doctor</span>
            </button>
          </div>
        </div>

        {/* 4 STATS CARDS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div 
            onClick={() => setActiveTab(RECEPTION_TABS.OPERATIONS)}
            className="aesthetic-card p-5 sm:p-6 rounded-3xl flex items-center gap-4 cursor-pointer group"
          >
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{todayAppointments.length}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Visits</p>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab(RECEPTION_TABS.BILLING)}
            className="aesthetic-card p-5 sm:p-6 rounded-3xl flex items-center gap-4 cursor-pointer group"
          >
            <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{pendingBills.length}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Bills</p>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab(RECEPTION_TABS.PHARMACY)}
            className="aesthetic-card p-5 sm:p-6 rounded-3xl flex items-center gap-4 cursor-pointer group"
          >
            <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{lowStockMedicines.length}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Low Stock</p>
            </div>
          </div>

          <div 
            onClick={() => setActiveTab(RECEPTION_TABS.DOCTORS)}
            className="aesthetic-card p-5 sm:p-6 rounded-3xl flex items-center gap-4 cursor-pointer group"
          >
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-800">{doctors.length}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Doctors</p>
            </div>
          </div>
        </div>

      {/* ========================================================= */}
      {/* 4. TAB 1: OPERATIONS & TODAY'S APPOINTMENT QUEUE          */}
      {/* ========================================================= */}
      {activeTab === RECEPTION_TABS.OPERATIONS && (
        <div className="space-y-6">
          <Card title="Appointment Queue & Live Operations" icon={Calendar} className="border-0 shadow-lg">
            <div className="overflow-x-auto max-h-[550px] custom-scrollbar">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Attending Doctor</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status / Quick Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-50">
                  {sortedAppointments.map(a => (
                    <tr key={a.appointment_id} className={`hover:bg-slate-50 transition-colors ${a.is_emergency ? 'bg-rose-50/50' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400"/>
                          <span className="font-bold text-slate-700 text-xs sm:text-sm">{a.appointment_date}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3 text-indigo-500"/>
                          <span className="font-mono">{a.appointment_time ? a.appointment_time.slice(0,5) : 'General Slot'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-800">
                        {getPatientName(a.patient_id, data.patients)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {getDoctorName(a.doctor_id)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {(a.status === 'Scheduled' || a.status === 'Confirmed') ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => handleUpdateAppointment(a.appointment_id, { status: 'Completed' })}
                              className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-emerald-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                            >
                              <CheckSquare className="w-3.5 h-3.5" /> Check-in & Complete
                            </button>
                            <button
                              onClick={() => handleUpdateAppointment(a.appointment_id, { status: 'Cancelled' })}
                              className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-rose-100 active:scale-95 transition-all shadow-sm cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                            <button
                              onClick={() => handleNoShow(a.appointment_id, a.patient_id)}
                              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-slate-200 active:scale-95 transition-all shadow-sm cursor-pointer"
                              title="Mark No Show (-10 pts)"
                            >
                              <UserX className="w-3.5 h-3.5" /> No Show
                            </button>
                          </div>
                        ) : (
                          <select 
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer focus:ring-2 focus:ring-indigo-500 shadow-sm ${
                              a.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                              a.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                            value={a.status}
                            onChange={(e) => handleUpdateAppointment(a.appointment_id, { status: e.target.value })}
                          >
                            <option value="Scheduled">Scheduled</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Peak Hours Analytics */}
          <Card title="Clinic Rush Hours Analysis" icon={BarChart3} className="border-0 shadow-lg">
            {analytics.busy_hours.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-sm">No rush hour data available.</p>
            ) : (
              <div className="space-y-4 mt-2">
                {analytics.busy_hours.map((hour) => (
                  <div key={hour.hour_slot} className="group relative flex items-center gap-3 text-sm">
                    <span className="w-16 font-black text-xs text-slate-500">{hour.hour_slot}:00</span>
                    <div className="flex-grow bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 h-full rounded-full shadow-sm transition-all duration-700" 
                        style={{ width: `${(hour.count / getMaxCount(analytics.busy_hours, 'count')) * 100}%` }}
                      ></div>
                    </div>
                    <span className="w-10 text-right font-black text-xs text-indigo-700 font-mono">{hour.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAB 2: DAILY DOCTOR SCHEDULE                           */}
      {/* ========================================================= */}
      {activeTab === RECEPTION_TABS.SCHEDULE && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900">Doctor-wise Daily Schedule</h3>
              <p className="text-slate-500 text-xs mt-0.5">Filter appointments by specific doctor and date to view their complete daily schedule.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <select
                value={dailyScheduleDoctorId}
                onChange={(e) => setDailyScheduleDoctorId(e.target.value)}
                className="p-3 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {doctors.map(d => (
                  <option key={d.doctor_id} value={d.doctor_id}>
                    {d.name} ({d.specialization})
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={dailyScheduleDate}
                onChange={(e) => setDailyScheduleDate(e.target.value)}
                className="p-3 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <Card title={`Doctor Schedule for ${dailyScheduleDate} (${doctorDailyAppointments.length} Appointments)`} icon={Calendar}>
            {doctorDailyAppointments.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No appointments scheduled for this doctor on {dailyScheduleDate}.</p>
                <p className="text-xs text-slate-400 mt-1">Try selecting a different date or another clinician.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {doctorDailyAppointments.map(appt => (
                  <div key={appt.appointment_id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-mono font-bold text-xs">
                        {appt.appointment_time?.slice(0, 5) || '10:00'}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm text-slate-900">{getPatientName(appt.patient_id, data.patients)}</p>
                        <p className="text-xs text-slate-400">Date: {appt.appointment_date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {appt.is_emergency ? (
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Emergency</span>
                      ) : null}
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                        appt.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        appt.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                        appt.status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. TAB 3: MANAGE DOCTORS                                  */}
      {/* ========================================================= */}
      {activeTab === RECEPTION_TABS.DOCTORS && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="text-xl font-black text-slate-900">Hospital Medical Staff & Doctors</h3>
              <p className="text-slate-500 text-xs mt-0.5">Add new physicians, update specializations, and manage credentials.</p>
            </div>
            <button
              onClick={() => handleOpenDoctorModal()}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Doctor</span>
            </button>
          </div>

          <Card title={`Active Doctors Registry (${doctors.length})`} icon={Stethoscope}>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4 font-black">Doctor</th>
                    <th className="py-3 px-4 font-black">Specialization</th>
                    <th className="py-3 px-4 font-black">Login Email</th>
                    <th className="py-3 px-4 font-black">Department</th>
                    <th className="py-3 px-4 font-black text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map(doc => (
                    <tr key={doc.doctor_id} className="hover:bg-slate-50 transition">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                            {doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-extrabold text-sm">{doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}</p>
                            <span className="text-[10px] text-slate-400 font-mono">Doctor ID: #{doc.doctor_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg border border-indigo-100">
                          {doc.specialization}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-700 font-mono font-medium">
                        {doc.email || 'doctor@pulse.com'}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-500">
                        {doc.department_name || `Department #${doc.department_id || 1}`}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDoctorModal(doc)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                            title="Edit Doctor"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoctor(doc.doctor_id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Remove Doctor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. TAB 4: PATIENT REGISTRY                                */}
      {/* ========================================================= */}
      {activeTab === RECEPTION_TABS.PATIENTS && (
        <div className="space-y-6">
          <Card title="Registered Patients Registry" icon={User} className="border-0 shadow-xl overflow-hidden">
            <div className="mb-6 relative">
              <input 
                type="text" 
                placeholder="Search patient directory by name or phone..." 
                className="w-full p-3.5 pl-11 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition shadow-sm bg-slate-50/50 focus:bg-white text-sm" 
                value={searchTerm} 
                onChange={(e)=>setSearchTerm(e.target.value)} 
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-4" />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="min-w-full text-sm divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-xs tracking-wider">Patient Name</th>
                    <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-xs tracking-wider">Last Visit</th>
                    <th className="px-6 py-4 text-left font-black text-slate-400 uppercase text-xs tracking-wider">Latest Bill</th>
                    <th className="px-6 py-4 text-center font-black text-slate-400 uppercase text-xs tracking-wider">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {filteredPatients.map(p=>(
                    <tr key={p.patient_id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                            {p.name.split(' ').map(n=>n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-base">{p.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{p.phone} • {p.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        <span className="bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg text-xs font-semibold text-slate-600">
                          {p.lastVisit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {p.billStatus === 'N/A' ? <span className="text-slate-300 font-semibold">-</span> : (
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800">₹{p.billAmount}</span>
                            <span className={`text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full w-fit mt-1 border ${
                              p.billStatus === 'Paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                              p.billStatus === 'Cancelled' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>{p.billStatus}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-black text-xs shadow-sm border ${
                          p.complianceScore >= 80 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                          p.complianceScore >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700' : 
                          'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {p.complianceScore}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* 8. TAB 5: BILLING & INVOICES                              */}
      {/* ========================================================= */}
      {activeTab === RECEPTION_TABS.BILLING && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card title="Generate New Bill" icon={CreditCard} className="border-0 shadow-lg">
              <form onSubmit={handleCreateBill} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Select Patient</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400 pointer-events-none" />
                    <input 
                      type="text" 
                      placeholder="Search Patient Name..." 
                      className="w-full p-3 pl-10 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm"
                      value={billSearch}
                      onChange={(e) => setBillSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                    value={newBillData.patient_id} 
                    onChange={(e)=>setNewBillData({...newBillData, patient_id: e.target.value})} 
                    required
                  >
                    <option value="">
                      {billSearch ? `Filtered Patients (${billingPatients.length})` : '-- Select Patient --'}
                    </option>
                    {billingPatients.map(p=>(
                      <option key={p.patient_id} value={p.patient_id}>{p.name} ({p.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Service Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Cardiology Consultation Fee" 
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition mt-1" 
                    value={newBillData.description} 
                    onChange={(e)=>setNewBillData({...newBillData, description: e.target.value})} 
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Amount (INR)</label>
                  <div className="relative mt-1">
                    <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="number" 
                      placeholder="Amount" 
                      className="w-full p-3 pl-9 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition" 
                      value={newBillData.amount} 
                      onChange={(e)=>setNewBillData({...newBillData, amount: e.target.value})} 
                      required 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isBillSubmitting} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {isBillSubmitting ? 'Creating Invoice...' : 'Generate Invoice'}
                </button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card title="Billing Ledger & Invoices" icon={CreditCard} className="border-0 shadow-lg">
              <div className="overflow-x-auto max-h-[550px] custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-100 text-xs sm:text-sm">
                  <thead className="bg-slate-50 uppercase text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice #</th>
                      <th className="px-4 py-3 text-left">Patient</th>
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bills.map(b => (
                      <tr key={b.bill_id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-700">#{b.bill_id}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800">{b.patient_name || getPatientName(b.patient_id, patients) || `Patient #${b.patient_id}`}</td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-[150px] truncate">{b.description}</td>
                        <td className="px-4 py-3.5 font-black text-indigo-700">₹{b.amount}</td>
                        <td className="px-4 py-3.5">
                          <select 
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg border-0 cursor-pointer focus:ring-1 focus:ring-indigo-500 ${
                              b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 
                              b.status === 'Cancelled' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                            }`}
                            value={b.status}
                            onChange={(e) => handleUpdateBillStatus(b.bill_id, e.target.value)}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button 
                            onClick={() => generatePDF(b, patients.find(p => parseInt(p.patient_id) === parseInt(b.patient_id)))}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9. TAB 6: PHARMACY INVENTORY                              */}
      {/* ========================================================= */}
      {activeTab === RECEPTION_TABS.PHARMACY && (
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Hospital Pharmacy & Medicine Stock</h3>
              <p className="text-slate-500 text-xs mt-0.5">Real-time inventory ledger synced with doctor prescriptions and dispensing.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleRefreshInventory(false)} 
                className={`p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 transition shadow-sm ${isSyncing ? 'animate-spin' : ''}`} 
                title="Sync Live Stock"
              >
                <RefreshCw className="w-4 h-4"/>
              </button>
              <button 
                onClick={() => setShowAddMed(!showAddMed)} 
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20 text-xs font-bold flex items-center gap-1.5 cursor-pointer" 
                title="Add New Medicine"
              >
                {showAddMed ? <X className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                <span>{showAddMed ? 'Close' : 'Add Medicine'}</span>
              </button>
            </div>
          </div>

          {showAddMed && (
            <form onSubmit={handleAddMedicine} className="bg-gradient-to-br from-indigo-50/70 to-violet-50/70 p-6 rounded-3xl border border-indigo-100 space-y-4 animate-slide-in">
              <p className="text-xs font-black uppercase text-indigo-700 tracking-wider">New Medicine Registration</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input 
                  type="text" 
                  placeholder="Medicine Name (e.g. Paracetamol 500mg)" 
                  className="sm:col-span-2 p-3 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  value={newMedData.name} 
                  onChange={(e)=>setNewMedData({...newMedData, name: e.target.value})} 
                  required 
                />
                <select 
                  className="p-3 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newMedData.type}
                  onChange={(e) => setNewMedData({...newMedData, type: e.target.value})}
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment</option>
                </select>
              </div>
              <div className="flex gap-3">
                <input 
                  type="number" 
                  placeholder="Initial Units (Stock)" 
                  className="w-1/2 p-3 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  value={newMedData.stock} 
                  onChange={(e)=>setNewMedData({...newMedData, stock: e.target.value})} 
                  required 
                />
                <input 
                  type="number" 
                  placeholder="Unit Price (₹)" 
                  className="w-1/2 p-3 bg-white border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  value={newMedData.price} 
                  onChange={(e)=>setNewMedData({...newMedData, price: e.target.value})} 
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer">
                Save Medicine to Pharmacy Ledger
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryList.map(m => (
              <div 
                key={m.medicine_id} 
                className={`p-5 rounded-3xl border transition-all ${
                  m.stock < 50 
                    ? 'bg-rose-50/70 border-rose-200 shadow-sm' 
                    : 'bg-white border-slate-100 hover:border-indigo-100 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className={`font-black text-base ${m.stock < 50 ? 'text-rose-800' : 'text-slate-900'}`}>{m.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.type}</span>
                  </div>
                  {m.stock < 50 && (
                    <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Low Stock
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  {editingMedicine.id === m.medicine_id ? (
                    <div className="flex items-center gap-2 w-full">
                      <input 
                        type="number" 
                        className="w-24 p-2 border border-indigo-300 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" 
                        value={editingMedicine.stock} 
                        onChange={(e)=>setEditingMedicine({...editingMedicine, stock: e.target.value})} 
                      />
                      <button onClick={handleUpdateStock} className="p-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 shadow-sm cursor-pointer">
                        <Save className="w-4 h-4"/>
                      </button>
                      <button onClick={() => setEditingMedicine({ id: null, stock: 0 })} className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={`font-mono text-base font-black px-3 py-1 rounded-xl ${
                        m.stock < 50 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {m.stock} units
                      </span>
                      <button 
                        onClick={()=>setEditingMedicine({id:m.medicine_id, stock:m.stock})} 
                        className="text-slate-400 hover:text-indigo-600 transition p-2 hover:bg-indigo-50 rounded-xl cursor-pointer" 
                        title="Update Stock Count"
                      >
                        <Edit className="w-4 h-4"/>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      </main>

      {/* ========================================================= */}
      {/* 10. DOCTOR ADD/EDIT MODAL                                  */}
      {/* ========================================================= */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">
                {editingDoctor ? 'Edit Doctor Details' : 'Register New Doctor'}
              </h3>
              <button onClick={() => setShowDoctorModal(false)} className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-500 uppercase font-bold block mb-1">Doctor Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Priya Sharma"
                  value={doctorFormData.name}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, name: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-500 uppercase font-bold block mb-1">Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Cardiologist, Neurologist"
                  value={doctorFormData.specialization}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, specialization: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-slate-500 uppercase font-bold block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. dr.priya@pulse.com"
                  value={doctorFormData.email}
                  onChange={(e) => setDoctorFormData({ ...doctorFormData, email: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium"
                  required
                />
              </div>

              {!editingDoctor && (
                <div>
                  <label className="text-slate-500 uppercase font-bold block mb-1">Initial Password</label>
                  <input
                    type="password"
                    placeholder="Enter login password"
                    value={doctorFormData.password}
                    onChange={(e) => setDoctorFormData({ ...doctorFormData, password: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium"
                    required
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md cursor-pointer"
                >
                  {editingDoctor ? 'Update Doctor' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ReceptionistDashboard;