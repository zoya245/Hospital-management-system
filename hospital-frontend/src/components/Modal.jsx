import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ children, onClose, maxWidth = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"></div>
    <div 
      className={`relative bg-white rounded-3xl shadow-2xl w-full ${maxWidth} my-8 overflow-hidden animate-fade-in border border-slate-100 transform transition-all scale-100 z-10`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={onClose} 
          className="p-2.5 rounded-full bg-slate-100/80 text-slate-500 hover:bg-rose-50 hover:text-rose-500 hover:rotate-90 transition-all duration-200"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

export default Modal;