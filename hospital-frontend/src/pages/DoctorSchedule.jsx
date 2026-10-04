import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, User, CheckCircle2, XCircle, Search, 
  Filter, ArrowRight, RefreshCw, AlertCircle, Phone, Mail 
} from 'lucide-react';
import Card from '../components/Card';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import { api } from '../services/api';

const DoctorSchedule = ({ doctorId, onStartConsultation }) => {
  const [scheduleData, setScheduleData] = useState({
    all: [], today: [], upcoming: [], completed: [], cancelled: [], total: 0
  });
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'today' | 'upcoming' | 'completed' | 'cancelled'
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const fetchSchedule = async () => {
    setIsLoading(true);
    try {
      const data = await api.doctors.getSchedule(doctorId);
      setScheduleData(data);
    } catch (err) {
      console.error("Failed to load doctor schedule:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId) fetchSchedule();
  }, [doctorId]);

  // Filter appointments based on active tab, search, and selected date
  const filteredList = useMemo(() => {
    let list = scheduleData[activeTab] || scheduleData.all || [];

    if (selectedDate) {
      list = list.filter(a => a.appointment_date === selectedDate);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(a => 
        (a.patient_name && a.patient_name.toLowerCase().includes(term)) ||
        (a.patient_phone && a.patient_phone.includes(term))
      );
    }

    return list;
  }, [scheduleData, activeTab, selectedDate, searchTerm]);

  const handleStatusUpdated = (appId, newStatus) => {
    setScheduleData(prev => {
      const updateList = (list) => list.map(a => a.appointment_id === appId ? { ...a, status: newStatus } : a);
      return {
        ...prev,
        all: updateList(prev.all),
        today: updateList(prev.today),
        upcoming: updateList(prev.upcoming),
        completed: updateList(prev.completed),
        cancelled: updateList(prev.cancelled)
      };
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">Confirmed</span>;
      case 'Completed':
        return <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">Completed</span>;
      case 'Cancelled':
        return <span className="bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">Cancelled</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">Scheduled</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-2 border border-indigo-400/30">
            <Calendar className="w-3.5 h-3.5" />
            <span>Doctor Consultation Schedule</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Clinical Appointment Schedule</h2>
          <p className="mt-1 text-slate-300 text-sm max-w-xl">
            Track and manage your daily consultations, upcoming sessions, and completed records. Click any appointment to view vitals or change status.
          </p>
        </div>

        <button 
          onClick={fetchSchedule}
          className="relative z-10 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-white/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Sync Schedule</span>
        </button>
      </div>

      {/* Tabs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
        {[
          { key: 'all', label: 'All Sessions', count: scheduleData.all?.length || 0 },
          { key: 'today', label: "Today's Schedule", count: scheduleData.today?.length || 0 },
          { key: 'upcoming', label: 'Upcoming', count: scheduleData.upcoming?.length || 0 },
          { key: 'completed', label: 'Completed', count: scheduleData.completed?.length || 0 },
          { key: 'cancelled', label: 'Cancelled', count: scheduleData.cancelled?.length || 0 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm font-extrabold scale-[1.01]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${activeTab === tab.key ? 'bg-indigo-50 text-indigo-700 font-bold' : 'bg-slate-200 text-slate-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Date Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search patient name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Date:</span>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 outline-none"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Appointment Schedule List */}
      <Card title={`Consultation Timeline (${filteredList.length})`} icon={Clock}>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl"></div>)}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700">No appointments found in this view.</p>
            <p className="text-xs text-slate-400 mt-1">Check other tabs or remove filter criteria to see more sessions.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredList.map(appt => (
              <div
                key={appt.appointment_id}
                onClick={() => setSelectedAppointment(appt)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md ${
                  appt.is_emergency 
                    ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300' 
                    : 'bg-white border-slate-200/80 hover:border-indigo-300'
                }`}
              >
                {/* Left: Time and Patient Info formatted like "10:00 AM → Rahul → Confirmed" */}
                <div className="flex items-center gap-4">
                  <div className="px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-black text-sm shrink-0 flex items-center gap-1.5 shadow-sm">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{appt.formatted_time || appt.appointment_time?.slice(0, 5) || '10:00 AM'}</span>
                  </div>

                  <div className="hidden sm:block text-slate-300 font-black">→</div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 text-base">{appt.patient_name}</h4>
                      {appt.is_emergency && (
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          EMERGENCY
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {appt.appointment_date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {appt.patient_phone || 'N/A'}
                      </span>
                      {appt.patient_age && (
                        <>
                          <span>•</span>
                          <span>{appt.patient_age} yrs ({appt.patient_gender || 'O'})</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Status and Details trigger */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="hidden sm:block text-slate-300 font-black">→</div>
                  {getStatusBadge(appt.status)}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAppointment(appt);
                    }}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-200/60 transition cursor-pointer"
                    title="View Appointment Details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onStatusUpdated={handleStatusUpdated}
          onStartConsultation={onStartConsultation}
        />
      )}

    </div>
  );
};

export default DoctorSchedule;
