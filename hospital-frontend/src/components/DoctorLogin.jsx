import React, { useState } from 'react';
import { Stethoscope, Lock, Mail, KeyRound, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

const DoctorLogin = ({ onLoginSuccess, onSwitchToPatient }) => {
  const [identifier, setIdentifier] = useState(''); // Email or Doctor ID
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier || !password) {
      setError('Please provide your doctor email/ID and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.loginDoctor(identifier.trim(), password);

      // Save token and user info
      localStorage.setItem('token', res.token);
      localStorage.setItem('user_role', 'Doctor');
      localStorage.setItem('user_name', res.user.name);
      localStorage.setItem('user_id', res.user.id || res.user.doctor_id);

      if (onLoginSuccess) {
        onLoginSuccess('Doctor', res.user.id || res.user.doctor_id, res.user.name);
      }
    } catch (err) {
      console.error("Doctor Login Failed:", err);
      setError(err.message || 'Invalid credentials. Please verify your doctor ID/email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-sm border border-indigo-100">
          <Stethoscope className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-black text-slate-900">Doctor Portal Login</h3>
        <p className="text-slate-500 text-xs">Enter your registered physician credentials to access the Doctor Dashboard</p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Email or Doctor ID
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. dr.anil@pulse.com or 1"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="Enter your doctor password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold text-sm shadow-md shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? (
            <span className="animate-pulse">Authenticating Doctor...</span>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

    </div>
  );
};

export default DoctorLogin;
