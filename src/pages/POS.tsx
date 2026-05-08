import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  UserPlus, 
  ShoppingBag, 
  ChevronRight,
  CheckCircle2,
  Printer,
  Share2,
  Truck,
  History,
  AlertCircle,
  Eye,
  FileText,
  X,
  Receipt,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, cn, apiFetch } from '../lib/utils';
import { Customer, Service, OrderItem, Order, Tax } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

export default function POS() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [cart, setCart] = useState<(Omit<Partial<OrderItem>, 'quantity'> & { cartId: string; quantity: string | number })[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  
  // Quick Add Form
  const [quickCustomer, setQuickCustomer] = useState({ name: '', interestRate: 2 });
  
  // Delivery Flow
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [deliveredItemIds, setDeliveredItemIds] = useState<string[]>([]);
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [partialCashAmount, setPartialCashAmount] = useState('');

  // Confirmation States
  const [confirmState, setConfirmState] = useState<{
    type: 'DELIVER' | 'REJECT' | 'DELETE';
    order: Order;
    isOpen: boolean;
  } | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    if (deliveryOrder && deliveryOrder.items) {
      setDeliveredItemIds(deliveryOrder.items.filter(i => i.delivered).map(i => i.id));
      setDeliveryRemarks(deliveryOrder.remarks || '');
      setPartialCashAmount('');
    }
  }, [deliveryOrder]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [custRes, servRes, ordRes, taxRes] = await Promise.all([
        apiFetch('/api/customers'),
        apiFetch('/api/services'),
        apiFetch('/api/orders'),
        apiFetch('/api/taxes')
      ]);
      
      if (custRes.ok) setCustomers(await custRes.json());
      if (servRes.ok) setServices(await servRes.json());
      if (ordRes.ok) setOrders(await ordRes.json());
      if (taxRes.ok) setTaxes(await taxRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  const subtotal = Number(cart.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2));
  const enabledTaxes = taxes.filter(t => t.isEnabled);
  const totalTaxAmount = Number(enabledTaxes.reduce((sum, tax) => sum + (subtotal * (tax.rate / 100)), 0).toFixed(2));
  const totalAmount = Number((subtotal + totalTaxAmount).toFixed(2));

  const addItem = (service: Service) => {
    setCart([...cart, {
      cartId: Math.random().toString(36).substr(2, 9),
      serviceId: service.id,
      serviceName: service.name,
      quantity: '', // Blank by default
      rate: service.rate,
      amount: 0,
      pricingType: service.pricingType
    }]);
  };

  const updateQuantity = (cartId: string, qty: string) => {
    setCart(cart.map(item => {
      if (item.cartId === cartId) {
        const newQty = qty === '' ? '' : (parseFloat(qty) || 0);
        const numericQty = typeof newQty === 'number' ? newQty : 0;
        return {
          ...item,
          quantity: newQty,
          amount: Number((numericQty * (item.rate || 0)).toFixed(2))
        };
      }
      return item;
    }));
  };

  const removeItem = (cartId: string) => {
    setCart(cart.filter(i => i.cartId !== cartId));
  };

  const handleQuickAddCustomer = async () => {
    if (!quickCustomer.name.trim()) return;
    const res = await apiFetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: quickCustomer.name,
        interestRate: quickCustomer.interestRate 
      })
    });
    if (res.ok) {
      const newCust = await res.json();
      setCustomers([...customers, newCust]);
      setSelectedCustomer(newCust);
    }
    setIsAddingCustomer(false);
    setQuickCustomer({ name: '', interestRate: 2 });
  };

  const submitOrder = async () => {
    if (!selectedCustomer) {
      alert("Please select a customer");
      return;
    }
    if (cart.length === 0) return;

    const res = await apiFetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          subtotal,
          taxAmount: totalTaxAmount,
          totalAmount,
          appliedTaxes: enabledTaxes.map(t => ({
            name: t.name,
            rate: t.rate,
            amount: Number((subtotal * (t.rate / 100)).toFixed(2))
          }))
        },
        items: cart.map(i => ({
          ...i,
          quantity: parseFloat(i.quantity?.toString() || '0') || 0
        }))
      })
    });

    if (res.ok) {
      setShowOrderSuccess(true);
      setCart([]);
      setSelectedCustomer(null);
      fetchData();
    }
  };

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
      } else {
        const err = await res.json();
        alert(err.error || "Deletion failed");
      }
    } catch (e) {
      alert("Connection error");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto space-y-10 pb-16">
      {/* Top Section: Ticket Initialization */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Part: Customer & Entry Controls */}
        <div className="p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-slate-800 flex-1 space-y-8 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">New Order</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Configure customer and services for the current ticket.</p>
            </div>
            <div className="bg-primary/10 p-3.5 rounded-xl text-primary">
              <ShoppingBag size={24} />
            </div>
          </div>

          <div className="space-y-8">
            {/* Customer Link - Themed Card */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-3.5 bg-primary rounded-full"></div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Customer Selection</label>
              </div>
              
              {!selectedCustomer ? (
                <div className="space-y-4">
                  <div className="relative group">
                    <input 
                      type="text"
                      className="theme-input w-full pl-12 pr-5 py-3.5 text-sm"
                      placeholder="Search customers by name or mobile..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                    />
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                      <Search size={16} />
                    </div>
                    {customerSearch && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden border border-slate-200 dark:border-slate-700 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                        {customers
                          .filter(c => (c.status === 'ACTIVE' || !c.status) && (
                            c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                            (c.mobile || '').includes(customerSearch)
                          ))
                          .map(c => (
                            <button
                              key={c.id}
                              className="w-full px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-sm font-semibold border-b border-slate-50 dark:border-slate-700 last:border-0 flex items-center justify-between group"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setCustomerSearch('');
                              }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-slate-900 dark:text-slate-100">{c.name}</span>
                                  {c.mobile && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Mob: {c.mobile}</span>}
                                </div>
                              </div>
                              <Plus size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-primary transition-all" />
                            </button>
                          ))}
                        <button
                          className="w-full px-6 py-4 text-left bg-primary/5 dark:bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest border-t border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                          onClick={() => {
                            setQuickCustomer(prev => ({ ...prev, name: customerSearch }));
                            setIsAddingCustomer(true);
                            setCustomerSearch('');
                          }}
                        >
                          <UserPlus size={16} />
                          Quick Register "{customerSearch}"
                        </button>
                      </div>
                    )}
                  </div>

                  {!isAddingCustomer ? (
                    <button 
                      onClick={() => setIsAddingCustomer(true)}
                      className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                      <UserPlus size={16} />
                      Add New Customer
                    </button>
                  ) : (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-primary/20 space-y-6 shadow-sm animate-in zoom-in-95 duration-200">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Customer Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. John Doe"
                          className="theme-input w-full px-5 py-3 text-sm"
                          value={quickCustomer.name}
                          onChange={e => setQuickCustomer({...quickCustomer, name: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="space-y-2 flex-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Interest Rate (%)</label>
                          <input 
                            type="number" 
                            className="theme-input w-full px-5 py-3 text-sm tabular-nums"
                            value={quickCustomer.interestRate}
                            onChange={e => setQuickCustomer({...quickCustomer, interestRate: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="flex-[1.5] flex gap-2 items-end">
                          <button 
                            onClick={handleQuickAddCustomer}
                            className="flex-1 py-3.5 bg-slate-900 dark:bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-primary dark:hover:bg-blue-600 active:scale-95 shadow-sm"
                          >
                            Create
                          </button>
                          <button 
                            onClick={() => setIsAddingCustomer(false)}
                            className="p-3.5 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-500 rounded-xl transition-all border border-slate-200/60 dark:border-slate-600"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="group flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in slide-in-from-left-6 duration-200">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shadow-sm">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{selectedCustomer.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active // Rate: {selectedCustomer.interestRate}%
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedCustomer(null)} 
                    className="p-3 bg-slate-50 dark:bg-slate-700 text-slate-400 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 rounded-lg transition-all border border-slate-100 dark:border-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Service & Quantity Entry */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-3.5 bg-primary rounded-full"></div>
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">Add Services</label>
              </div>
              <div className="relative group">
                <select 
                  id="service-select"
                  className="theme-input w-full pl-6 pr-12 py-3.5 text-sm appearance-none cursor-pointer"
                  defaultValue=""
                  onChange={(e) => {
                    const service = services.find(s => s.id === e.target.value);
                    if (service) {
                      addItem(service);
                      e.target.value = ""; // Reset dropdown
                    }
                  }}
                >
                  <option value="" disabled className="dark:bg-slate-900">Select service to add...</option>
                  {services.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{s.name} - {formatCurrency(s.rate)}</option>)}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-primary">
                  <div className="bg-primary flex items-center justify-center rounded-lg p-1">
                    <Plus size={16} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Part: Cart Review & Checkout */}
        <div className="lg:w-[420px] bg-slate-50/50 dark:bg-slate-900/50 p-8 lg:p-10 flex flex-col h-full relative overflow-y-auto custom-scrollbar border-l border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Order Summary</h4>
            <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{cart.length} ITEMS</span>
          </div>

          <div className="flex-1 space-y-3 mb-8 pr-1 overflow-y-auto custom-scrollbar">
            {cart.map((item) => (
              <div key={item.cartId} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{item.serviceName}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-tight">{item.pricingType} • {formatCurrency(item.rate || 0)}</p>
                </div>
                <div className="flex items-center bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1 border border-slate-100 dark:border-slate-600">
                  <input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.cartId!, e.target.value)}
                    className="w-10 bg-transparent text-center text-sm font-bold text-slate-900 dark:text-white outline-none tabular-nums"
                  />
                </div>
                <button 
                  onClick={() => removeItem(item.cartId!)}
                  className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-20 dark:opacity-40">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Receipt size={32} />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Basket is Empty</p>
              </div>
            )}
          </div>

          <div className="space-y-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-slate-900 dark:text-slate-100">{formatCurrency(subtotal)}</span>
              </div>
              
              {enabledTaxes.map(tax => (
                <div key={tax.id} className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <span>{tax.name} ({tax.rate}%)</span>
                  <span className="text-slate-900 dark:text-slate-100">{formatCurrency((subtotal * tax.rate) / 100)}</span>
                </div>
              ))}
              
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-end">
                 <div>
                   <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">Total Amount</span>
                   <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{formatCurrency(totalAmount)}</span>
                 </div>
              </div>

              <button 
                onClick={submitOrder}
                disabled={cart.length === 0 || !selectedCustomer}
                className="theme-button-primary w-full py-4 text-sm mt-4 shadow-lg shadow-primary/10"
              >
                Place Order
              </button>
          </div>
        </div>
      </div>

      {/* Orders List Section */}
      <div className="theme-card overflow-hidden flex flex-col min-h-[500px] border border-slate-200 dark:border-slate-800">
        <header className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 text-slate-900 dark:text-white sticky top-0 z-10">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <History size={20} className="text-primary" />
              Recent Orders
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Transaction logs and delivery status tracking.</p>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Real-time Data</span>
          </div>
        </header>
        
        <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto custom-scrollbar px-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 pr-8">Order ID</th>
                <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 pr-8">Customer</th>
                <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-center">Status</th>
                <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-right pr-8">Amount</th>
                <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {orders.slice().reverse().map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                  <td className="py-6 pr-8">
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                       # {o.id?.split('-')[0].toUpperCase() || 'N/A'}
                       {o.remarks && (
                         <span title={o.remarks} className="cursor-help text-amber-500">
                           <FileText size={14} />
                         </span>
                       )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-widest">{o.paymentType}</p>
                  </td>
                  <td className="py-6 pr-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-bold uppercase">
                        {o.customerName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{o.customerName}</span>
                    </div>
                  </td>
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-2 justify-center">
                       <div className={cn(
                         "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                         o.status === 'REJECTED' ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400" :
                         o.status === 'DELIVERED' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                       )}>
                         {o.status}
                       </div>
                    </div>
                  </td>
                  <td className="py-6 text-right pr-8">
                    <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(o.totalAmount)}</div>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{o.totalQuantity} items</div>
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => navigate(`/order/${o.id}`)}
                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white transition-all shadow-sm"
                       >
                         <Eye size={16} />
                       </button>
                       {o.status !== 'DELIVERED' && o.status !== 'REJECTED' && (
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
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-200 dark:text-slate-700">
                       <History size={32} />
                    </div>
                    <p className="text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">No records found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Order Settlement (Delivery) Modal */}
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
                      placeholder="Add any specific notes about this delivery (Required for rejection)..."
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
                  disabled={!deliveryRemarks.trim()}
                  className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:text-rose-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title={!deliveryRemarks.trim() ? "Remarks required for rejection" : ""}
                >
                  Reject
                </button>
                <button 
                  onClick={() => setConfirmState({ type: 'DELIVER', order: deliveryOrder, isOpen: true })}
                  disabled={deliveredItemIds.length === 0}
                  className="flex-[2] py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/10 hover:bg-slate-900 dark:hover:bg-blue-600 transition-all disabled:opacity-30"
                >
                  {deliveredItemIds.length === deliveryOrder.items?.length ? "Confirm Delivery" : "Partial Fulfillment"}
                </button>
              </div>
           </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (confirmState?.type === 'DELIVER') handleDelivery();
          if (confirmState?.type === 'REJECT') handleReject();
          if (confirmState?.type === 'DELETE') handleDeleteOrder();
        }}
        isLoading={isConfirming}
        type={confirmState?.type === 'DELETE' ? 'danger' : confirmState?.type === 'REJECT' ? 'warning' : 'success'}
        title={
          confirmState?.type === 'DELIVER' ? "Complete Delivery?" :
          confirmState?.type === 'REJECT' ? "Reject Order?" : "Delete Record?"
        }
        message={
          confirmState?.type === 'DELIVER' ? `Confirm that ${deliveredItemIds.length} items from order #${(confirmState?.order?.id || '').split('-')[0].toUpperCase()} have been delivered to ${confirmState?.order?.customerName}.` :
          confirmState?.type === 'REJECT' ? `Are you sure you want to REJECT order #${(confirmState?.order?.id || '').split('-')[0].toUpperCase()}? This will be recorded in the system logs.` :
          `Are you sure you want to permanently delete order #${(confirmState?.order?.id || '').split('-')[0].toUpperCase()}? This action cannot be reversed.`
        }
        confirmText={
          confirmState?.type === 'DELIVER' ? "Deliver" :
          confirmState?.type === 'REJECT' ? "Reject" : "Delete"
        }
      />

      {/* Success Modal */}
      {showOrderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white tracking-tight">Order Created</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">The ticket has been recorded and is ready for fulfillment.</p>
            
            <button 
              onClick={() => setShowOrderSuccess(false)}
              className="theme-button-primary w-full"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
