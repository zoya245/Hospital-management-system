import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Plus, Trash2, Edit2, CheckCircle2, 
  AlertCircle, Sparkles, RefreshCw, X, ChevronRight, Layers 
} from 'lucide-react';
import Card from './Card';
import { api } from '../services/api';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const SLOT_DURATIONS = [
  { value: 15, label: '15 Minutes' },
  { value: 30, label: '30 Minutes (Recommended)' },
  { value: 45, label: '45 Minutes' },
  { value: 60, label: '60 Minutes (1 Hour)' },
];

const ManageAvailability = ({ doctorId }) => {
  const [availabilities, setAvailabilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Form State
  const [scheduleType, setScheduleType] = useState('day'); // 'day' | 'date'
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [specificDate, setSpecificDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [slotDuration, setSlotDuration] = useState(30);

  // Edit State
  const [editingItem, setEditingItem] = useState(null);

  const showMsg = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAvailability = async () => {
    setIsLoading(true);
    try {
      const data = await api.doctors.getAvailability(doctorId);
      setAvailabilities(data);
    } catch (err) {
      console.error("Failed to load availability:", err);
      showMsg("Failed to load availability schedules.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId) fetchAvailability();
  }, [doctorId]);

  // Calculate estimated slots preview
  const calculatePreviewSlots = (start, end, duration) => {
    if (!start || !end) return [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (startMins >= endMins) return [];

    const count = Math.floor((endMins - startMins) / duration);
    return Array.from({ length: Math.min(count, 12) }, (_, i) => {
      const s = startMins + i * duration;
      const e = s + duration;
      const sH = Math.floor(s / 60);
      const sM = s % 60;
      const eH = Math.floor(e / 60);
      const eM = e % 60;
      const format = (h, m) => {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
      };
      return `${format(sH, sM)} – ${format(eH, eM)}`;
    });
  };

  const previewSlots = calculatePreviewSlots(startTime, endTime, slotDuration);

  const handleAddAvailability = async (e) => {
    e.preventDefault();
    if (!startTime || !endTime) return;

    if (scheduleType === 'date' && !specificDate) {
      showMsg("Please select a specific date.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        day_of_week: scheduleType === 'day' ? selectedDay : null,
        specific_date: scheduleType === 'date' ? specificDate : null,
        start_time: startTime,
        end_time: endTime,
        slot_duration: parseInt(slotDuration, 10),
      };

      await api.doctors.addAvailability(doctorId, payload);
      showMsg("Availability window created successfully!");
      fetchAvailability();
    } catch (err) {
      console.error(err);
      showMsg(err.message || "Failed to create availability.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (availId) => {
    if (!window.confirm("Are you sure you want to remove this availability window?")) return;
    try {
      await api.doctors.deleteAvailability(doctorId, availId);
      showMsg("Availability window deleted.");
      setAvailabilities(prev => prev.filter(a => a.availability_id !== availId));
    } catch (err) {
      showMsg("Failed to delete availability.", "error");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      await api.doctors.updateAvailability(doctorId, editingItem.availability_id, {
        day_of_week: editingItem.day_of_week,
        specific_date: editingItem.specific_date,
        start_time: editingItem.start_time,
        end_time: editingItem.end_time,
        slot_duration: parseInt(editingItem.slot_duration, 10),
        status: editingItem.status
      });
      showMsg("Availability updated successfully.");
      setEditingItem(null);
      fetchAvailability();
    } catch (err) {
      showMsg("Failed to update availability.", "error");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-md">
            <Clock className="w-3.5 h-3.5" />
            <span>Consultation Times Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Manage Your Availability</h2>
          <p className="mt-1 text-indigo-100 text-sm max-w-xl">
            Configure your active clinic hours. Patients will automatically see and book 30-minute consultation slots based on the schedule you define here.
          </p>
        </div>

        <button 
          onClick={fetchAvailability}
          className="relative z-10 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-white/20"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-2 ${notification.type === 'error' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {notification.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ADD AVAILABILITY FORM */}
        <div className="lg:col-span-5 space-y-6">
          <Card title="Add Consultation Availability" icon={Plus}>
            <form onSubmit={handleAddAvailability} className="space-y-5">
              
              {/* Toggle Day of Week vs Specific Date */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Schedule Scope</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setScheduleType('day')}
                    className={`py-2 text-xs font-extrabold rounded-lg transition cursor-pointer ${scheduleType === 'day' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Recurring Day (e.g. Monday)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleType('date')}
                    className={`py-2 text-xs font-extrabold rounded-lg transition cursor-pointer ${scheduleType === 'date' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Specific Date
                  </button>
                </div>
              </div>

              {/* Day Selector or Date Picker */}
              {scheduleType === 'day' ? (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Day of Week</label>
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Specific Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    required
                  />
                </div>
              )}

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition font-mono"
                    required
                  />
                </div>
              </div>

              {/* Slot Duration */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Consultation Slot Duration</label>
                <select
                  value={slotDuration}
                  onChange={(e) => setSlotDuration(Number(e.target.value))}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  {SLOT_DURATIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Real-time Generated Slots Preview */}
              {previewSlots.length > 0 && (
                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Generated Slots Preview ({previewSlots.length} slots)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {previewSlots.map((slot, idx) => (
                      <span key={idx} className="bg-white text-[11px] font-mono font-semibold text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 text-center">
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Slots...' : 'Publish Availability'}</span>
              </button>

            </form>
          </Card>
        </div>

        {/* RIGHT COLUMN: CURRENT AVAILABILITY LIST */}
        <div className="lg:col-span-7 space-y-6">
          <Card title={`Active Availability Windows (${availabilities.length})`} icon={Calendar}>
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>)}
              </div>
            ) : availabilities.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-700">No availability windows configured yet.</p>
                <p className="text-xs text-slate-400 mt-1">Use the form on the left to set your consultation hours for patients.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availabilities.map(item => (
                  <div 
                    key={item.availability_id}
                    className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-100">
                        {item.day_of_week ? item.day_of_week.slice(0, 3).toUpperCase() : 'DATE'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-900 text-sm">
                            {item.day_of_week || `Date: ${item.specific_date}`}
                          </h4>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                            {item.status || 'Active'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-1">
                          <span className="flex items-center gap-1 font-bold text-indigo-700">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            {item.start_time_formatted} – {item.end_time_formatted}
                          </span>
                          <span>•</span>
                          <span>{item.slot_duration || 30} min slots</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition cursor-pointer"
                        title="Edit Availability"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.availability_id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Delete Availability"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">Edit Availability</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Day / Date</label>
                {editingItem.day_of_week ? (
                  <select
                    value={editingItem.day_of_week}
                    onChange={(e) => setEditingItem({ ...editingItem, day_of_week: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold"
                  >
                    {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input
                    type="date"
                    value={editingItem.specific_date || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, specific_date: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editingItem.start_time?.slice(0, 5) || '10:00'}
                    onChange={(e) => setEditingItem({ ...editingItem, start_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">End Time</label>
                  <input
                    type="time"
                    value={editingItem.end_time?.slice(0, 5) || '13:00'}
                    onChange={(e) => setEditingItem({ ...editingItem, end_time: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Slot Duration</label>
                <select
                  value={editingItem.slot_duration || 30}
                  onChange={(e) => setEditingItem({ ...editingItem, slot_duration: Number(e.target.value) })}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-semibold"
                >
                  {SLOT_DURATIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageAvailability;
