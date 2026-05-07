import React, { useState, useEffect } from 'react';
import { Save, Store, Percent, Globe, Bell, Receipt, Plus, Trash2, Download, FileSpreadsheet, X, User, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { StoreSettings, Tax } from '../types';
import { cn } from '../lib/utils';

export default function Settings() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'taxes' | 'export' | 'integration' | 'users'>('general');
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [userModal, setUserModal] = useState({ open: false, user: null as any });
  const [formData, setFormData] = useState({ username: '', password: '', role: 'USER' });

  const exportToExcel = async (type: 'orders' | 'customers' | 'ledger') => {
    setIsExporting(type);
    try {
      const res = await fetch(`/api/${type}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
      
      XLSX.writeFile(wb, `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(null);
    }
  };

  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Partial<Tax> | null>(null);

  useEffect(() => {
    fetch('/api/settings').then(res => res.ok ? res.json() : null).then(data => data && setSettings(data));
    fetch('/api/taxes').then(res => res.ok ? res.json() : []).then(setTaxes);
    fetch('/api/users').then(res => res.ok ? res.json() : []).then(setUsers);
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  const openTaxModal = (tax?: Tax) => {
    setEditingTax(tax || { name: '', rate: 0, isEnabled: true });
    setIsTaxModalOpen(true);
  };

  const handleSaveTax = async () => {
    if (!editingTax?.name) return;

    const method = editingTax.id ? 'PUT' : 'POST';
    const url = editingTax.id ? `/api/taxes/${editingTax.id}` : '/api/taxes';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingTax)
    });

    if (res.ok) {
      const saved = await res.json();
      if (editingTax.id) {
        setTaxes(taxes.map(t => t.id === saved.id ? saved : t));
      } else {
        setTaxes([...taxes, saved]);
      }
      setIsTaxModalOpen(false);
      setEditingTax(null);
    }
  };

  const deleteTax = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tax rule?')) return;
    const res = await fetch(`/api/taxes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTaxes(taxes.filter(t => t.id !== id));
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = userModal.user ? 'PUT' : 'POST';
    const url = userModal.user ? `/api/users/${userModal.user.id}` : '/api/users';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const u = await res.json();
      if (userModal.user) {
        setUsers(users.map(item => item.id === u.id ? u : item));
      } else {
        setUsers([...users, u]);
      }
      setUserModal({ open: false, user: null });
      setFormData({ username: '', password: '', role: 'USER' });
    }
  };

   if (!settings) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12 bp-24">
      <div className="px-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 flex items-center gap-2 font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          Configure store details and system preferences
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1 space-y-2">
           {(['general', 'taxes', 'users', 'integration', 'export'] as const).map((tab) => (
             <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "w-full text-left px-5 py-4 rounded-xl text-sm font-bold capitalize transition-all border",
                activeTab === tab 
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
             >
               {tab}
             </button>
           ))}
        </div>

        <div className="md:col-span-3 space-y-10">
           {activeTab === 'general' ? (
             <div className="p-8 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Store Name</label>
                      <input 
                        type="text" 
                        className="theme-input w-full px-6 py-4"
                        value={settings.storeName}
                        onChange={e => setSettings({...settings, storeName: e.target.value})}
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Admin Profile Name</label>
                      <input 
                        type="text" 
                        className="theme-input w-full px-6 py-4"
                        value={settings.adminName || ''}
                        onChange={e => setSettings({...settings, adminName: e.target.value})}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Default Interest Rate (%)</label>
                      <input 
                        type="number" 
                        className="theme-input w-full px-6 py-4 tabular-nums"
                        value={settings.defaultInterestRate}
                        onChange={e => setSettings({...settings, defaultInterestRate: Number(e.target.value)})}
                      />
                   </div>
                </div>

                 <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                   <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full transition-all duration-700",
                        isSaving ? "bg-amber-400 animate-pulse" : "bg-emerald-400 shadow-emerald-200"
                      )}></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                        {isSaving ? "Saving changes..." : "Settings Saved"}
                      </span>
                   </div>
                   <button 
                    onClick={handleSave}
                    className="theme-button-primary"
                   >
                     <Save size={18} />
                     Save Configuration
                   </button>
                </div>
              </div>
            ) : activeTab === 'users' ? (
              <div className="p-8 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">User Management</h4>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Manage logins and access levels</p>
                  </div>
                  <button 
                   onClick={() => {
                     setUserModal({ open: true, user: null });
                     setFormData({ username: '', password: '', role: 'USER' });
                   }}
                   className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-slate-900 dark:hover:bg-blue-600 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="grid gap-4">
                   {users.map(u => (
                     <div key={u.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group translate-all hover:border-primary/30">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-primary group-hover:border-primary transition-all shadow-sm">
                              <User size={20} />
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{u.username}</p>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                                u.role === 'ADMIN' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              )}>
                                {u.role}
                              </span>
                           </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                            onClick={async () => {
                              if(confirm('Are you sure you want to delete this user?')) {
                                const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
                                if(res.ok) setUsers(users.filter(item => item.id !== u.id));
                              }
                            }}
                            className="w-9 h-9 flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                           >
                              <Trash2 size={16} />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            ) : activeTab === 'integration' ? (
              <div className="p-8 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                <div className="px-2">
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Cloud Integration</h4>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Google Sheets & External Storage</p>
                </div>
                
                <div className="space-y-8">
                  <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Enable Google Sheets</p>
                        <p className="text-[10px] text-slate-500 font-medium">Store all records on your personal Google account</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, isSheetIntegrationEnabled: !settings.isSheetIntegrationEnabled})}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        settings?.isSheetIntegrationEnabled ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm",
                        settings?.isSheetIntegrationEnabled ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {settings?.isSheetIntegrationEnabled && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Spreadsheet ID</label>
                        <input 
                          type="text" 
                          className="theme-input w-full px-6 py-4 font-mono text-xs"
                          placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                          value={settings.googleSheetId || ''}
                          onChange={e => setSettings({...settings, googleSheetId: e.target.value})}
                        />
                        <p className="text-[10px] text-slate-400 ml-1">Found in the URL of your Google Sheet</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight ml-1">Google Apps Script URL (Proxy)</label>
                        <input 
                          type="text" 
                          className="theme-input w-full px-6 py-4 font-mono text-xs"
                          placeholder="https://script.google.com/macros/s/.../exec"
                          value={settings.googleSheetUrl || ''}
                          onChange={e => setSettings({...settings, googleSheetUrl: e.target.value})}
                        />
                        <p className="text-[10px] text-slate-400 ml-1">Recommended for static hosting and easier setup</p>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 p-6 rounded-2xl flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 shrink-0">
                          <Globe size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-tight">Setup Instructions</p>
                          <p className="text-[11px] text-amber-700 dark:text-amber-500 mt-1 leading-relaxed">
                            1. Open your Google Sheet. <br/>
                            2. Go to <b>Extensions {'>'} Apps Script</b>. <br/>
                            3. Paste the code below and click <b>Deploy {'>'} New Deployment</b>. <br/>
                            4. Select <b>Web App</b>, set access to <b>"Anyone"</b>. <br/>
                            5. Copy the <b>Web App URL</b> and paste it below.
                          </p>
                          <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-amber-200 dark:border-amber-900/30">
                            <pre className="text-[9px] font-mono whitespace-pre opacity-70 overflow-x-auto">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(data.sheetName) || ss.getSheets()[0];
  sheet.appendRow(Object.values(data.row));
  return ContentService.createTextOutput("Success");
}`}
                            </pre>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`function doPost(e) {\n  var data = JSON.parse(e.postData.contents);\n  var ss = SpreadsheetApp.getActiveSpreadsheet();\n  var sheet = ss.getSheetByName(data.sheetName) || ss.getSheets()[0];\n  sheet.appendRow(Object.values(data.row));\n  return ContentService.createTextOutput("Success");\n}`);
                                alert('Script copied to clipboard!');
                              }}
                              className="mt-2 text-[10px] font-bold text-amber-600 hover:underline uppercase tracking-wider"
                            >
                              Copy Script Code
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                   <button 
                    onClick={handleSave}
                    className="theme-button-primary"
                   >
                     <Save size={18} />
                     Save Configuration
                   </button>
                </div>
              </div>
            ) : activeTab === 'taxes' ? (
             <div className="p-8 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Taxation Rules</h4>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Manage global tax rates</p>
                  </div>
                  <button 
                   onClick={() => openTaxModal()}
                   className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-slate-900 dark:hover:bg-blue-600 transition-all"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="grid gap-4">
                  {taxes.map(tax => (
                    <div key={tax.id} className="group p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center gap-6 hover:bg-white dark:hover:bg-slate-800 hover:border-primary/20 dark:hover:border-primary/40 hover:shadow-md transition-all">
                      <div className="flex-1">
                         <p className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{tax.name}</p>
                         <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{tax.rate}% Tax Rate</p>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className={cn(
                           "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                           tax.isEnabled ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50" : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600"
                         )}>
                           {tax.isEnabled ? "Active" : "Disabled"}
                         </span>
                         <button 
                           onClick={() => openTaxModal(tax)}
                           className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-xl hover:text-primary transition-all shadow-sm flex items-center justify-center"
                         >
                           <Edit2 size={16} />
                         </button>
                         <button 
                           onClick={() => deleteTax(tax.id)}
                           className="w-10 h-10 text-slate-300 dark:text-slate-700 hover:text-rose-500 dark:hover:text-rose-400 transition-all flex items-center justify-center"
                         >
                           <Trash2 size={18} />
                         </button>
                      </div>
                    </div>
                  ))}
                  {taxes.length === 0 && (
                    <div className="py-20 text-center">
                      <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                        <Receipt size={32} />
                      </div>
                      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">No tax rules found</p>
                    </div>
                  )}
                </div>
             </div>
           ) : activeTab === 'export' ? (
             <div className="p-8 lg:p-10 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-10">
                <div>
                   <h4 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Data Export</h4>
                   <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">Download your store records in Excel format</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
                   <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between group hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                      <div className="mb-8">
                         <p className="text-lg font-bold text-slate-900 dark:text-white">Customers</p>
                         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">CUSTOMER_REGISTRY.XLS</p>
                      </div>
                      <button 
                         onClick={() => exportToExcel('customers')}
                         disabled={isExporting === 'customers'}
                         className="w-full py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 dark:hover:bg-slate-800 hover:text-white dark:hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Download size={14} />
                        {isExporting === 'customers' ? 'Exporting...' : 'Export Excellence'}
                      </button>
                   </div>
                   <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between group hover:border-primary/20 dark:hover:border-primary/40 transition-all">
                      <div className="mb-8">
                         <p className="text-lg font-bold text-slate-900 dark:text-white">Orders</p>
                         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">ORDER_HISTORY.XLS</p>
                      </div>
                      <button 
                         onClick={() => exportToExcel('orders')}
                         disabled={isExporting === 'orders'}
                         className="w-full py-3 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-slate-900 dark:hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                      >
                        <FileSpreadsheet size={14} />
                        {isExporting === 'orders' ? 'Exporting...' : 'Export Excellence'}
                      </button>
                   </div>
                   <div className="col-span-full border-t border-slate-100 dark:border-slate-800 pt-8 mt-4">
                      <div className="p-8 bg-slate-900 dark:bg-black rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                         <div className="flex items-center gap-6 text-center sm:text-left flex-col sm:flex-row">
                            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                               <Receipt size={32} />
                            </div>
                            <div>
                               <p className="font-bold text-white text-xl mb-1">Master Ledger Archive</p>
                               <p className="text-xs text-slate-400 dark:text-slate-500 font-medium leading-relaxed max-w-sm">Full financial record containing interest calculations and payment histories.</p>
                            </div>
                         </div>
                         <button 
                            onClick={() => exportToExcel('ledger')}
                            disabled={isExporting === 'ledger'}
                            className="px-10 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-xl transition-all hover:bg-primary hover:text-white"
                         >
                           {isExporting === 'ledger' ? 'Exporting...' : 'Export Ledger'}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           ) : null}
        </div>
      </div>
      {/* MODALS */}
      {userModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setUserModal({ open: false, user: null })} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl relative animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-800">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{userModal.user ? 'Edit User' : 'New User Login'}</h3>
                <button onClick={() => setUserModal({ open: false, user: null })} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Username</label>
                  <input 
                    required
                    type="text" 
                    className="theme-input w-full px-5 py-3"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                  />
                </div>
                {!userModal.user && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Password</label>
                    <input 
                      required
                      type="password" 
                      className="theme-input w-full px-5 py-3"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Role</label>
                  <select 
                    className="theme-input w-full px-5 py-3"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="USER">User (Sales)</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <button type="submit" className="theme-button-primary w-full py-4 mt-4">
                  {userModal.user ? 'Update User' : 'Create Login'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tax Modal */}
      {isTaxModalOpen && editingTax && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 space-y-8 relative overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-lg">
                <Receipt size={32} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{editingTax.id ? 'Edit Tax Rule' : 'New Tax Rule'}</h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Yield Configuration</p>
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Tax Name</label>
                <input 
                  type="text"
                  placeholder="e.g. GST, VAT"
                  className="theme-input w-full px-6 py-4"
                  value={editingTax.name || ''}
                  onChange={e => setEditingTax({...editingTax, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Rate (%)</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="theme-input w-full px-6 py-4"
                  value={editingTax.rate || ''}
                  onChange={e => setEditingTax({...editingTax, rate: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Status</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setEditingTax({...editingTax, isEnabled: true})}
                    className={cn(
                      "py-4 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all",
                      editingTax.isEnabled ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400 shadow-sm" : "bg-transparent border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    Enabled
                  </button>
                  <button 
                    onClick={() => setEditingTax({...editingTax, isEnabled: false})}
                    className={cn(
                      "py-4 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all",
                      !editingTax.isEnabled ? "bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-sm" : "bg-transparent border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    Disabled
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 relative z-10 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => {
                  setIsTaxModalOpen(false);
                  setEditingTax(null);
                }}
                className="theme-button-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTax}
                className="theme-button-primary flex-[2]"
              >
                {editingTax.id ? 'Save Changes' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
