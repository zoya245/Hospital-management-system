import React, { useState, useEffect } from 'react';
import { 
  LogOut, LogIn, Sparkles, Users, Stethoscope, Building2, 
  HeartPulse, ChevronRight, LayoutDashboard, Home, User
} from 'lucide-react';

import { api } from './services/api'; 

import Notification from './components/Notification';
import Modal from './components/Modal';
import StaffLogin from './components/StaffLogin';
import DoctorLogin from './components/DoctorLogin';
import PatientLogin from './components/PatientLogin';
import LoadingSpinner from './components/LoadingSpinner'; 

import HomePage from './pages/HomePage';
import DoctorsPage from './pages/DoctorsPage';
import PatientDashboard from './pages/PatientDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

import { MOCK_DATA, getDoctorName } from './mockData';

const USER_ROLES = {
  HOME: 'Home',
  PATIENT: 'Patient',
  RECEPTIONIST: 'Receptionist',
  DOCTOR: 'Doctor'
};

const getInitialUserState = () => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('user_name');
    const id = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role');

    if (token && id && role) {
        return { role: role, id: parseInt(id, 10), name: name };
    }
    return { role: USER_ROLES.HOME, id: null, name: 'Guest' };
};

const App = () => {
  const [currentUser, setCurrentUser] = useState(getInitialUserState());
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'home'
  const [notification, setNotification] = useState(null);
  
  // Auth Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginTargetRole, setLoginTargetRole] = useState('Patient'); // 'Patient' | 'Doctor' | 'Receptionist'
  const [loginInitialTab, setLoginInitialTab] = useState('signin'); // 'signin' | 'register'
  
  const [isAppLoading, setIsAppLoading] = useState(true);

  const [data, setData] = useState({
    patients: [], 
    doctors: [], 
    appointments: [], 
    departments: MOCK_DATA.departments,
    medicines: MOCK_DATA.medicines,
  });

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Smart Data Fetching on role change
  useEffect(() => {
    const loadSecureData = async () => {
      if (currentUser.role === USER_ROLES.HOME) {
          setIsAppLoading(false);
          return;
      }

      setIsAppLoading(true);
      try {
        const [patients, appointments, doctors] = await Promise.all([
          api.patients.getAll(),
          api.appointments.getAll(),
          api.doctors.getAll()
        ]);
        
        setData(prev => ({ 
          ...prev, 
          patients: patients, 
          appointments: appointments,
          doctors: doctors 
        }));
      } catch (error) {
        console.error("Data load failed:", error);
        
        if (error.message && (error.message.includes('Token') || error.message.includes('Access Denied'))) {
            showNotification("Your session expired. Please log in again.", "error");
            handleLogout();
        } else {
            showNotification("Failed to connect to the server.", "error");
        }
      } finally {
        setTimeout(() => setIsAppLoading(false), 400);
      }
    };

    loadSecureData();
  }, [currentUser.role]);

  const handleScheduleAppointment = (newAppointment) => {
    setData(prevData => ({
      ...prevData,
      appointments: [...prevData.appointments, newAppointment]
    }));
    showNotification(
      `Appointment scheduled for ${newAppointment.appointment_date} with ${getDoctorName(newAppointment.doctor_id)}`,
      'success'
    );
  };

  const handleOpenAuthModal = (role = 'Patient', initialTab = 'signin') => {
    setLoginTargetRole(role);
    setLoginInitialTab(initialTab);
    setIsLoginModalOpen(true);
  };

  const handleLogout = () => {
    setCurrentUser({ role: USER_ROLES.HOME, id: null, name: 'Guest' });
    setActiveView('dashboard');
    localStorage.clear();
    showNotification('You have been logged out.', 'info');
  };

  const handleLoginSuccess = (role, id, name) => {
    setCurrentUser({ role, id, name });
    setActiveView('dashboard');
    setIsLoginModalOpen(false);
    showNotification(`Welcome back, ${name}!`, 'success');
  };

  const handleRegister = (newPatientFromApi) => {
    setData(prevData => ({
      ...prevData,
      patients: [...prevData.patients, newPatientFromApi]
    }));
    handleLoginSuccess('Patient', newPatientFromApi.patient_id, newPatientFromApi.name);
    showNotification('Registration successful! Welcome to Pulse HMS.', 'success');
  };

  const handleNavigateToSection = (sectionId) => {
    if (activeView !== 'home') {
      setActiveView('home');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderLoginModal = () => {
    if (!isLoginModalOpen) return null;
    const onClose = () => {
      setIsLoginModalOpen(false);
    };

    const targetRole = loginTargetRole || 'Patient';

    return (
      <Modal onClose={onClose} maxWidth="max-w-lg">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/80">
              Pulse HMS Security Gateway
            </span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">Choose Portal Access</h3>
            <p className="text-slate-500 text-xs">Switch between patient, doctor, or staff login instantly</p>
          </div>

          {/* Interactive Role Switcher Tabs */}
          <div className="grid grid-cols-3 bg-slate-100/80 p-1.5 rounded-2xl gap-1.5 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setLoginTargetRole('Patient');
                setLoginInitialTab('signin');
              }}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                targetRole === 'Patient'
                  ? 'bg-white text-indigo-700 shadow-md shadow-indigo-100 font-extrabold scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4 text-indigo-600" />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginTargetRole('Doctor')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                targetRole === 'Doctor'
                  ? 'bg-white text-violet-700 shadow-md shadow-violet-100 font-extrabold scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-violet-600" />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginTargetRole('Receptionist')}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                targetRole === 'Receptionist'
                  ? 'bg-white text-emerald-700 shadow-md shadow-emerald-100 font-extrabold scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Staff</span>
            </button>
          </div>

          {/* Form Content based on Role */}
          <div className="pt-1">
            {targetRole === 'Patient' && (
              <PatientLogin 
                onLoginSuccess={handleLoginSuccess} 
                onRegister={handleRegister} 
                initialTab={loginInitialTab} 
              />
            )}
            {targetRole === 'Doctor' && (
              <DoctorLogin 
                onLoginSuccess={handleLoginSuccess} 
              />
            )}
            {targetRole === 'Receptionist' && (
              <StaffLogin 
                role="Receptionist" 
                onLoginSuccess={handleLoginSuccess} 
              />
            )}
          </div>
        </div>
      </Modal>
    );
  };

  const renderDashboard = () => {
    // If user is currently on the Doctors Page
    if (activeView === 'doctors') {
      return (
        <DoctorsPage 
          onOpenAuth={handleOpenAuthModal}
          isPatientLoggedIn={currentUser.role === USER_ROLES.PATIENT}
          onBookDoctor={(docId) => {
            if (currentUser.role === USER_ROLES.PATIENT) {
              setActiveView('dashboard');
            } else {
              handleOpenAuthModal('Patient', 'signin');
            }
          }}
        />
      );
    }

    // If user is doctor: strictly show Doctor Dashboard (Doctor-only pages)
    if (currentUser.role === USER_ROLES.DOCTOR) {
      return <DoctorDashboard userId={currentUser.id} data={data} />;
    }

    // If user is guest or explicitly toggled to home view
    if (currentUser.role === USER_ROLES.HOME || activeView === 'home') {
      return <HomePage onOpenAuth={handleOpenAuthModal} />;
    }

    switch (currentUser.role) {
      case USER_ROLES.PATIENT:
        return <PatientDashboard userId={currentUser.id} data={data} onSchedule={handleScheduleAppointment} onUpdate={setData} />;
      case USER_ROLES.RECEPTIONIST:
        return <ReceptionistDashboard data={data} onUpdate={setData} />;
      default:
        return <HomePage onOpenAuth={handleOpenAuthModal} />;
    }
  };

  if (isAppLoading) {
    return <LoadingSpinner />;
  }

  const isGuest = currentUser.role === USER_ROLES.HOME;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {renderLoginModal()}

      {/* BACKGROUND DECORATIVE GLOW ORBS */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[25%] -right-[10%] w-[65%] h-[65%] rounded-full bg-gradient-to-br from-indigo-200/40 to-purple-200/30 blur-3xl opacity-70"></div>
        <div className="absolute top-[35%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-200/40 to-teal-100/30 blur-3xl opacity-60"></div>
        <div className="absolute -bottom-[20%] right-[20%] w-[45%] h-[45%] rounded-full bg-pink-100/30 blur-3xl opacity-50"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* GLASS NAVBAR */}
        <header className="sticky top-4 z-40 bg-white/80 backdrop-blur-2xl border border-white/60 shadow-lg shadow-slate-200/40 rounded-3xl p-4 mb-8 flex flex-col md:flex-row justify-between items-center gap-4 transition-all duration-300">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActiveView('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-200">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-900 tracking-tight leading-none">
                Pulse<span className="text-indigo-400 font-light">HMS</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Healthcare Reimagined</p>
            </div>
          </div>

          {/* Public / Logged In Navigation */}
          {isGuest ? (
            /* PUBLIC USER NAVBAR: FEATURES + DOCTORS + SIGN IN / SIGN UP BUTTONS */
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
              <button
                onClick={() => setActiveView('home')}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer ${
                  activeView === 'home' ? 'text-indigo-600 bg-indigo-50/80 font-extrabold' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80'
                }`}
              >
                Home
              </button>

              <button
                onClick={() => setActiveView('doctors')}
                className={`text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'doctors' ? 'text-indigo-600 bg-indigo-50/80 font-extrabold' : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-100/80'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                <span>Doctors & Timings</span>
              </button>

              <button 
                onClick={() => handleNavigateToSection('features')}
                className="hidden lg:inline-block text-xs font-bold text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-xl hover:bg-slate-100/80 transition cursor-pointer"
              >
                Features
              </button>
              <button 
                onClick={() => handleNavigateToSection('departments')}
                className="hidden lg:inline-block text-xs font-bold text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-xl hover:bg-slate-100/80 transition cursor-pointer"
              >
                Specialties
              </button>
              <button 
                onClick={() => handleNavigateToSection('emergency')}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100/80 px-3 py-2 rounded-xl border border-rose-200/60 transition cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                24/7 Emergency
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block mx-1"></div>

              {/* SIGN IN BUTTON */}
              <button
                onClick={() => handleOpenAuthModal('Patient', 'signin')}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <LogIn className="w-4 h-4 text-indigo-600" />
                <span>Sign In</span>
              </button>

              {/* SIGN UP / BOOK APPOINTMENT CTA BUTTON */}
              <button
                onClick={() => handleOpenAuthModal('Patient', 'register')}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Sign Up / Book</span>
              </button>
            </div>
          ) : (
            /* LOGGED IN USER NAVBAR: ACTIVE ROLE PILL + DASHBOARD/HOME TOGGLE + LOGOUT */
            <div className="flex items-center gap-3 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/50 flex-wrap justify-center">
              
              {/* Role Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100 text-xs font-bold text-slate-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>{currentUser.role} Portal</span>
              </div>

              <span className="text-xs font-bold text-slate-700 hidden sm:inline px-2">
                Hi, {currentUser.name}
              </span>

              {/* Patient: View Doctors & Availability Timings */}
              {currentUser.role === USER_ROLES.PATIENT && (
                <button
                  onClick={() => setActiveView(activeView === 'doctors' ? 'dashboard' : 'doctors')}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>{activeView === 'doctors' ? 'My Dashboard' : 'Specialists & Timings'}</span>
                </button>
              )}

              {/* View Switcher: Dashboard vs Home Overview (Only for Patient & Receptionist) */}
              {currentUser.role !== USER_ROLES.DOCTOR && (
                <button
                  onClick={() => setActiveView(activeView === 'dashboard' ? 'home' : 'dashboard')}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {activeView === 'dashboard' ? (
                    <>
                      <Home className="w-3.5 h-3.5" />
                      <span>View Home</span>
                    </>
                  ) : (
                    <>
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Open Dashboard</span>
                    </>
                  )}
                </button>
              )}

              {/* Logout Button */}
              <button 
                onClick={handleLogout} 
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer" 
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

        </header>

        {/* MAIN BODY */}
        <main className="animate-fade-in">
          {renderDashboard()}
        </main>
      </div>
    </div>
  );
};

export default App;