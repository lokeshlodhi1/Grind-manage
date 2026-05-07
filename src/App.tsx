import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  Settings as SettingsIcon, 
  BookOpen, 
  ChefHat,
  History,
  Menu,
  X,
  Globe,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Customers from './pages/Customers';
import Services from './pages/Services';
import Ledger from './pages/Ledger';
import Settings from './pages/Settings';
import AuditLogs from './pages/AuditLogs';
import OrderDetails from './pages/OrderDetails';

import Login from './pages/Login';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('username') || '';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [storeName, setStoreName] = useState('Main Street Grinders');
  const [adminName, setAdminName] = useState('Admin User');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (data.storeName) setStoreName(data.storeName);
          if (data.adminName) setAdminName(data.adminName);
        }
      });
  }, [location.pathname]); // Re-fetch on navigation loosely ensures updates if changed in settings

  const navItems = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', path: '/pos', label: 'Order / POS', icon: ShoppingCart },
    { id: 'customers', path: '/customers', label: 'Customers', icon: Users },
    { id: 'services', path: '/services', label: 'Services', icon: ChefHat },
    { id: 'ledger', path: '/ledger', label: 'Ledger', icon: BookOpen },
    { id: 'logs', path: '/logs', label: 'Audit Logs', icon: History },
    { id: 'settings', path: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleLogin = (username: string) => {
    setIsAuthenticated(true);
    setCurrentUser(username);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', username);
    navigate('/');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    navigate('/login');
  };

  if (!isAuthenticated && location.pathname !== '/login') {
    return <Login onLogin={handleLogin} />;
  }

  if (location.pathname === '/login' && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (location.pathname === '/login' && !isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 font-sans overflow-hidden transition-colors duration-300">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-md z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Clean Modern Style */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-300 ease-in-out lg:translate-x-0 border-r border-slate-200 dark:border-slate-800",
        isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full relative overflow-hidden">
          <div className="p-8 pb-10 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <ChefHat size={22} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">InApp<span className="text-primary tracking-normal">.</span></h1>
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1.5 font-sans">Business Manager</p>
              </div>
            </div>
            <button 
              className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-all"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 relative z-10 custom-scrollbar overflow-y-auto">
            <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider mb-4 ml-4">Main Menu</div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all group relative",
                    isActive
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon size={18} className={cn(
                    "transition-transform",
                    isActive ? "text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                  )} />
                  <span className="relative z-10 font-sans">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-6 relative z-10">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mb-3 shadow-sm">
                <Globe size={18} className="text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">System Status</p>
              <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-200 mt-1">Version 2.4 Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <button 
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span className="text-slate-900 dark:text-slate-100">{adminName}</span>
              <span className="text-slate-300 dark:text-slate-700">/</span>
              <span className="text-slate-500 dark:text-slate-400 capitalize">{location.pathname.split('/')[1] || 'Dashboard'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="text-right hidden sm:block pr-6 border-r border-slate-200 dark:border-slate-800">
                 <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold leading-none mb-1">Operating as</div>
                 <div className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{storeName}</div>
              </div>
              <div className="flex items-center gap-3 cursor-pointer group" onClick={handleLogout}>
                 <div className="w-9 h-9 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {adminName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                 </div>
                 <div className="hidden md:block">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{adminName}</p>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-colors">Logout Account</p>
                 </div>
              </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-slate-50/30 dark:bg-slate-950/30">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/services" element={<Services />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/ledger/:customerId" element={<Ledger />} />
              <Route path="/logs" element={<AuditLogs />} />
              <Route path="/order/:id" element={<OrderDetails />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
            </Routes>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
