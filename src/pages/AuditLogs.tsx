import React, { useState, useEffect } from 'react';
import { History, Search, Filter } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { AuditLog } from '../types';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/logs').then(res => res.ok ? res.json() : []).then(setLogs);
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) || 
    l.module.toLowerCase().includes(search.toLowerCase())
  ).reverse();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <h2 className="page-title">Audit Logs</h2>
          <p className="page-subtitle text-slate-500">Comprehensive trail of all system activities and transactions.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
           <button className="px-5 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg text-xs font-bold shadow-sm transition-all border border-slate-200/50 dark:border-slate-700/50">All Activity</button>
           <button className="px-5 py-2 bg-transparent text-slate-500 dark:text-slate-400 rounded-lg text-xs font-bold hover:text-slate-900 dark:hover:text-white transition-all">Anomalies</button>
        </div>
      </div>

      <div className="theme-card overflow-hidden flex flex-col min-h-[600px] border border-slate-200 dark:border-slate-800">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/30 dark:bg-slate-800/30">
           <div className="relative flex-1 max-w-md">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                className="theme-input pl-14 pr-5 py-3.5"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
           <div className="flex items-center gap-4">
              <button className="theme-button-secondary">
                 <Filter size={16} />
                 Filter
              </button>
              <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Total Entries: {filteredLogs.length}</p>
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar px-8">
           <table className="w-full text-left">
              <thead>
                 <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 pr-8">Timestamp</th>
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 pr-8">Module</th>
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 pr-8">Action</th>
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500">Payload</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                 {filteredLogs.map(log => (
                    <tr key={log.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                       <td className="py-5 pr-8">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{formatDate(log.timestamp)}</p>
                          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</p>
                       </td>
                       <td className="py-5 pr-8">
                          <span className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all inline-block",
                            log.module === 'ORDERS' ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50" :
                            log.module === 'SERVICES' ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50" :
                            "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700"
                          )}>
                             {log.module}
                          </span>
                       </td>
                       <td className="py-5 pr-8">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{log.action}</p>
                       </td>
                       <td className="py-5">
                          <div className="max-w-xs xl:max-w-md">
                             <div className="bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-4 py-3 font-mono text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-all truncate">
                                {JSON.stringify(log.data)}
                             </div>
                          </div>
                       </td>
                    </tr>
                 ))}
                 {filteredLogs.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-32 text-center text-slate-300 dark:text-slate-700">
                          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                             <History size={32} />
                          </div>
                          <p className="font-bold text-slate-400 dark:text-slate-600 text-sm">No activity logs found</p>
                       </td>
                    </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}
