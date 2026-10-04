import React from 'react';
import { 
  Activity, ShieldCheck, Users, Clock, ArrowRight, HeartPulse, 
  Stethoscope, Sparkles, BrainCircuit, Pill, FileText, CreditCard, 
  Calendar, CheckCircle2, PhoneCall, AlertCircle, ChevronRight, Star, 
  Building2, Zap, ArrowUpRight, Award, Lock
} from 'lucide-react';

const HomePage = ({ onOpenAuth }) => {
  return (
    <div className="space-y-20 py-4 sm:py-8">

      {/* ========================================================= */}
      {/* 1. HERO SECTION                                           */}
      {/* ========================================================= */}
      <section className="relative overflow-hidden pt-6 pb-12 lg:pt-10 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            
            {/* Live Status Pill */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 border border-indigo-100 shadow-sm shadow-indigo-100/50 backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pulse HMS 2.0 • Live WebSocket Engine
              </span>
              <span className="bg-indigo-50 text-indigo-700 text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-200/60">
                Cloud TiDB
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1.08] tracking-tight">
              Next-Gen Healthcare,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500">
                Delivered at Pulse Speed.
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              An intelligent, full-stack hospital ecosystem connecting <strong className="text-slate-900 font-semibold">Patients</strong>, <strong className="text-slate-900 font-semibold">Doctors</strong>, and <strong className="text-slate-900 font-semibold">Hospital Staff</strong>. Featuring real-time pharmacy deductions, AI-powered triage pre-screening, and zero-conflict appointment scheduling.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button 
                onClick={() => onOpenAuth && onOpenAuth('Patient', 'register')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 group cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-indigo-200 group-hover:rotate-12 transition-transform" />
                <span>Book Appointment / Register</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => onOpenAuth && onOpenAuth('Patient', 'signin')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-slate-800 font-bold text-base border border-slate-200/80 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In to Portal</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Mini Trust Highlights */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No Waiting Queues</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Encrypted Medical Vault</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Instant Prescription Sync</span>
              </div>
            </div>

          </div>

          {/* Right Column: Interactive Hospital Preview Widget */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Decorative Glowing Orbs behind the card */}
              <div className="absolute -top-6 -left-6 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
              <div className="absolute -bottom-8 -right-8 w-56 h-56 bg-pink-500/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

              {/* Central Mock Console Card */}
              <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/60 space-y-6">
                
                {/* Console Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                      <HeartPulse className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Pulse Live Center</h4>
                      <p className="text-xs text-slate-400">Station OPD-01 • Active</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-extrabold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Live Sync
                  </span>
                </div>

                {/* Doctor Active Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-600/50 border border-indigo-400/30 flex items-center justify-center font-bold text-white text-base">
                        AP
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-white">Dr. Anil Patil</h5>
                        <p className="text-xs text-indigo-200">Senior Cardiologist</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-400/20 px-2 py-0.5 rounded-lg border border-amber-400/30 text-amber-300 text-xs font-bold">
                      <Star className="w-3 h-3 fill-amber-300" />
                      <span>4.9</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-indigo-800/40 text-center text-xs">
                    <div className="bg-white/5 rounded-lg p-1.5">
                      <p className="text-[10px] text-indigo-300">Patients</p>
                      <p className="font-bold text-white">12 Today</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-1.5">
                      <p className="text-[10px] text-indigo-300">Avg Rating</p>
                      <p className="font-bold text-emerald-400">98%</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-1.5">
                      <p className="text-[10px] text-indigo-300">Status</p>
                      <p className="font-bold text-indigo-200">In OPD</p>
                    </div>
                  </div>
                </div>

                {/* Floating Widget 1: AI Triage Badge */}
                <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-indigo-950">AI Symptom Triage</p>
                      <p className="text-[11px] text-indigo-600">Categorized: Non-Emergency / Routine</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-1 rounded-lg">
                    Gemini AI
                  </span>
                </div>

                {/* Floating Widget 2: Live Pharmacy Auto-Deduct */}
                <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-600/20">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Real-Time Pharmacy Stock</p>
                      <p className="text-[11px] text-emerald-600">Amoxicillin 500mg • Auto-deducted</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-1 rounded-lg">
                    Socket.io
                  </span>
                </div>

                {/* Patient Adherence Meter */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Patient Compliance Metric</span>
                    <span className="text-indigo-600">94% Optimal</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-2 rounded-full w-[94%] transition-all duration-1000"></div>
                  </div>
                </div>

              </div>

              {/* Floating Mini Badge Outside */}
              <div className="absolute -bottom-4 -left-6 bg-white rounded-2xl p-3 shadow-xl border border-slate-100 flex items-center gap-2.5 animate-float hidden sm:flex">
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800">Zero Wait Scheduling</p>
                  <p className="text-[10px] text-slate-500">10 AM — 10 PM Slots</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. LIVE METRICS & TRUST PROOF BAR                          */}
      {/* ========================================================= */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-15"></div>
        
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-800/80 text-center">
          
          <div className="pt-4 md:pt-0">
            <p className="text-4xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              15,000+
            </p>
            <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mt-2">
              Patients Served
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Across 4 core specialties</p>
          </div>

          <div className="pt-4 md:pt-0 md:pl-8">
            <p className="text-4xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
              99.8%
            </p>
            <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider mt-2">
              On-Time Consults
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Zero double bookings</p>
          </div>

          <div className="pt-4 md:pt-0 md:pl-8">
            <p className="text-4xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
              &lt; 50ms
            </p>
            <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mt-2">
              Live WebSocket Sync
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Pharmacy & queue status</p>
          </div>

          <div className="pt-4 md:pt-0 md:pl-8">
            <p className="text-4xl sm:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-400">
              100%
            </p>
            <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mt-2">
              Encrypted Vault
            </p>
            <p className="text-[11px] text-slate-400 mt-1">JWT + Cloudinary security</p>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. CHOOSE YOUR ROLE / PORTAL CHOOSER                       */}
      {/* ========================================================= */}
      <section className="space-y-8" id="portals">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-extrabold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            Role-Based Portals
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tailored Experiences for Everyone
          </h2>
          <p className="text-slate-500 text-base">
            Select your role below to quickly log in to your specialized clinical or management dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Patient Portal */}
          <div className="group relative bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
            
            <div className="relative z-10 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">For Patients</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Patient Portal</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Book hourly doctor consultations, access PDF medical history, run AI symptom pre-checks, and download invoices.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant slot booking (10 AM - 10 PM)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Downloadable PDF medical records</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Automated bill payment tracking</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 pt-6">
              <button 
                onClick={() => onOpenAuth && onOpenAuth('Patient', 'signin')}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
              >
                <span>Access Patient Portal</span>
                <ArrowRight className="w-4 h-4 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Doctor Portal */}
          <div className="group relative bg-white rounded-3xl p-8 border-2 border-indigo-600 shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-sm">
              Clinical Hub
            </div>
            
            <div className="relative z-10 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-7 h-7" />
              </div>
              
              <div>
                <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">For Physicians</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Doctor Command Center</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Real-time patient queue, rich-text clinical consultations, automated e-prescriptions, and compliance monitoring.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Real-time prescription inventory deductions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Patient compliance tracking score (0-100)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Cloudinary X-Ray & lab report previews</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 pt-6">
              <button 
                onClick={() => onOpenAuth && onOpenAuth('Doctor', 'signin')}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-md shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
              >
                <span>Access Doctor Portal</span>
                <ArrowRight className="w-4 h-4 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: Receptionist / Staff Console */}
          <div className="group relative bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-0 group-hover:scale-110 transition-transform"></div>
            
            <div className="relative z-10 space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>
              
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">For Administration</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Receptionist Console</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Manage hospital-wide billing, pharmacy inventory stock additions, and control global appointment schedules.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs font-semibold text-slate-600 border-t border-slate-100 pt-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Pharmacy stock monitor & quick replenish</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instant bill invoice creation & status</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Mark Completed, Cancel, or No-Show</span>
                </li>
              </ul>
            </div>

            <div className="relative z-10 pt-6">
              <button 
                onClick={() => onOpenAuth && onOpenAuth('Receptionist', 'signin')}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2 group-hover:gap-3 cursor-pointer"
              >
                <span>Access Staff Console</span>
                <ArrowRight className="w-4 h-4 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. KEY CAPABILITIES & INNOVATIONS (FEATURES GRID)          */}
      {/* ========================================================= */}
      <section className="space-y-12" id="features">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-extrabold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Engineered for Modern Medicine
          </h2>
          <p className="text-slate-500 text-base">
            Every module in Pulse HMS is connected via real-time events to eliminate administrative lag.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: BrainCircuit,
              title: "AI Clinical Triage",
              desc: "Patients enter informal symptoms in plain English; our integrated Gemini AI models organize them into structured medical triage terms for doctors.",
              tag: "Gemini 2.5",
              color: "text-purple-600",
              bg: "bg-purple-50",
              border: "hover:border-purple-200"
            },
            {
              icon: Zap,
              title: "WebSocket Live Sync",
              desc: "The moment a physician issues an e-prescription, pharmacy medicine stock is deducted instantly across all receptionists and staff consoles without a page refresh.",
              tag: "Socket.io",
              color: "text-amber-600",
              bg: "bg-amber-50",
              border: "hover:border-amber-200"
            },
            {
              icon: Calendar,
              title: "Conflict-Free Scheduling",
              desc: "Strict ACID database locks prevent simultaneous double-booking, overbooking, and past-date reservations with clean hourly appointment slots.",
              tag: "ACID Guaranteed",
              color: "text-blue-600",
              bg: "bg-blue-50",
              border: "hover:border-blue-200"
            },
            {
              icon: FileText,
              title: "Digital Clinical Vault",
              desc: "Rich-text clinical notes, automated PDF discharge reports, and secure Cloudinary storage for high-resolution X-Rays, MRI scans, and lab reports.",
              tag: "Cloudinary CDN",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              border: "hover:border-emerald-200"
            },
            {
              icon: CreditCard,
              title: "Automated Invoicing",
              desc: "Generate professional billing invoices with consultation fees and pharmacy totals. Easily switch between Paid and Unpaid with Razorpay readiness.",
              tag: "Smart Billing",
              color: "text-rose-600",
              bg: "bg-rose-50",
              border: "hover:border-rose-200"
            },
            {
              icon: ShieldCheck,
              title: "Enterprise RBAC & Audit",
              desc: "Role-Based Access Control fortified with JWT sessions, Bcrypt hashing, Helmet protection, rate limiting, and audit trail logging.",
              tag: "Bcrypt & JWT",
              color: "text-indigo-600",
              bg: "bg-indigo-50",
              border: "hover:border-indigo-200"
            }
          ].map((item, idx) => (
            <div 
              key={idx} 
              className={`bg-white rounded-3xl p-7 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${item.border}`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center font-bold`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {item.tag}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-slate-800 tracking-tight">{item.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. SPECIALIZED CLINICAL DEPARTMENTS                        */}
      {/* ========================================================= */}
      <section className="space-y-10" id="departments">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold uppercase tracking-wider">
              <Award className="w-3.5 h-3.5" />
              Specialties
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-2">
              Our Medical Specialties
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Top board-certified doctors available for consultations.
            </p>
          </div>

          <button 
            onClick={() => onOpenAuth && onOpenAuth('Patient', 'signin')}
            className="self-start md:self-auto text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Book with any specialist</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              name: "Cardiology",
              doctor: "Dr. Anil Patil",
              detail: "Heart disease, arrhythmia, ECG & hypertension management",
              icon: HeartPulse,
              badge: "4.9 ★ Rating",
              color: "text-rose-500",
              bg: "bg-rose-50"
            },
            {
              name: "Neurology",
              doctor: "Dr. Nisha Rao",
              detail: "Brain health, chronic migraines, neuropathies & spine care",
              icon: BrainCircuit,
              badge: "Specialist Care",
              color: "text-purple-500",
              bg: "bg-purple-50"
            },
            {
              name: "Orthopedics",
              doctor: "Dr. Rajesh Kulkarni",
              detail: "Joint replacement, fracture recovery & sports injuries",
              icon: Activity,
              badge: "Senior Surgeon",
              color: "text-blue-500",
              bg: "bg-blue-50"
            },
            {
              name: "Pediatrics",
              doctor: "Dr. Sneha Joshi",
              detail: "Child wellness, infant vaccinations & neonatal consultations",
              icon: Users,
              badge: "Child Health",
              color: "text-amber-500",
              bg: "bg-amber-50"
            }
          ].map((dept, i) => (
            <div 
              key={i}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className={`w-12 h-12 rounded-2xl ${dept.bg} ${dept.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <dept.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                    {dept.badge}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{dept.name}</h4>
                  <p className="text-xs font-semibold text-indigo-600">{dept.doctor}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{dept.detail}</p>
              </div>

              <div className="pt-4 border-t border-slate-50 mt-4">
                <button 
                  onClick={() => onOpenAuth && onOpenAuth('Patient', 'signin')}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 py-2.5 rounded-xl border border-slate-200/60 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Consult Doctor</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. HOW IT WORKS (3 SIMPLE STEPS)                           */}
      {/* ========================================================= */}
      <section className="bg-slate-100/60 rounded-3xl p-8 sm:p-12 border border-slate-200/50 space-y-10">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">How It Works</h3>
          <p className="text-slate-500 text-sm">Experience modern hospital care in three quick steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {[
            {
              step: "01",
              title: "Quick Registration",
              desc: "Sign up in 30 seconds with your phone number and email. Instant secure access to your portal.",
              color: "text-indigo-600",
              badgeBg: "bg-indigo-600"
            },
            {
              step: "02",
              title: "AI Triage & Booking",
              desc: "Select your preferred specialist and use AI Triage to describe symptoms for optimal preparation.",
              color: "text-purple-600",
              badgeBg: "bg-purple-600"
            },
            {
              step: "03",
              title: "Digital Care & Records",
              desc: "Attend consultation, receive instant e-prescriptions, and download PDF clinical summaries anytime.",
              color: "text-emerald-600",
              badgeBg: "bg-emerald-600"
            }
          ].map((item, index) => (
            <div key={index} className="relative bg-white rounded-2xl p-7 shadow-sm border border-slate-100 space-y-4">
              <div className={`w-10 h-10 rounded-xl ${item.badgeBg} text-white flex items-center justify-center font-black text-sm shadow-md`}>
                {item.step}
              </div>
              <h4 className="text-xl font-bold text-slate-800">{item.title}</h4>
              <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. EMERGENCY 24X7 BANNER                                   */}
      {/* ========================================================= */}
      <section className="bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden" id="emergency">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-rose-100">
              <AlertCircle className="w-4 h-4 text-white" />
              24/7 Critical Trauma & Emergency Unit
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-white">Need Urgent Medical Care?</h3>
            <p className="text-rose-100 text-sm max-w-xl">
              Our emergency room and trauma response teams operate around the clock. Call our emergency direct line for immediate assistance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a 
              href="tel:108"
              className="px-6 py-3.5 bg-white text-rose-600 font-extrabold rounded-2xl shadow-lg hover:bg-rose-50 transition-all flex items-center gap-2 text-sm"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Call Emergency: 108 / 911</span>
            </a>
            <button 
              onClick={() => onOpenAuth && onOpenAuth('Patient', 'signin')}
              className="px-6 py-3.5 bg-rose-900/40 border border-white/30 text-white font-bold rounded-2xl hover:bg-rose-900/60 transition-all text-sm cursor-pointer"
            >
              Schedule Urgent Visit
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER                                                  */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-200/80 pt-10 pb-6 text-slate-500 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
                <HeartPulse className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">Pulse<span className="text-indigo-600">HMS</span></span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Production-grade healthcare platform built with React 19, Node.js, Socket.io, and TiDB Cloud.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Quick Navigation</h5>
            <ul className="space-y-2 text-xs">
              <li><a href="#features" className="hover:text-indigo-600 transition">Features</a></li>
              <li><a href="#departments" className="hover:text-indigo-600 transition">Specialized Departments</a></li>
              <li><a href="#portals" className="hover:text-indigo-600 transition">Role Portals</a></li>
              <li><a href="#emergency" className="hover:text-indigo-600 transition">Emergency 24x7</a></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">Portal Quick Access</h5>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => onOpenAuth && onOpenAuth('Patient')} className="hover:text-indigo-600 transition cursor-pointer">Patient Portal</button></li>
              <li><button onClick={() => onOpenAuth && onOpenAuth('Doctor')} className="hover:text-indigo-600 transition cursor-pointer">Doctor Portal</button></li>
              <li><button onClick={() => onOpenAuth && onOpenAuth('Receptionist')} className="hover:text-indigo-600 transition cursor-pointer">Receptionist Console</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">System Health</h5>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>All Systems Operational</span>
              </div>
              <p className="text-slate-400 text-[11px]">Database: TiDB Cloud AP-Southeast</p>
              <p className="text-slate-400 text-[11px]">WebSockets: Active</p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© 2026 Pulse Hospital Management System. All rights reserved.</p>
          <p className="font-medium text-slate-500">Security: Encrypted 256-bit JWT • ACID DB</p>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;