import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Star, Clock, Calendar, Search, 
  ArrowRight, ShieldCheck, Award, HeartPulse, Building2 
} from 'lucide-react';
import { api } from '../services/api';

const DoctorsPage = ({ onBookDoctor, onOpenAuth, isPatientLoggedIn }) => {
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');

  useEffect(() => {
    const fetchDoctors = async () => {
      setIsLoading(true);
      try {
        const data = await api.doctors.getAll();
        setDoctors(data);
      } catch (err) {
        console.error("Failed to load doctors:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  const specialties = ['All', ...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  const filteredDoctors = doctors.filter(doc => {
    const matchSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        doc.specialization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSpecialty = selectedSpecialty === 'All' || doc.specialization === selectedSpecialty;
    return matchSearch && matchSpecialty;
  });

  const handleBookClick = (doctorId) => {
    if (isPatientLoggedIn) {
      if (onBookDoctor) onBookDoctor(doctorId);
    } else {
      if (onOpenAuth) onOpenAuth('Patient', 'signin');
    }
  };

  return (
    <div className="space-y-12 py-4 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-400/30">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Physicians & Specialists</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Meet Our World-Class Medical Specialists
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Browse our directory of board-certified clinicians, examine their active consultation timings, and reserve your consultation slot instantly.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search physician or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        {/* Specialty Filter Pills */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {specialties.map(spec => (
            <button
              key={spec}
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedSpecialty === spec
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-100 rounded-3xl"></div>
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <Stethoscope className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-700">No doctors found matching your criteria.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the specialty filter or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredDoctors.map(doc => (
            <div 
              key={doc.doctor_id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                
                {/* Header with Avatar & Rating */}
                <div className="flex items-start justify-between">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
                    {doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200/60 text-amber-700 font-extrabold text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{doc.average_rating || '4.9'}</span>
                    <span className="text-[10px] text-amber-600/80 font-normal">({doc.total_ratings || 1})</span>
                  </div>
                </div>

                {/* Doctor Name & Specialization */}
                <div>
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-md border border-indigo-100">
                      {doc.specialization}
                    </span>
                    {doc.department_name && (
                      <span className="text-xs text-slate-400 font-medium">
                        • {doc.department_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Available Timings */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Available Consultation Timings
                  </span>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    {doc.available_timings || 'Mon – Fri: 10:00 AM – 1:00 PM'}
                  </p>
                </div>

              </div>

              {/* Action Button */}
              <div className="pt-6 border-t border-slate-100 mt-6">
                <button
                  onClick={() => handleBookClick(doc.doctor_id)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:gap-3"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Consultation Slot</span>
                  <ArrowRight className="w-4 h-4 transition-transform" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default DoctorsPage;
