import React, { useState } from 'react';
import { 
  X, Calendar, Clock, User, Phone, Mail, MapPin, 
  CheckCircle2, XCircle, AlertCircle, Sparkles, BrainCircuit, Activity 
} from 'lucide-react';
import { api } from '../services/api';

const AppointmentDetailsModal = ({ 
  appointment, 
  onClose, 
  onStatusUpdated, 
  onStartConsultation 
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(appointment?.status || 'Scheduled');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  if (!appointment) return null;

  const handleUpdateStatus = async (newStatus) => {
    setIsUpdating(true);
    setFeedbackMsg('');
    try {
      await api.appointments.updateStatus(appointment.appointment_id, newStatus);
      setCurrentStatus(newStatus);
      setFeedbackMsg(`Status successfully updated to ${newStatus}`);
      if (onStatusUpdated) {
        onStatusUpdated(appointment.appointment_id, newStatus);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      setFeedbackMsg('Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Confirmed</span>;
      case 'Completed':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</span>;
      case 'Cancelled':
        return <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Scheduled</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-scale-up">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-violet-800 text-white p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Calendar className="w-6 h-6 text-indigo-200" />
            </span>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-200">Appointment Details</span>
              <h3 className="text-xl font-black text-white">#APP-{appointment.appointment_id}</h3>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {getStatusBadge(currentStatus)}
            {appointment.is_emergency ? (
              <span className="bg-rose-500/90 text-white text-xs font-black px-2.5 py-0.5 rounded-full uppercase">Emergency</span>
            ) : null}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {feedbackMsg && (
            <div className={`p-3 rounded-xl text-xs font-bold ${feedbackMsg.includes('Failed') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {feedbackMsg}
            </div>
          )}

          {/* Patient Card */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Patient Information</h4>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                {(appointment.patient_name || 'Patient').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800">{appointment.patient_name || 'Patient'}</h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  {appointment.patient_age && <span>{appointment.patient_age} yrs</span>}
                  {appointment.patient_gender && (
                    <>
                      <span>•</span>
                      <span>{appointment.patient_gender === 'M' ? 'Male' : appointment.patient_gender === 'F' ? 'Female' : 'Other'}</span>
                    </>
                  )}
                  {appointment.compliance_score !== undefined && (
                    <>
                      <span>•</span>
                      <span className="font-bold text-emerald-600">Compliance: {appointment.compliance_score}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-indigo-500" />
                <span className="font-mono font-bold">{appointment.patient_phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4 text-indigo-500" />
                <span className="font-medium truncate">{appointment.patient_email || 'No email provided'}</span>
              </div>
              {appointment.patient_address && (
                <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium">{appointment.patient_address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Schedule Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">Appointment Date</span>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>{appointment.appointment_date}</span>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">Appointment Time</span>
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="font-mono">{appointment.formatted_time || appointment.appointment_time?.slice(0, 5) || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* AI Triage Notes if available */}
          {appointment.symptoms_medical && (
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-4 rounded-2xl border border-violet-100 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-800">
                <BrainCircuit className="w-4 h-4 text-violet-600" />
                <span>AI Clinical Pre-Assessment</span>
              </div>
              {appointment.symptoms_raw && (
                <p className="text-xs text-slate-600 italic">"{appointment.symptoms_raw}"</p>
              )}
              <p className="text-xs font-bold text-indigo-950 bg-white/80 p-2.5 rounded-xl border border-violet-100">
                {appointment.symptoms_medical}
              </p>
            </div>
          )}

          {/* Status Management Actions */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Update Appointment Status:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isUpdating || currentStatus === 'Confirmed'}
                onClick={() => handleUpdateStatus('Confirmed')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentStatus === 'Confirmed'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
              </button>

              <button
                type="button"
                disabled={isUpdating || currentStatus === 'Completed'}
                onClick={() => handleUpdateStatus('Completed')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentStatus === 'Completed'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete
              </button>

              <button
                type="button"
                disabled={isUpdating || currentStatus === 'Cancelled'}
                onClick={() => handleUpdateStatus('Cancelled')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentStatus === 'Cancelled'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>

          {onStartConsultation && (
            <button
              onClick={() => {
                onClose();
                onStartConsultation(appointment.patient_id);
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Open Patient Records</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default AppointmentDetailsModal;
