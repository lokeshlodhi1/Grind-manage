import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  Search, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock,
  History,
  CreditCard,
  Plus,
  Eye,
  FileText,
  X
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { Customer, LedgerEntry, Order } from '../types';

export default function Ledger() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerMode, setLedgerMode] = useState<'ALL' | 'CREDIT' | 'CASH'>('ALL');
  const [search, setSearch] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetch('/api/customers').then(res => res.ok ? res.json() : []).then(data => {
      setCustomers(data);
      if (customerId) {
        const cust = data.find((c: Customer) => c.id === customerId);
        if (cust) fetchLedger(cust);
      }
    });
  }, [customerId]);

  const fetchLedger = (cust: Customer, mode: 'ALL' | 'CREDIT' | 'CASH' = ledgerMode) => {
    setSelectedCust(cust);
    let url = `/api/ledger/${cust.id}`;
    if (mode === 'CASH') url = `/api/ledger/${cust.id}/cash`;
    
    fetch(url).then(res => res.ok ? res.json() : []).then(entries => {
      if (mode === 'CREDIT') {
        setLedger(entries.filter((e: any) => e.type !== 'CASH'));
      } else {
        setLedger(entries);
      }
    });
  };

  const handleModeChange = (mode: 'ALL' | 'CREDIT' | 'CASH') => {
    setLedgerMode(mode);
    if (selectedCust) fetchLedger(selectedCust, mode);
  };

  const viewOrder = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}`);
    if (res.ok) {
      setViewingOrder(await res.json());
    }
  };

  const submitPayment = async () => {
    if (!selectedCust || !paymentAmount) return;
    const res = await fetch('/api/ledger/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: selectedCust.id,
        amount: Number(paymentAmount),
        notes: paymentNotes
      })
    });
    if (res.ok) {
      setPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      fetchLedger(selectedCust);
    }
  };

  const handleExport = async () => {
    if (!selectedCust || ledger.length === 0) return;
    setIsExporting(true);
    try {
      const dataToExport = ledger.map(l => ({
        Date: formatDate(l.date),
        Remarks: l.notes || 'System Entry',
        Debit: l.debit || 0,
        Credit: l.credit || 0,
        Interest: l.interest || 0,
        Balance: l.balance || 0
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
      
      XLSX.writeFile(wb, `${selectedCust.name}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-full max-w-7xl mx-auto overflow-hidden pb-10">
      {/* Sidebar: Customer List */}
      <div className="w-full lg:w-96 flex flex-col gap-6 shrink-0 h-full overflow-hidden">
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search customers..." 
            className="theme-input w-full pl-12 pr-4 py-4"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar px-1">
          {filteredCustomers.map(c => (
            <button 
              key={c.id}
              onClick={() => fetchLedger(c)}
              className={cn(
                "w-full p-5 rounded-2xl text-left transition-all border group relative overflow-hidden",
                selectedCust?.id === c.id 
                  ? "bg-slate-900 dark:bg-primary border-slate-900 dark:border-primary shadow-lg shadow-slate-200 dark:shadow-primary/20 -translate-y-1" 
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 hover:shadow-md"
              )}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="min-w-0 pr-4">
                  <p className={cn("text-sm font-bold truncate", selectedCust?.id === c.id ? "text-white" : "text-slate-900 dark:text-white")}>{c.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", selectedCust?.id === c.id ? "text-slate-400 dark:text-blue-100" : "text-slate-400 dark:text-slate-500")}>
                      Balance: <span className={cn("font-bold tabular-nums", selectedCust?.id === c.id ? "text-emerald-400 dark:text-emerald-300" : "text-rose-500 dark:text-rose-400")}>{formatCurrency(c.balance || 0)}</span>
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                  selectedCust?.id === c.id ? "bg-white/10 dark:bg-black/20 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600"
                )}>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main: Ledger View */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        {!selectedCust ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 text-slate-200 dark:text-slate-700">
                 <History size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Select a customer</h3>
              <p className="text-sm font-medium mt-2 max-w-[300px] leading-relaxed text-slate-400 dark:text-slate-500">Choose a customer from the list to view their full transaction history and balance.</p>
            </div>
        ) : (
          <>
            <header className="p-8 lg:p-10 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10 gap-8">
              <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{selectedCust.name}</h3>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg">ID: {selectedCust.id.split('-')[0].toUpperCase()}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 rounded-lg">Rate: {selectedCust.interestRate}%</span>
                  </div>
                </div>

                <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-1 flex gap-1 border border-slate-200/60 dark:border-slate-700/60 w-fit">
                   {(['ALL', 'CREDIT', 'CASH'] as const).map(m => (
                      <button 
                        key={m}
                        onClick={() => handleModeChange(m)}
                        className={cn(
                          "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                          ledgerMode === m ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        )}
                      >
                        {m.charAt(0) + m.slice(1).toLowerCase()}
                      </button>
                   ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {ledgerMode === 'CREDIT' && (
                  <button 
                    onClick={() => setPaymentModal(true)}
                    className="theme-button-primary px-5 py-2.5 text-xs"
                  >
                    <CreditCard size={16} />
                    Make Payment
                  </button>
                )}
                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-800 hover:text-white dark:hover:text-white transition-all shadow-sm group shrink-0"
                  title="Export Ledger"
                >
                  <Download size={16} className={cn(isExporting && "animate-bounce")} />
                </button>
              </div>
            </header>

            <div className="p-8 lg:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30 dark:bg-slate-800/30">
               {[
                 { label: 'Total Balance', val: ledger.length > 0 ? ledger[ledger.length-1].balance : 0, color: 'primary' },
                 { label: 'Total Paid', val: ledger.reduce((s,l) => s + l.credit, 0), color: 'emerald' },
                 { label: 'Total interest', val: ledger.reduce((s,l) => s + l.interest, 0), color: 'orange' }
               ].map((stat, i) => (
                 <div key={i} className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-primary/20 dark:hover:border-primary/40 transition-all">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">{stat.label}</p>
                    <p className={cn("text-2xl font-bold tracking-tight transition-all tabular-nums",
                      stat.color === 'primary' ? 'text-slate-900 dark:text-white' : stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
                    )}>
                      {formatCurrency(stat.val)}
                    </p>
                 </div>
               ))}
            </div>

            <div className="flex-1 overflow-x-auto px-8 lg:px-10 pb-10 custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 pr-8">Date</th>
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 pr-8">Remarks</th>
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-right pr-6 font-medium">Debit</th>
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-right pr-6 font-medium">Credit</th>
                    {ledgerMode === 'CREDIT' && (
                      <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-right pr-6 font-medium">Interest</th>
                    )}
                    {ledgerMode === 'CREDIT' && (
                      <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-right pr-6 font-medium">Balance</th>
                    )}
                    <th className="py-6 text-xs font-bold uppercase tracking-tight text-slate-400 dark:text-slate-500 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledger.slice().reverse().map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all group">
                      <td className="py-5 pr-8">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(l.date)}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5 uppercase tracking-widest">#{l.id.slice(0,8).toUpperCase()}</div>
                      </td>
                      <td className="py-5 text-sm text-slate-500 dark:text-slate-400 font-medium max-w-[200px] truncate pr-8">
                        {l.notes || "System Entry"}
                      </td>
                      <td className="py-5 text-right text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums pr-6">
                        {l.debit > 0 ? formatCurrency(l.debit) : "—"}
                      </td>
                      <td className="py-5 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums pr-6">
                        {l.credit > 0 ? formatCurrency(l.credit) : "—"}
                      </td>
                      {ledgerMode === 'CREDIT' && (
                        <td className="py-5 text-right text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums pr-6">
                          {l.interest > 0 ? `+${formatCurrency(l.interest)}` : "—"}
                        </td>
                      )}
                      {ledgerMode === 'CREDIT' && (
                        <td className="py-5 text-right font-bold text-slate-900 dark:text-white tabular-nums text-base pr-6 transition-all group-hover:scale-105 origin-right">
                          {formatCurrency(l.balance)}
                        </td>
                      )}
                      <td className="py-5 text-right">
                        {l.orderId && (
                          <button 
                            onClick={() => viewOrder(l.orderId!)}
                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-700 hover:text-white dark:hover:text-white transition-all shadow-sm ml-auto"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-250 space-y-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Make Payment</h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Settle outstanding balance</p>
              </div>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">Payment Amount (₹)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      className="theme-input w-full px-6 py-6 text-4xl !font-bold tabular-nums" 
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1 block">Notes / Remarks</label>
                    <textarea 
                      placeholder="Payment details, reference number, etc." 
                      className="theme-input w-full px-6 py-4 min-h-[120px] resize-none" 
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                 </div>
                 <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                   <button 
                    onClick={() => setPaymentModal(false)}
                    className="theme-button-secondary flex-1"
                   >
                     Cancel
                   </button>
                   <button 
                    onClick={submitPayment}
                    className="theme-button-primary flex-[1.5]"
                   >
                     Record Payment
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm">
           <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-250 flex flex-col max-h-[85vh] space-y-8">
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 dark:bg-primary/20 text-primary rounded-xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Order Details</h3>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Order # {viewingOrder.id.slice(0,8).toUpperCase()}</p>
                  </div>
                </div>
                <button onClick={() => setViewingOrder(null)} className="w-10 h-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                   <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 block">Itemized Manifest</label>
                  <div className="space-y-4">
                    {viewingOrder.items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center pb-4 border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0">
                        <div>
                           <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.serviceName}</p>
                           <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{item.quantity} x {formatCurrency(item.rate)}</p>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {viewingOrder.remarks && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                    <label className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest block mb-2">Remarks</label>
                    <p className="text-sm text-amber-900/80 dark:text-amber-200 font-medium leading-relaxed">{viewingOrder.remarks}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Payment</span>
                      <span className="text-xs font-bold text-primary uppercase">{viewingOrder.paymentType}</span>
                   </div>
                   <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-right">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Total</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">{formatCurrency(viewingOrder.totalAmount)}</span>
                   </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={() => setViewingOrder(null)}
                  className="w-full py-4 bg-slate-900 dark:bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200 dark:shadow-primary/20 hover:bg-primary dark:hover:bg-blue-600 transition-all active:scale-[0.98]"
                >
                  Close Audit
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
