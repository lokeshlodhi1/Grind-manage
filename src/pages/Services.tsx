import React, { useState, useEffect } from 'react';
import { Plus, ChefHat, Trash2, Edit2, Zap } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { Service, PricingType } from '../types';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({ name: '', pricingType: 'KG' as PricingType, rate: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/services').then(res => res.ok ? res.json() : []).then(setServices);
  }, []);

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({ name: service.name, pricingType: service.pricingType, rate: service.rate });
    } else {
      setEditingService(null);
      setFormData({ name: '', pricingType: 'KG', rate: 0 });
    }
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const method = editingService ? 'PUT' : 'POST';
    const url = editingService ? `/api/services/${editingService.id}` : '/api/services';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      const saved = await res.json();
      if (editingService) {
        setServices(services.map(s => s.id === saved.id ? saved : s));
      } else {
        setServices([...services, saved]);
      }
      setShowModal(false);
      setFormData({ name: '', pricingType: 'KG', rate: 0 });
    } else {
      const fieldError = await res.json();
      setError(fieldError.error || 'Failed to save service');
    }
  };

  const deleteService = async () => {
    if (!deletingServiceId) return;
    
    setIsDeleting(true);
    console.log("Attempting to delete service:", deletingServiceId);
    
    try {
      const res = await fetch(`/api/services/${deletingServiceId}`, { method: 'DELETE' });
      if (res.ok) {
        console.log("Service deleted successfully:", deletingServiceId);
        setServices(prev => prev.filter(s => s.id !== deletingServiceId));
        setDeletingServiceId(null);
      } else {
        const errorData = await res.json();
        console.error("Deletion failed on server:", errorData);
        alert(`Error: ${errorData.error || 'Failed to delete service'}`);
      }
    } catch (err) {
      console.error("Deletion critical error:", err);
      alert("Critical: Connection error during deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 lg:px-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Service Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 flex items-center gap-2 font-medium">
             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
             Manage your services and pricing tiers
          </p>
        </div>
          <button 
          onClick={() => openModal()}
          className="theme-button-primary"
        >
          <Plus size={18} />
          <span>Add New Service</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {services.map((s) => (
          <div key={s.id} className="p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-xl transition-all group relative flex flex-col justify-between min-h-[300px]">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
               <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); openModal(s); }}
                className="w-10 h-10 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-primary dark:hover:bg-primary hover:text-white dark:hover:text-white transition-all border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center"
               >
                 <Edit2 size={16}/>
               </button>
            </div>
            
            <div>
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-primary rounded-2xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-700 group-hover:bg-primary group-hover:text-white transition-all">
                 <Zap size={24} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{s.name}</h3>
              <div className="flex items-center gap-2 mt-4">
                 <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    TYPE: {s.pricingType}
                 </span>
              </div>
            </div>

            <div className="mt-8 flex items-baseline gap-2">
               <span className="text-4xl font-bold text-slate-900 dark:text-white tabular-nums leading-none font-display">{formatCurrency(s.rate)}</span>
               <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">/ {s.pricingType}</span>
            </div>
          </div>
        ))}
        {services.length === 0 && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
             <Zap size={48} className="text-slate-200 dark:text-slate-800 mb-6" />
             <p className="text-sm font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">No services found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-lg w-full shadow-2xl border border-white/20 dark:border-slate-800 animate-in zoom-in duration-300 relative overflow-hidden">
              <div className="flex items-center gap-6 mb-10">
                 <div className="w-16 h-16 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <Zap size={32} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                   {editingService ? 'Edit Service' : 'Add New Service'}
                 </h3>
              </div>
              
              {error && (
                <div className="mb-8 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold uppercase tracking-wide flex items-center gap-4">
                  <div className="w-2 h-2 bg-rose-500 rounded-full" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Service Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Fine Wheat Flour"
                      className="theme-input w-full px-6 py-4"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                 </div>
                                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Pricing Basis</label>
                      <div className="relative group">
                        <select 
                          className="theme-input w-full px-6 py-4 appearance-none !font-bold"
                          value={formData.pricingType}
                          onChange={e => setFormData({...formData, pricingType: e.target.value as PricingType})}
                        >
                           <option value="KG">PER KG</option>
                           <option value="GRAM">PER GRAM</option>
                           <option value="FIXED">FIXED PRICE</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Rate ({formData.pricingType})</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="theme-input w-full px-6 py-4 !font-bold tabular-nums"
                        value={formData.rate}
                        onChange={e => setFormData({...formData, rate: Number(e.target.value)})}
                      />
                    </div>
                 </div>

                 <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                   {editingService && (
                    <button 
                      type="button" 
                      onClick={() => { setShowModal(false); setDeletingServiceId(editingService.id); }}
                      className="w-14 h-14 bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-2xl hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center"
                    >
                      <Trash2 size={22} />
                    </button>
                   )}
                   <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="theme-button-secondary flex-1"
                   >
                     Cancel
                   </button>
                   <button 
                    type="submit"
                    className="theme-button-primary flex-[2]"
                   >
                     {editingService ? 'Save Changes' : 'Create Service'}
                   </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {deletingServiceId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/80 dark:bg-black/90 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-sm w-full shadow-2xl border border-white/20 dark:border-slate-800 animate-in zoom-in duration-300 relative text-center">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-rose-100 dark:border-rose-900/50">
                <Trash2 size={36} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white tracking-tight">Delete Service?</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mb-8 leading-relaxed">
                This action cannot be undone. Past orders will not be affected.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingServiceId(null)}
                  disabled={isDeleting}
                  className="theme-button-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteService}
                  disabled={isDeleting}
                  className="flex-1 py-4 bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-rose-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
