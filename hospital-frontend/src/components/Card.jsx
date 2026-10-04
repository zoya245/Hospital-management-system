import React from 'react';

const Card = ({ title, icon: Icon, children, className = '', action }) => (
  <div className={`bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),0_10px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-slate-200/60 ${className}`}>
    {(title || Icon) && (
      <div className="px-6 py-5 border-b border-slate-100/80 flex justify-between items-center bg-white/90">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100/50">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    <div className="p-6">
      {children}
    </div>
  </div>
);

export default Card;