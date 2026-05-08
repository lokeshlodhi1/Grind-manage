import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Eye, 
  Trash2, 
  Truck, 
  FileText, 
  Filter,
  Calendar,
  ChevronDown,
  X,
  CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, cn, apiFetch } from '../lib/utils';
import { Order, Customer } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED' | 'REJECTED'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  
  // Delivery Modal States (Same functionality as POS)
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [deliveredItemIds, setDeliveredItemIds] = useState<string[]>([]);
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [partialCashAmount, setPartialCashAmount] = useState('');
  
  const [confirmState, setConfirmState] = useState<{
    type: 'DELIVER' | 'REJECT' | 'DELETE';
    order: Order;
    isOpen: boolean;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (deliveryOrder && deliveryOrder.items) {
      setDeliveredItemIds(deliveryOrder.items.filter(i => i.delivered).map(i => i.id));
      setDeliveryRemarks(deliveryOrder.remarks || '');
      setPartialCashAmount('');
    }
  }, [deliveryOrder]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ordRes, custRes] = await Promise.all([
        apiFetch('/api/orders'),
        apiFetch('/api/customers')
      ]);
      if (ordRes.ok) setOrders(await ordRes.json());
      if (custRes.ok) setCustomers(await custRes.json());
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCustomerMobile = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    return customer?.mobile || '';
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerMobile(order.customerName).includes(searchQuery);
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    
    const matchesDate = !dateFilter || (order.date && order.date.startsWith(dateFilter));
    
    return matchesSearch && matchesStatus && matchesDate;
  }).reverse();

  const toggleItemDelivery = (id: string) => {
    if (deliveredItemIds.includes(id)) {
      setDeliveredItemIds(deliveredItemIds.filter(i => i !== id));
    } else {
      setDeliveredItemIds([...deliveredItemIds, id]);
    }
  };

  const handleDelivery = async () => {
    if (!deliveryOrder) return;
    setIsConfirming(true);
    try {
      const res = await apiFetch(`/api/orders/${deliveryOrder.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentType, 
          deliveredItemIds,
          remarks: deliveryRemarks,
          partialCashAmount: parseFloat(partialCashAmount) || 0
        })
      });
      if (res.ok) {
        setDeliveryOrder(null);
        setConfirmState(null);
        fetchData();
      }
    } catch (e) {
      alert("Fulfillment failed");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleReject = async () => {
    if (!deliveryOrder) return;
    setIsConfirming(true);
    try {
      const res = await apiFetch(`/api/orders/${deliveryOrder.id}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'REJECTED',
          remarks: deliveryRemarks 
        })
      });
      if (res.ok) {
        setDeliveryOrder(null);
        setConfirmState(null);
        fetchData();
      }
    } catch (e) {
      alert("Rejection failed");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!confirmState?.order) return;
    setIsConfirming(true);
    try {
      const res = await apiFetch(`/api/orders/${confirmState.order.id}`, { method: 'DELETE' });
      if (res.ok) {
        setOrders(orders.filter(o => o.id !== confirmState.order?.id));
        setConfirmState(null);
      }
    } catch (e) {
      alert("Connection error");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <History className="text-primary" size={32} />
            Order Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Track, filter and manage all customer transaction records.</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{orders.length} Total Records</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6 sticky top-0 z-30">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Search */}
          <div className="flex-1 relative group">
            <input 
              type="text" 
              placeholder="Search by Order ID, Customer Name or Mobile..."
              className="theme-input w-full pl-12 pr-5 py-3.5 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
          </div>

          {/* Date Filter */}
          <div className="lg:w-64 relative">
            <input 
              type="date" 
              className="theme-input w-full pl-12 pr-5 py-3.5 text-sm appearance-none"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={20} />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Status Tabs/Switches */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Filter size={16} className="text-slate-400 mr-2" />
          {[
            { id: 'ALL', label: 'All Orders', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
            { id: 'PENDING', label: 'Pending', color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
            { id: 'DELIVERED', label: 'Delivered', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
            { id: 'REJECTED', label: 'Rejected', color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' }
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setStatusFilter(status.id as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all",
                statusFilter === status.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                  : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="theme-card overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 sticky top-[184px] lg:top-[124px] z-20">
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Order ID</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Date & Customer</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Amount</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-xs font-bold shadow-sm">
                        #
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                          {(o.id || '').split('-')[0]}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">{o.paymentType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{o.customerName}</div>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-1 whitespace-nowrap">
                      {o.date ? new Date(o.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center">
                      <span className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest",
                        o.status === 'REJECTED' ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" :
                        o.status === 'DELIVERED' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      )}>
                        {o.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">{formatCurrency(o.totalAmount)}</div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{o.totalQuantity} Items</div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => navigate(`/order/${o.id}`)}
                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                       >
                         <Eye size={16} />
                       </button>
                       {o.status === 'PENDING' && (
                         <>
                           <button 
                            onClick={() => setDeliveryOrder(o)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-slate-900 dark:hover:bg-blue-600 transition-all shadow-md shadow-primary/10"
                           >
                            <Truck size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Deliver</span>
                           </button>
                           <button 
                            onClick={() => setConfirmState({ type: 'DELETE', order: o, isOpen: true })}
                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-rose-500 dark:hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                           >
                             <Trash2 size={16} />
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                       <History size={40} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">No Orders Found</h4>
                    <p className="text-slate-400 dark:text-slate-600 font-medium mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              )}
              {isLoading && (
                 <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery Modal (copied from POS.tsx logic) */}
      {deliveryOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 lg:p-10 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-250 flex flex-col max-h-[90vh] relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 shrink-0 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-950 dark:bg-slate-800 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <Truck size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Order Fulfillment</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">ORDER # {(deliveryOrder.id || '').split('-')[0].toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setDeliveryOrder(null)} className="p-2.5 text-slate-400 hover:text-rose-500 transition-all bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg">
                   <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar relative z-10 pb-4">
                {/* Financial Summary */}
                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-2xl text-white space-y-4 shadow-xl">
                   <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      <span>Subtotal</span>
                      <span className="text-slate-300">{formatCurrency(deliveryOrder.subtotal)}</span>
                   </div>
                   {deliveryOrder.appliedTaxes?.map((at, idx) => (
                     <div key={idx} className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <span>{at.name} ({at.rate}%)</span>
                        <span className="text-slate-400">+{formatCurrency(at.amount)}</span>
                     </div>
                   ))}
                   <div className="pt-6 mt-2 border-t border-white/10 dark:border-white/5 flex justify-between items-end">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Grand Total</span>
                      <span className="text-3xl font-bold text-white tabular-nums tracking-tight">{formatCurrency(deliveryOrder.totalAmount)}</span>
                   </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Fulfill Items</label>
                  <div className="grid grid-cols-1 gap-3">
                    {deliveryOrder.items?.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItemDelivery(item.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group",
                          deliveredItemIds.includes(item.id) 
                            ? "bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/40" 
                            : "bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                            deliveredItemIds.includes(item.id) ? "bg-primary border-primary" : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600"
                          )}>
                             {deliveredItemIds.includes(item.id) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{item.serviceName}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{item.quantity} Units</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Delivery Remarks</label>
                    <textarea 
                      className="theme-input w-full p-4 min-h-[100px] resize-none text-sm font-medium"
                      placeholder="Add any specific notes about this delivery..."
                      value={deliveryRemarks}
                      onChange={e => setDeliveryRemarks(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Payment Method</label>
                    <div className="bg-slate-100/50 dark:bg-slate-800 rounded-xl p-1 flex border border-slate-200 dark:border-slate-700">
                       <button 
                        onClick={() => setPaymentType('CASH')}
                        className={cn(
                          "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                          paymentType === 'CASH' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-600" : "text-slate-500"
                        )}
                       >
                         Cash
                       </button>
                       <button 
                        onClick={() => setPaymentType('CREDIT')}
                        className={cn(
                          "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-lg",
                          paymentType === 'CREDIT' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-600" : "text-slate-500"
                        )}
                       >
                         Credit
                       </button>
                    </div>
                  </div>

                  {paymentType === 'CREDIT' && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 duration-200 space-y-6">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest">Partial Cash</label>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">OPTIONAL</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold">₹</span>
                        <input 
                          type="number"
                          placeholder="0.00"
                          className="theme-input w-full pl-10 py-3 text-lg font-bold tabular-nums"
                          value={partialCashAmount}
                          onChange={e => setPartialCashAmount(e.target.value)}
                        />
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-slate-200/60 dark:border-slate-700">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Balance Record</span>
                        <span className="text-lg font-bold text-rose-500 tabular-nums">
                          {formatCurrency(Math.max(0, deliveryOrder.totalAmount - (parseFloat(partialCashAmount) || 0)))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 shrink-0 pt-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky bottom-0 z-20">
                <button 
                  onClick={() => setConfirmState({ type: 'REJECT', order: deliveryOrder, isOpen: true })}
                  className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 transition-all"
                >
                  Reject
                </button>
                <button 
                  onClick={() => setConfirmState({ type: 'DELIVER', order: deliveryOrder, isOpen: true })}
                  disabled={deliveredItemIds.length === 0}
                  className="flex-[2] py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/10 hover:bg-slate-900 dark:hover:bg-blue-600 transition-all disabled:opacity-30"
                >
                  Confirm Delivery
                </button>
              </div>
           </div>
        </div>
      )}

      {confirmState && (
        <ConfirmDialog 
          isOpen={confirmState.isOpen}
          onClose={() => setConfirmState(null)}
          onConfirm={() => {
            if (confirmState.type === 'DELIVER') handleDelivery();
            if (confirmState.type === 'REJECT') handleReject();
            if (confirmState.type === 'DELETE') handleDeleteOrder();
          }}
          isLoading={isConfirming}
          type={confirmState.type === 'DELETE' ? 'danger' : confirmState.type === 'REJECT' ? 'warning' : 'success'}
          title={
            confirmState.type === 'DELIVER' ? "Complete Delivery?" :
            confirmState.type === 'REJECT' ? "Reject Order?" : "Delete Record?"
          }
          message={
            confirmState.type === 'DELIVER' ? `Confirm that ${deliveredItemIds.length} items from order #${(confirmState.order.id || '').split('-')[0].toUpperCase()} have been delivered.` :
            confirmState.type === 'REJECT' ? `Are you sure you want to REJECT order #${(confirmState.order.id || '').split('-')[0].toUpperCase()}?` :
            `Are you sure you want to permanently delete this order record?`
          }
          confirmText={
            confirmState.type === 'DELIVER' ? "Deliver" :
            confirmState.type === 'REJECT' ? "Reject" : "Delete"
          }
        />
      )}
    </div>
  );
}
