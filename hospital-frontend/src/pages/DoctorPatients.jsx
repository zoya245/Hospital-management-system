import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Phone, Mail, Calendar, Clock, 
  Activity, ArrowRight, ShieldCheck, RefreshCw, FileText 
} from 'lucide-react';
import Card from '../components/Card';
import { api } from '../services/api';

const DoctorPatients = ({ doctorId, onSelectPatient }) => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const data = await api.doctors.getPatients(doctorId);
      setPatients(data);
    } catch (err) {
      console.error("Failed to load doctor's patients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId) fetchPatients();
  }, [doctorId]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const term = searchTerm.toLowerCase();
    return patients.filter(p => 
      (p.patient_name && p.patient_name.toLowerCase().includes(term)) ||
      (p.phone && p.phone.includes(term)) ||
      (p.email && p.email.toLowerCase().includes(term))
    );
  }, [patients, searchTerm]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Confirmed
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {status || 'Scheduled'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-md">
            <Users className="w-3.5 h-3.5" />
            <span>Assigned Clinical Registry</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Your Patient Directory</h2>
          <p className="mt-1 text-indigo-100 text-sm max-w-xl">
            View comprehensive patient details associated with your appointments, including demographics, contact details, appointment dates, and clinical compliance records.
          </p>
        </div>

        <button 
          onClick={fetchPatients}
          className="relative z-10 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-white/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by patient name, phone number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          Total Assigned Patients: <span className="text-indigo-600 font-mono font-black">{patients.length}</span>
        </div>
      </div>

      {/* Patient Table Card */}
      <Card title={`Registered Clinical Patients (${filteredPatients.length})`} icon={Users}>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>)}
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No patients found.</p>
            <p className="text-xs text-slate-400 mt-1">Patients with scheduled or completed consultations with you will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-xs uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4 font-extrabold">Patient Name</th>
                  <th className="py-3 px-4 font-extrabold">Demographics</th>
                  <th className="py-3 px-4 font-extrabold">Contact (Phone & Email)</th>
                  <th className="py-3 px-4 font-extrabold">Appointment Date & Time</th>
                  <th className="py-3 px-4 font-extrabold">Status</th>
                  <th className="py-3 px-4 font-extrabold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredPatients.map(p => (
                  <tr 
                    key={p.patient_id}
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => onSelectPatient && onSelectPatient(p.patient_id)}
                  >
                    {/* Patient Name & Avatar */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          {(p.patient_name || 'Patient').split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                            {p.patient_name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{p.patient_id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Age & Gender */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="text-slate-700 font-medium">
                        <span className="font-bold">{p.age ? `${p.age} yrs` : 'N/A'}</span>
                        <span className="text-slate-400 mx-1.5">•</span>
                        <span>{p.gender === 'M' ? 'Male' : p.gender === 'F' ? 'Female' : 'Other'}</span>
                      </div>
                      {p.compliance_score !== undefined && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-600">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{p.compliance_score}% Compliance</span>
                        </div>
                      )}
                    </td>

                    {/* Phone & Email */}
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-800 font-mono font-bold">
                          <Phone className="w-3 h-3 text-indigo-500" />
                          <span>{p.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="w-3 h-3 text-indigo-400" />
                          <span className="truncate max-w-[180px]">{p.email || 'No email provided'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Appointment Date & Time */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <Calendar className="w-3 h-3 text-indigo-500" />
                          <span>{p.last_appointment_date || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{p.last_appointment_formatted_time || p.last_appointment_time?.slice(0, 5) || 'N/A'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Appointment Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getStatusBadge(p.last_appointment_status)}
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {p.total_appointments_with_doctor || 1} total visit(s)
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectPatient) onSelectPatient(p.patient_id);
                        }}
                        className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-xl font-bold transition flex items-center gap-1.5 ml-auto shadow-sm cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Records</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
};

export default DoctorPatients;
