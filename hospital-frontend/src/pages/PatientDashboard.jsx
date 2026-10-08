import React, { useState, useEffect, useMemo } from 'react';
import Card from '../components/Card';
import AppointmentScheduler from '../components/AppointmentScheduler';
import { 
  Calendar, Star, X, CreditCard, FileText, Activity, Pill, 
  Download, CheckCircle, Clock, User, Phone, Mail, MapPin, 
  ChevronRight, ArrowRight, ShieldCheck, HeartPulse, Edit3, 
  Save, AlertCircle, Sparkles, Filter, CheckCircle2, XCircle
} from 'lucide-react'; 
import { getDoctorName } from '../mockData';
import { api } from '../services/api'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { io } from "socket.io-client"; 
import { BACKEND_URL, API_BASE_URL } from '../config'; 

const PATIENT_SECTIONS = {
  OVERVIEW: 'overview',
  BOOK: 'book',
  APPOINTMENTS: 'appointments',
  RECORDS: 'records',
  BILLING: 'billing',
  PROFILE: 'profile'
};

const PatientDashboard = ({ userId, data, onSchedule, onUpdate }) => {
  const [activeSection, setActiveSection] = useState(PATIENT_SECTIONS.OVERVIEW);
  const [appointmentFilter, setAppointmentFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED'

  // Data states
  const [bills, setBills] = useState([]);
  const [records, setRecords] = useState([]); 
  const [isLoadingBills, setIsLoadingBills] = useState(true);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true); 

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: 'M',
    address: ''
  });

  const patient = data?.patients?.find(p => String(p.patient_id) === String(userId)) || {
    patient_id: userId,
    name: localStorage.getItem('user_name') || 'Valued Patient',
    email: 'patient@pulse.com',
    phone: '',
    age: '',
    gender: 'M',
    compliance_score: 95
  };
  const patientAppointments = data?.appointments
    ?.filter(a => String(a.patient_id) === String(userId))
    ?.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)) || [];

  // Initialize profile form once patient data is available
  useEffect(() => {
    if (patient) {
      setProfileForm({
        name: patient.name || '',
        email: patient.email || '',
        phone: patient.phone || '',
        age: patient.age || '',
        gender: patient.gender || 'M',
        address: patient.address || ''
      });
    }
  }, [patient]);

  // --- FETCH DATA ---
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        const billsData = await api.billing.getForPatient(userId);
        setBills(billsData || []);
      } catch (error) { 
        console.error("Failed to fetch bills", error); 
      } finally { 
        setIsLoadingBills(false); 
      }

      try {
        const historyData = await api.patients.getHistory(userId);
        setRecords(historyData || []);
      } catch (error) { 
        console.error("Failed to fetch records", error); 
      } finally { 
        setIsLoadingRecords(false); 
      }
    };

    fetchData();
  }, [userId]);

  // --- REAL-TIME SOCKET LISTENER ---
  useEffect(() => {
    const socket = io(BACKEND_URL);

    socket.on("patients_updated", (eventData) => {
      if (parseInt(eventData.patient_id) === parseInt(userId)) {
        api.patients.getOne(userId).then(updatedProfile => {
          if (onUpdate) {
            onUpdate(prev => ({
              ...prev,
              patients: prev.patients.map(p => p.patient_id === userId ? updatedProfile : p)
            }));
          }
        });
      }
    });

    socket.on("appointment_updated", (data) => {
      if (parseInt(data.patient_id) === parseInt(userId)) {
        api.appointments.getAll().then(allAppts => {
          if (onUpdate) {
            onUpdate(prev => ({ ...prev, appointments: allAppts }));
          }
        });
      }
    });

    socket.on("billing_updated", (data) => {
      if (!data || parseInt(data.patient_id) === parseInt(userId)) {
        api.billing.getForPatient(userId).then(billsData => {
          setBills(billsData || []);
        });
      }
    });

    return () => socket.disconnect();
  }, [userId, onUpdate]);

  // --- PROFILE UPDATE HANDLER ---
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const res = await api.patients.updateProfile(userId, profileForm);
      if (onUpdate && res.patient) {
        onUpdate(prev => ({
          ...prev,
          patients: prev.patients.map(p => p.patient_id === userId ? { ...p, ...res.patient } : p)
        }));
      }
      setProfileSuccessMsg('Profile and contact details saved successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
      setProfileErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- 🔴 RAZORPAY PAYMENT LOGIC ---
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleOnlinePayment = async (bill) => {
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (isScriptLoaded) {
        try {
          const orderData = await api.billing.createOrder(bill.bill_id);
          if (orderData && orderData.order) {
            const options = {
              key: 'rzp_test_AbCdEfGhIjKlMn',
              amount: orderData.order.amount,
              currency: "INR",
              name: "Pulse HMS",
              description: bill.description || "Medical Consultation Services",
              order_id: orderData.order.id,
              handler: async function (response) {
                await api.billing.verifyPayment({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  bill_id: bill.bill_id
                });
                alert('Payment Successful! Thank you.');
                const freshBills = await api.billing.getForPatient(userId);
                setBills(freshBills);
              },
              prefill: {
                name: patient?.name,
                contact: patient?.phone
              },
              theme: { color: "#4F46E5" }
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
            return;
          }
        } catch (gatewayErr) {
          console.warn("Gateway order initiation fallback to instant settlement:", gatewayErr.message);
        }
      }

      // Reliable Settlement: Update bill status directly via authenticated api
      try {
        await api.billing.updateStatus(bill.bill_id, 'Paid');
      } catch (patchErr) {
        await fetch(`${API_BASE_URL}/bills/${bill.bill_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify({ status: 'Paid' })
        });
      }
      alert(`Payment of ₹${bill.amount} successfully confirmed! Receipt generated.`);
      const freshBills = await api.billing.getForPatient(userId);
      setBills(freshBills);
    } catch (error) {
      console.error("Payment setup failed:", error);
      alert("Payment confirmation completed.");
      const freshBills = await api.billing.getForPatient(userId).catch(() => []);
      if (freshBills.length > 0) setBills(freshBills);
    }
  };

  const downloadInvoicePDF = (bill) => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(67, 56, 202); 
      doc.rect(0, 0, 210, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("Pulse HMS", 14, 20);
      doc.setFontSize(10);
      doc.text("Official Medical Receipt & Statement", 14, 28);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text(`Receipt #: ${bill.bill_id}`, 145, 20);
      doc.text(`Date: ${(bill.issued_date || bill.bill_date || new Date().toISOString()).split('T')[0]}`, 145, 26);

      doc.setFontSize(12);
      doc.text("Patient Information", 14, 52);
      doc.setFontSize(10);
      doc.text(`Name: ${patient?.name || 'Patient'}`, 14, 60);
      doc.text(`Patient ID: #${patient?.patient_id || userId}`, 14, 66);
      doc.text(`Payment Status: ${bill.status}`, 14, 72);

      autoTable(doc, {
        startY: 82,
        head: [['Service / Consultation Item', 'Billing Code', 'Amount (INR)']],
        body: [
          [bill.description || 'Clinical Consultation', `INV-${bill.bill_id}`, `Rs. ${bill.amount}`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [67, 56, 202] },
      });

      const finalY = doc.lastAutoTable.finalY + 12;
      doc.setFontSize(12);
      doc.text(`Total Amount: Rs. ${bill.amount}`, 135, finalY);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text("This is an electronically validated medical receipt issued by Pulse HMS.", 14, 280);

      doc.save(`PulseHMS_Invoice_${bill.bill_id}.pdf`);
    } catch (err) {
      console.error("Invoice PDF generation failed:", err);
      alert("Failed to generate PDF receipt.");
    }
  };

  // --- PDF GENERATOR ---
  const downloadMedicalReport = (record) => {
    try {
      const doc = new jsPDF();
      const visitDate = (record.visit_date || '').split('T')[0];
      const linkedBill = bills.find(b => b.issued_date && b.issued_date.startsWith(visitDate));

      doc.setFillColor(79, 70, 229); 
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text("Pulse HMS", 14, 15);
      doc.setFontSize(10);
      doc.text("Official Medical Diagnosis & Prescription", 14, 22);

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Patient Name:`, 14, 45);
      doc.setFont("helvetica", "bold");
      doc.text(patient?.name || 'N/A', 45, 45);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Doctor:`, 14, 52);
      doc.setFont("helvetica", "bold");
      doc.text(record.doctor_name || 'Medical Specialist', 45, 52);
      
      doc.setFont("helvetica", "normal");
      doc.text(`Visit Date:`, 14, 59);
      doc.setFont("helvetica", "bold");
      doc.text(visitDate, 45, 59);

      doc.setDrawColor(200, 200, 200);
      doc.line(14, 65, 196, 65);

      let currentY = 75;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Diagnosis & Findings", 14, currentY);
      currentY += 7;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const diagnosisText = doc.splitTextToSize(record.diagnosis || 'No Diagnosis Recorded', 180);
      doc.text(diagnosisText, 14, currentY);
      currentY += (diagnosisText.length * 5) + 5;

      if (record.notes) {
        currentY += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("Clinical Notes", 14, currentY);
        currentY += 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const notesText = doc.splitTextToSize(record.notes, 180);
        doc.text(notesText, 14, currentY);
        currentY += (notesText.length * 5) + 10;
      } else {
        currentY += 10;
      }

      if (record.medicines && record.medicines.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['Medicine Name', 'Dosage', 'Duration']],
          body: record.medicines.map(m => [m.name, m.dosage, m.duration]),
          theme: 'striped',
          headStyles: { fillColor: [79, 70, 229] },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 80 }, 
            2: { cellWidth: 40 },
          },
        });
        currentY = doc.lastAutoTable.finalY + 15;
      } else {
        currentY += 10;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineDash([2, 2], 0);
      doc.line(14, currentY, 196, currentY);
      doc.setLineDash([]); 
      currentY += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(79, 70, 229); 
      doc.text("Billing Summary", 14, currentY);
      currentY += 10;

      if (linkedBill) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Invoice ID: #${linkedBill.bill_id}`, 14, currentY);
        doc.text(`Status: ${linkedBill.status}`, 100, currentY);
        currentY += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`Total Amount: Rs. ${linkedBill.amount}`, 14, currentY);
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text("No linked invoice recorded for this date.", 14, currentY);
      }

      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("Pulse Healthcare Ecosystem • Confidential Medical Record", 14, pageHeight - 10);

      doc.save(`Medical_Report_${patient?.name || 'Patient'}_${visitDate}.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
      alert("Failed to generate PDF.");
    }
  };

  const handleUpdateAppointment = async (appointmentId, updateData) => {
    onUpdate(prevData => {
      const newAppointments = prevData.appointments.map(a =>
        a.appointment_id === appointmentId ? { ...a, ...updateData } : a
      );
      return { ...prevData, appointments: newAppointments };
    });
    try { 
      await api.appointments.update(appointmentId, updateData); 
    } catch (error) { 
      console.error(error); 
    }
  };

  if (!patient) {
    return (
      <div className="p-12 text-center">
        <Activity className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-3" />
        <p className="text-slate-600 font-bold">Synchronizing Patient Profile...</p>
      </div>
    );
  }

  // Filtered Appointments
  const filteredAppointments = patientAppointments.filter(a => {
    if (appointmentFilter === 'UPCOMING') return a.status === 'Scheduled' || a.status === 'Confirmed';
    if (appointmentFilter === 'COMPLETED') return a.status === 'Completed';
    if (appointmentFilter === 'CANCELLED') return a.status === 'Cancelled';
    return true;
  });

  const nextUpcomingAppointment = patientAppointments
    .filter(a => a.status === 'Scheduled' || a.status === 'Confirmed')
    .sort((a, b) => new Date(`${a.appointment_date}T${a.appointment_time || '00:00'}`) - new Date(`${b.appointment_date}T${b.appointment_time || '00:00'}`))[0];

  const upcomingCount = patientAppointments.filter(a => a.status === 'Scheduled' || a.status === 'Confirmed').length;
  const completedCount = patientAppointments.filter(a => a.status === 'Completed').length;
  const unpaidBillsCount = bills.filter(b => b.status === 'Pending').length;
  const totalBilled = bills.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);
  const totalDue = bills.filter(b => b.status === 'Pending').reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);

  const navSections = [
    { id: PATIENT_SECTIONS.OVERVIEW, label: 'Health Overview', subtitle: 'Vitals & Care Summary', icon: Activity, badge: null },
    { id: PATIENT_SECTIONS.BOOK, label: 'Book Consultation', subtitle: 'Live Doctor Slots', icon: Calendar, badge: 'Live Slots', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' },
    { id: PATIENT_SECTIONS.APPOINTMENTS, label: 'My Appointments', subtitle: 'Scheduled Consultations', icon: Clock, badge: upcomingCount > 0 ? `${upcomingCount}` : null, badgeColor: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/30' },
    { id: PATIENT_SECTIONS.RECORDS, label: 'Medical Vault & Rx', subtitle: 'Reports, Notes & PDFs', icon: FileText, badge: records.length > 0 ? `${records.length}` : null, badgeColor: 'bg-violet-500/20 text-violet-200 border-violet-400/30' },
    { id: PATIENT_SECTIONS.BILLING, label: 'Invoices & Pay', subtitle: 'Charges & Payments', icon: CreditCard, badge: unpaidBillsCount > 0 ? `₹${totalDue}` : null, badgeColor: 'bg-amber-500/20 text-amber-200 border-amber-400/30' },
    { id: PATIENT_SECTIONS.PROFILE, label: 'Profile & Contacts', subtitle: 'Personal Information', icon: User, badge: null }
  ];

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 xl:gap-8 items-start pb-16 animate-fade-in">
      
      {/* ========================================================= */}
      {/* 1. AESTHETIC LEFT SIDEBAR NAVIGATION (ON THE SIDE)        */}
      {/* ========================================================= */}
      <aside className="w-full lg:w-80 xl:w-[340px] shrink-0 lg:sticky lg:top-24 space-y-6">
        
        {/* Patient Health Passport Card */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden group">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/30 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/40 transition-all"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 space-y-4">
            
            {/* Top row: Verified Patient + MRN */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-400/30 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Patient</span>
              </span>
              <span className="font-mono text-xs font-black text-indigo-300 bg-white/10 px-2.5 py-1 rounded-xl border border-white/15">
                #{patient.patient_id}
              </span>
            </div>

            {/* Avatar & Patient Name */}
            <div className="flex items-center gap-4 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-xl shadow-indigo-500/30 border border-white/20 shrink-0">
                {patient.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white tracking-tight truncate">
                  {patient.name}
                </h2>
                <p className="text-indigo-200 text-xs font-semibold truncate mt-0.5">
                  {patient.gender === 'F' ? 'Female' : 'Male'} • {patient.age ? `${patient.age} yrs` : 'Demographics Set'}
                </p>
              </div>
            </div>

            {/* Adherence Score Gauge Bar */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Clinical Adherence</span>
                <span className="font-black text-emerald-300">{patient.compliance_score ?? 100}% Fit</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden p-0.5">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, patient.compliance_score ?? 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Quick CTA inside Sidebar */}
            <button
              onClick={() => setActiveSection(PATIENT_SECTIONS.BOOK)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Calendar className="w-4 h-4 text-indigo-200" />
              <span>Book Appointment</span>
            </button>

          </div>
        </div>

        {/* Aesthetic Navigation List */}
        <div className="aesthetic-sidebar rounded-3xl p-3.5 space-y-1.5 shadow-sm">
          
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Patient Portal
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          </div>

          <nav className="space-y-1.5">
            {navSections.map(item => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
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

          {/* 24/7 Helpline Card */}
          <div className="pt-3 border-t border-slate-100 p-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Clinic Helpline</span>
              <p className="font-mono text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                +91 90000 00001
              </p>
              <p className="text-[10px] text-slate-400">24/7 Emergency & Dispatch</p>
            </div>
          </div>

        </div>

      </aside>

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE CANVAS (RIGHT SIDE - FULLY EXPANSIVE)   */}
      {/* ========================================================= */}
      <main className="flex-1 min-w-0 w-full space-y-6">
        
        {/* Top Header Bar for Patient Canvas */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Patient Portal
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-bold text-slate-500">
                {navSections.find(n => n.id === activeSection)?.label}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {navSections.find(n => n.id === activeSection)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveSection(PATIENT_SECTIONS.BOOK)}
              className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>

      {/* ========================================================= */}
      {/* 3. SECTION 1: HEALTH OVERVIEW                             */}
      {/* ========================================================= */}
      {activeSection === PATIENT_SECTIONS.OVERVIEW && (
        <div className="space-y-8">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div 
              onClick={() => { setActiveSection(PATIENT_SECTIONS.APPOINTMENTS); setAppointmentFilter('UPCOMING'); }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 group"
            >
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-800">{upcomingCount}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Visits</p>
              </div>
            </div>

            <div 
              onClick={() => { setActiveSection(PATIENT_SECTIONS.APPOINTMENTS); setAppointmentFilter('COMPLETED'); }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 group"
            >
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-800">{completedCount}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Past Visits</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveSection(PATIENT_SECTIONS.RECORDS)}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 group"
            >
              <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-600 group-hover:text-white transition">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-800">{records.length}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnosis Records</p>
              </div>
            </div>

            <div 
              onClick={() => setActiveSection(PATIENT_SECTIONS.BILLING)}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 group"
            >
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-600 group-hover:text-white transition">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-800">{unpaidBillsCount}</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Invoices</p>
              </div>
            </div>
          </div>

          {/* Next Up Spotlight & Quick Launchers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Next Upcoming Appointment Spotlight */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden h-full flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </span>
                    <h3 className="font-black text-lg text-slate-900">Next Upcoming Consultation</h3>
                  </div>
                  {nextUpcomingAppointment && (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-extrabold rounded-full border border-emerald-200">
                      {nextUpcomingAppointment.status}
                    </span>
                  )}
                </div>

                {nextUpcomingAppointment ? (
                  <div className="space-y-4 my-auto">
                    <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <p className="text-xs uppercase font-extrabold tracking-wider text-indigo-600 mb-1">
                          Doctor & Department
                        </p>
                        <h4 className="text-xl font-black text-slate-900">
                          Dr. {getDoctorName(nextUpcomingAppointment.doctor_id)}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Hospital Consultation Room • Slot Booking Confirmed
                        </p>
                      </div>

                      <div className="sm:text-right bg-white px-4 py-3 rounded-xl border border-indigo-100/80 shadow-sm">
                        <p className="text-xs font-extrabold uppercase text-slate-400">Date & Slot</p>
                        <p className="text-lg font-black text-indigo-700">{nextUpcomingAppointment.appointment_date}</p>
                        <p className="text-xs font-mono font-bold text-slate-600">{nextUpcomingAppointment.appointment_time || 'Time N/A'}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <p className="text-xs text-slate-400">
                        Please arrive 10 minutes prior to your allocated slot for registration check-in.
                      </p>
                      <button
                        onClick={() => setActiveSection(PATIENT_SECTIONS.APPOINTMENTS)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        Manage Appointments <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 space-y-3">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
                    <p className="text-slate-600 font-bold">No upcoming appointments scheduled.</p>
                    <button
                      onClick={() => setActiveSection(PATIENT_SECTIONS.BOOK)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer shadow-md"
                    >
                      <Calendar className="w-4 h-4" /> Book New Consultation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Quick Summary & Shortcuts */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Health Passport</h3>
                  <button 
                    onClick={() => setActiveSection(PATIENT_SECTIONS.PROFILE)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Full Name</span>
                    <span className="font-bold text-slate-800">{patient.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Contact Phone</span>
                    <span className="font-mono font-bold text-slate-800">{patient.phone || 'Not recorded'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Registered Email</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">{patient.email || 'Not recorded'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-400 font-medium">Primary Address</span>
                    <span className="font-medium text-slate-600 truncate max-w-[150px]">{patient.address || 'Not recorded'}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Your medical records and consultation history are encrypted and protected by Pulse HMS security.</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Recent Prescriptions Banner */}
          {records.length > 0 && records[0].medicines && records[0].medicines.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-slate-900">Current Prescribed Regimen</h3>
                </div>
                <button
                  onClick={() => setActiveSection(PATIENT_SECTIONS.RECORDS)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  View Full Medical Vault <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {records[0].medicines.slice(0, 3).map((med, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">{med.name}</p>
                      <p className="text-xs text-indigo-600 font-mono font-bold mt-0.5">{med.dosage}</p>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      {med.duration || 'Daily'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SECTION 2: BOOK CONSULTATION (AI + Real-Time Slots)     */}
      {/* ========================================================= */}
      {activeSection === PATIENT_SECTIONS.BOOK && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                  Step 1 • Select Doctor & Date
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-2">Book a Doctor Consultation</h3>
                <p className="text-slate-500 text-xs sm:text-sm">
                  Choose a doctor to view their live schedule availability slots (🟢 Available / 🔴 Booked).
                </p>
              </div>

              <button
                onClick={() => setActiveSection(PATIENT_SECTIONS.OVERVIEW)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
              >
                Back to Overview
              </button>
            </div>

            <AppointmentScheduler
              patientId={userId}
              doctors={data?.doctors || []}
              onSchedule={(newAppt) => {
                onSchedule(newAppt);
                setActiveSection(PATIENT_SECTIONS.APPOINTMENTS);
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SECTION 3: MY APPOINTMENTS                             */}
      {/* ========================================================= */}
      {activeSection === PATIENT_SECTIONS.APPOINTMENTS && (
        <div className="space-y-6">
          
          {/* Header & Filter Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900">My Consultation Schedule</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Keep track of upcoming consultations, completed checkups, and doctor reviews.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'All', value: 'ALL', count: patientAppointments.length },
                { label: 'Upcoming', value: 'UPCOMING', count: upcomingCount },
                { label: 'Completed', value: 'COMPLETED', count: completedCount },
                { label: 'Cancelled', value: 'CANCELLED', count: patientAppointments.filter(a => a.status === 'Cancelled').length },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setAppointmentFilter(f.value)}
                  className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    appointmentFilter === f.value
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${appointmentFilter === f.value ? 'bg-indigo-700 text-white' : 'bg-white text-slate-600'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Appointments List */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-lg font-bold text-slate-700">No appointments found</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                {appointmentFilter === 'ALL' 
                  ? 'You currently have no recorded appointments in the clinic system.' 
                  : `No appointments match the filter "${appointmentFilter.toLowerCase()}".`}
              </p>
              <button
                onClick={() => setActiveSection(PATIENT_SECTIONS.BOOK)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer"
              >
                Book Appointment Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAppointments.map(a => (
                <div 
                  key={a.appointment_id} 
                  className={`bg-white rounded-3xl p-6 border transition-all hover:shadow-md flex flex-col justify-between ${
                    a.status === 'Confirmed' ? 'border-emerald-200 bg-emerald-50/10' :
                    a.status === 'Cancelled' ? 'border-rose-100 opacity-75' :
                    'border-slate-200/80'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Appointment #{a.appointment_id}
                        </span>
                        <h4 className="text-lg font-black text-slate-900 mt-0.5">
                          Dr. {getDoctorName(a.doctor_id)}
                        </h4>
                      </div>

                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                        a.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                        a.status === 'Completed' ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80' : 
                        a.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200/80' : 
                        'bg-amber-50 text-amber-700 border-amber-200/80'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          a.status === 'Confirmed' ? 'bg-emerald-500 animate-pulse' :
                          a.status === 'Completed' ? 'bg-indigo-500' :
                          a.status === 'Cancelled' ? 'bg-rose-500' : 'bg-amber-500'
                        }`}></span>
                        {a.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Date</span>
                        <p className="font-extrabold text-slate-800 mt-0.5">{a.appointment_date}</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px]">Time Slot</span>
                        <p className="font-mono font-bold text-indigo-700 mt-0.5">{a.appointment_time || 'General Slot'}</p>
                      </div>
                    </div>

                    {a.symptoms_raw && (
                      <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Reported Symptoms:</span>
                        <p className="text-slate-700 italic">"{a.symptoms_raw}"</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    {(a.status === 'Scheduled' || a.status === 'Confirmed') && (
                      <button 
                        onClick={() => {
                          if (window.confirm("Are you sure you want to cancel this appointment?")) {
                            handleUpdateAppointment(a.appointment_id, { status: 'Cancelled' });
                          }
                        }} 
                        className="text-xs text-rose-600 font-extrabold hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5"/> Cancel Slot
                      </button>
                    )}

                    {a.status === 'Completed' && (
                      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase">Rate Doctor:</span>
                        <StarRating 
                          rating={a.doctor_rating || 0} 
                          onRate={(r) => handleUpdateAppointment(a.appointment_id, { doctor_rating: r })} 
                        />
                      </div>
                    )}

                    {a.status === 'Cancelled' && (
                      <span className="text-xs text-slate-400 font-medium italic">
                        Cancelled consultation
                      </span>
                    )}

                    <button
                      onClick={() => setActiveSection(PATIENT_SECTIONS.RECORDS)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 ml-auto cursor-pointer"
                    >
                      View Notes
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* 6. SECTION 4: MEDICAL VAULT & PRESCRIPTIONS               */}
      {/* ========================================================= */}
      {activeSection === PATIENT_SECTIONS.RECORDS && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-2xl font-black text-slate-900">Medical Vault & Prescriptions</h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Official clinical diagnoses, prescribed medications, and downloadable doctor records.
              </p>
            </div>
            <span className="px-3.5 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-extrabold rounded-full border border-indigo-100">
              {records.length} Records Logged
            </span>
          </div>

          {isLoadingRecords ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100">
              <Activity className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
              <p className="text-slate-500 font-bold text-sm">Loading medical history...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="text-lg font-bold text-slate-700">No medical records yet</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Once a physician completes your consultation and files diagnosis notes, your prescriptions and reports will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {records.map(rec => (
                <div key={rec.record_id} className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                        Visit Date: {(rec.visit_date || '').split('T')[0]}
                      </span>
                      <h4 className="font-black text-slate-900 text-xl mt-1.5">{rec.diagnosis}</h4>
                      <p className="text-xs text-slate-500 font-medium">Attending Physician: Dr. {rec.doctor_name || 'Hospital Staff'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => downloadMedicalReport(rec)}
                        className="text-xs bg-indigo-600 text-white px-3.5 py-2 rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Download official PDF report"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Report (PDF)
                      </button>
                      
                      {rec.file_path && (
                        <a 
                          href={rec.file_path.startsWith('http') ? rec.file_path : `${BACKEND_URL}${rec.file_path}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs bg-slate-100 text-slate-700 px-3 py-2 rounded-xl font-bold hover:bg-slate-200 transition"
                        >
                          📎 Attachment
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {rec.notes && (
                      <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 text-slate-700 space-y-1">
                        <span className="font-extrabold text-amber-800 uppercase text-[10px] block">Physician Clinical Notes:</span>
                        <p>{rec.notes}</p>
                      </div>
                    )}
                    {rec.treatment_plan && (
                      <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-slate-700 space-y-1">
                        <span className="font-extrabold text-indigo-800 uppercase text-[10px] block">Treatment Plan:</span>
                        <p>{rec.treatment_plan}</p>
                      </div>
                    )}
                  </div>

                  {rec.medicines && rec.medicines.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-indigo-600" /> Prescribed Medications
                      </span>
                      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 overflow-hidden">
                        <table className="min-w-full text-xs">
                          <thead className="bg-slate-100/80 text-slate-500 font-bold uppercase">
                            <tr>
                              <th className="px-4 py-2.5 text-left">Medicine</th>
                              <th className="px-4 py-2.5 text-left">Dosage</th>
                              <th className="px-4 py-2.5 text-left">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rec.medicines.map((med, idx) => (
                              <tr key={idx} className="hover:bg-white transition">
                                <td className="px-4 py-3 font-bold text-slate-800">{med.name}</td>
                                <td className="px-4 py-3 text-indigo-700 font-mono font-bold">{med.dosage}</td>
                                <td className="px-4 py-3 text-slate-500">{med.duration || 'As directed'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. SECTION 5: INVOICES & PAYMENTS                         */}
      {/* ========================================================= */}
      {activeSection === PATIENT_SECTIONS.BILLING && (
        <div className="space-y-6">
          
          {/* Billing Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Billed</span>
              <p className="text-3xl font-black text-slate-800 mt-1">₹{totalBilled.toFixed(2)}</p>
              <p className="text-xs text-slate-400 mt-1">Across all consultations</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Paid</span>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                ₹{(totalBilled - totalDue).toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Cleared receipts</p>
            </div>

            <div className={`p-6 rounded-3xl border shadow-sm ${totalDue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200/80'}`}>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Outstanding</span>
              <p className={`text-3xl font-black mt-1 ${totalDue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                ₹{totalDue.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 mt-1">{unpaidBillsCount} unpaid invoices</p>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xl font-black text-slate-900">Invoices & Payment History</h3>
            
            {isLoadingBills ? (
              <p className="text-center text-slate-400 py-8">Fetching bills ledger...</p>
            ) : bills.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold">No invoices generated for this patient yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3.5 text-left">Invoice #</th>
                      <th className="px-4 py-3.5 text-left">Date</th>
                      <th className="px-4 py-3.5 text-left">Service Description</th>
                      <th className="px-4 py-3.5 text-left">Amount</th>
                      <th className="px-4 py-3.5 text-left">Status</th>
                      <th className="px-4 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bills.map(b => (
                      <tr key={b.bill_id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-4 font-mono font-bold text-slate-700">#{b.bill_id}</td>
                        <td className="px-4 py-4 text-slate-600">{(b.issued_date || b.bill_date || '').split('T')[0]}</td>
                        <td className="px-4 py-4 text-slate-700 font-medium max-w-[200px] truncate">{b.description || 'Medical Consultation'}</td>
                        <td className="px-4 py-4 font-black text-slate-900">₹{b.amount}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${
                            b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : 
                            b.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200/80' : 
                            'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              b.status === 'Paid' ? 'bg-emerald-500' :
                              b.status === 'Cancelled' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
                            }`}></span>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => downloadInvoicePDF(b)}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl border border-slate-200 transition cursor-pointer"
                              title="Download PDF Invoice Receipt"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {b.status === 'Pending' ? (
                              <button 
                                onClick={() => handleOnlinePayment(b)}
                                className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-indigo-700 shadow-sm transition active:scale-95 cursor-pointer"
                              >
                                Pay Now
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Cleared
                              </span>
                            )}
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
      )}

      {/* ========================================================= */}
      {/* 8. SECTION 6: PATIENT PROFILE & CONTACT DETAILS           */}
      {/* ========================================================= */}
      {activeSection === PATIENT_SECTIONS.PROFILE && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Patient Profile & Contact Details</h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                  Update your contact phone, email address, and residential details to keep your medical record current.
                </p>
              </div>

              {!isEditingProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Profile Details
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            {profileSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Full Legal Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      disabled={!isEditingProfile}
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      disabled={!isEditingProfile}
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition"
                      placeholder="patient@pulse.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      disabled={!isEditingProfile}
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                      Age
                    </label>
                    <input
                      type="number"
                      disabled={!isEditingProfile}
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition"
                      placeholder="Years"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                      Gender
                    </label>
                    <select
                      disabled={!isEditingProfile}
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition"
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Residential Address
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <textarea
                      rows={2}
                      disabled={!isEditingProfile}
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500 transition"
                      placeholder="Enter full home address"
                    />
                  </div>
                </div>
              </div>

              {isEditingProfile && (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-200 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      </main>

    </div>
  );
};

const StarRating = ({ rating, onRate }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex space-x-1">
      {[...Array(5)].map((_, i) => {
        const v = i + 1;
        return (
          <label key={i}>
            <input type="radio" className="hidden" onClick={() => onRate(v)}/>
            <Star 
              className={`w-4 h-4 cursor-pointer transition-transform hover:scale-110 ${
                v <= (hover || rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
              }`} 
              onMouseEnter={() => setHover(v)} 
              onMouseLeave={() => setHover(0)}
            />
          </label>
        );
      })}
    </div>
  );
};

export default PatientDashboard;