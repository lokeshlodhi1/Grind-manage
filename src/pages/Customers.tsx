import React, { useState, useEffect } from 'react';
import { Plus, User, Mail, Phone, Calendar, Trash2, Edit2, MapPin, Filter, Wallet } from 'lucide-react';
import { formatDate, cn, formatCurrency, apiFetch } from '../lib/utils';
import { Customer } from '../types';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Delete Dialog State
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({ 
    name: '', 
    mobile: '', 
    email: '', 
    address: '',
    interestRate: 12,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  useEffect(() => {
    apiFetch('/api/customers').then(res => res.ok ? res.json() : []).then(setCustomers);
  }, []);

  const openModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        mobile: customer.mobile || '',
        email: customer.email || '',
        address: customer.address || '',
        interestRate: customer.interestRate,
        status: customer.status || 'ACTIVE'
      });
    } else {
      setEditingCustomer(null);
      setFormData({ name: '', mobile: '', email: '', address: '', interestRate: 12, status: 'ACTIVE' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
    const method = editingCustomer ? 'PUT' : 'POST';
    
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      const updatedCust = await res.json();
      if (editingCustomer) {
        setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...updatedCust } : c));
      } else {
        setCustomers([...customers, updatedCust]);
      }
      setShowModal(false);
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      const res = await apiFetch(`/api/customers/${customerToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCustomers(customers.filter(c => c.id !== customerToDelete.id));
        setCustomerToDelete(null);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete customer');
      }
    } catch (e) {
      alert('Connection error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    if (statusFilter === 'ALL') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="space-y-12 max-w-7xl mx-auto bp-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Customer Registry</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            Management of customer profiles and accounts
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-white dark:bg-slate-800 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700 shadow-sm">
            {['ALL', 'ACTIVE', 'INACTIVE'].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f as any)}
                className={cn(
                  "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                  statusFilter === f ? "bg-slate-900 dark:bg-primary text-white shadow-md shadow-slate-200 dark:shadow-primary/20" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <button 
            onClick={() => openModal()}
            className="theme-button-primary"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">Customer Name</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">Contact Details</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 text-center">Interest Rate</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400">Balance</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCustomers.length > 0 ? filteredCustomers.map((c) => (
                <tr key={c.id} className={cn(
                  "hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group",
                  c.status === 'INACTIVE' && "opacity-60 grayscale-[0.5]"
                )}>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm border border-slate-100 dark:border-slate-800 transition-all",
                        c.status === 'ACTIVE' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
                      )}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <p className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</p>
                           <span className={cn(
                             "w-1.5 h-1.5 rounded-full",
                             c.status === 'ACTIVE' ? "bg-emerald-500 shadow-sm" : "bg-slate-300 dark:bg-slate-700"
                           )}></span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">ID: {c.id?.split('-')[0].toUpperCase() || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <Phone size={14} className="text-slate-400 dark:text-slate-500" />
                        {c.mobile || "None"}
                      </div>
                      {c.address && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <MapPin size={12} className="text-slate-300 dark:text-slate-600" />
                          <span className="truncate max-w-[200px]">{c.address}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="inline-block px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{c.interestRate}% <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">P.A.</span></span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                       <span className={cn(
                         "text-lg font-bold tracking-tight tabular-nums",
                         (c.balance || 0) > 1 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                       )}>
                         {formatCurrency(c.balance || 0)}
                       </span>
                       <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Exposure</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/ledger/${c.id}`)}
                        className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-all shadow-sm border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-100 hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white dark:hover:text-white flex items-center gap-2"
                      >
                         <Wallet size={14} />
                         Ledger
                      </button>
                      <button 
                        onClick={() => openModal(c)}
                        className="w-9 h-9 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setCustomerToDelete(c)}
                        className="w-9 h-9 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 text-slate-400 dark:text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-lg transition-all shadow-sm"
                        title="Delete Customer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                     <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-700">
                        <User size={32} />
                     </div>
                     <p className="font-bold text-sm text-slate-400 dark:text-slate-600">No customers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={!!customerToDelete}
        onClose={() => setCustomerToDelete(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Customer Profile?"
        message={`Are you sure you want to delete ${customerToDelete?.name}? This will remove their profile from the registry. This action cannot be undone if there is no balance.`}
        confirmText="Remove Customer"
      />

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="shrink-0 mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {editingCustomer ? 'Update Customer' : 'Add New Customer'}
                </h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Customer Profile Details</p>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <form id="customer-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. John Doe"
                        className="theme-input w-full px-6 py-4"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Mobile Number</label>
                        <input 
                          type="tel" 
                          placeholder="+91 ..."
                          className="theme-input w-full px-6 py-4"
                          value={formData.mobile}
                          onChange={e => setFormData({...formData, mobile: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                          Interest Rate (%) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="number" 
                          required
                          className="theme-input w-full px-6 py-4 tabular-nums"
                          value={formData.interestRate}
                          onChange={e => setFormData({...formData, interestRate: Number(e.target.value)})}
                        />
                      </div>
                  </div>

                  <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Address</label>
                      <textarea 
                        placeholder="Customer location details..."
                        className="theme-input w-full px-6 py-4 resize-none h-24"
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                      />
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Customer Status</label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, status: 'ACTIVE'})}
                          className={cn(
                            "flex-1 py-3 rounded-lg text-xs font-bold uppercase transition-all border-2",
                            formData.status === 'ACTIVE' ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600"
                          )}
                        >
                          Enabled
                        </button>
                        <button 
                          type="button"
                          onClick={() => setFormData({...formData, status: 'INACTIVE'})}
                          className={cn(
                            "flex-1 py-3 rounded-lg text-xs font-bold uppercase transition-all border-2",
                            formData.status === 'INACTIVE' ? "bg-slate-100 dark:bg-slate-700 border-slate-400 dark:border-slate-500 text-slate-800 dark:text-slate-200" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600"
                          )}
                        >
                          Disabled
                        </button>
                      </div>
                  </div>
                </form>
              </div>

              <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
                >
                  Cancel
                </button>
                <button 
                form="customer-form"
                type="submit"
                className="flex-[1.5] py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-slate-900 dark:hover:bg-blue-600 transition-all active:scale-[0.98]"
                >
                  {editingCustomer ? 'Update Profile' : 'Add Customer'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
