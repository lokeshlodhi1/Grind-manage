import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'framer-motion';

const data = [
  { name: 'Mon', revenue: 4000, credit: 2400 },
  { name: 'Tue', revenue: 3000, credit: 1398 },
  { name: 'Wed', revenue: 2000, credit: 9800 },
  { name: 'Thu', revenue: 2780, credit: 3908 },
  { name: 'Fri', revenue: 1890, credit: 4800 },
  { name: 'Sat', revenue: 2390, credit: 3800 },
  { name: 'Sun', revenue: 3490, credit: 4300 },
];

export default function Dashboard() {
  const [stats, setStats] = useState({
    dailyRevenue: 0,
    totalCreditOutstanding: 0,
    totalOrders: 0,
    totalCustomers: 0
  });

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setStats(data))
      .catch(err => console.error("Stats Fetch Error:", err));
  }, []);

  const cards = [
    { 
      label: 'Portfolio Yield', 
      value: formatCurrency(stats.dailyRevenue), 
      icon: TrendingUp, 
      color: 'bg-primary/10 text-primary',
      change: '+12.5%',
      up: true,
      description: 'Daily Revenue'
    },
    { 
      label: 'Exposure Index', 
      value: formatCurrency(stats.totalCreditOutstanding), 
      icon: CreditCard, 
      color: 'bg-rose-50 text-rose-600',
      change: '+2.4%',
      up: false,
      description: 'Credit Outstanding'
    },
    { 
      label: 'Active Entities', 
      value: stats.totalCustomers.toString(), 
      icon: Users, 
      color: 'bg-emerald-50 text-emerald-600',
      change: '+4 Registered',
      up: true,
      description: 'Total Customers'
    },
    { 
      label: 'Transaction Vol', 
      value: stats.totalOrders.toString(), 
      icon: Clock, 
      color: 'bg-slate-100 text-slate-600',
      change: '+18 Sessions',
      up: true,
      description: 'Total Orders'
    },
  ];

  return (
    <div className="space-y-12 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Business Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Real-time analytics and system status
          </p>
        </div>
        <button 
          onClick={() => fetch('/api/ledger/calculate-interest', { method: 'POST' })}
          className="theme-button-primary"
        >
          <Clock size={18} />
          Sync Data
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={card.label} 
            className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
          >
            <div className="flex items-start justify-between relative z-10">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 transition-all", card.color, "dark:bg-slate-800/50 dark:border-slate-700")}>
                <card.icon size={22} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-tight",
                card.up ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400"
              )}>
                {card.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {card.change}
              </div>
            </div>
            <div className="mt-6 relative z-10">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{card.value}</p>
              <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                {card.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
               <h3 className="font-bold text-slate-900 dark:text-white text-xl tracking-tight">Performance Overview</h3>
               <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-primary"></span>
                 Revenue vs Outstanding Credit
               </p>
            </div>
            <div className="flex gap-4 bg-slate-50 dark:bg-slate-800 p-2 px-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Yield</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Risk</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9'} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  tickFormatter={(val) => `₹${val/1000}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                    padding: '12px',
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#0f172a' : '#fff',
                    color: document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a'
                  }}
                  itemStyle={{ fontWeight: 700, fontSize: '12px' }}
                  labelStyle={{ fontWeight: 700, color: '#64748b', marginBottom: '4px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="credit" stroke="#fb7185" strokeWidth={2} fillOpacity={0} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 dark:text-white text-xl tracking-tight">Security Alerts</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Outstanding collections required</p>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
            {[
              { user: 'Suresh Kumar', amount: 4500, days: 12 },
              { user: 'Rajesh Patil', amount: 1200, days: 45 },
              { user: 'Anita Devi', amount: 890, days: 8 }
            ].map((alert, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all group cursor-pointer">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm font-bold",
                  alert.days > 30 ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                )}>
                  <AlertCircle size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{alert.user}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatCurrency(alert.amount)}</span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      alert.days > 30 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
                    )}>{alert.days}d delay</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="theme-button-primary w-full mt-8">
            Audit Ledger
          </button>
        </div>
      </div>
    </div>
  );
}
