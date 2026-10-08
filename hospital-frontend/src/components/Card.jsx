import React from 'react';

const Card = ({ title, icon: Icon, children, className = '', action }) => (
  <div className={`bg-white rounded-3xl shadow-xs border border-slate-200/70 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300/80 ${className}`}>
    {(title || Icon) && (
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shadow-2xs border border-indigo-100/60">
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