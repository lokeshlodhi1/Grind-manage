import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ArrowLeft, 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Hash,
  Activity,
  CreditCard,
  Wallet,
  Receipt,
  Printer,
  Download,
  Phone,
  MapPin,
  Zap
} from 'lucide-react';
import { formatCurrency, formatDate, cn, apiFetch } from '../lib/utils';
import { Order } from '../types';

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/orders/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setOrder(data);
        setLoading(false);
      });
  }, [id]);

  const handleDownload = () => {
    if (!order) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text("Official Order Audit", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Digital Code: ${order.id}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);
    
    // Customer Info
    doc.setTextColor(0);
    doc.setFontSize(14);
    doc.text("Customer Details", 14, 45);
    doc.setFontSize(10);
    doc.text(`Name: ${order.customerName}`, 14, 52);
    doc.text(`Phone: ${order.customerDetails?.phone || 'N/A'}`, 14, 57);
    doc.text(`Address: ${order.customerDetails?.address || 'N/A'}`, 14, 62);
    
    // Settle Info
    doc.text(`Payment: ${order.paymentType}`, 140, 52);
    doc.text(`Status: ${order.status}`, 140, 57);
    doc.text(`Date: ${formatDate(order.date)}`, 140, 62);

    // Items Table
    const tableData = order.items?.map((item, idx) => [
      idx + 1,
      item.serviceName,
      `${item.quantity} ${item.pricingType}`,
      formatCurrency(item.rate, 'Rs.'),
      formatCurrency(item.amount, 'Rs.')
    ]) || [];

    autoTable(doc, {
      startY: 75,
      head: [['#', 'Service', 'Quantity', 'Rate', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable?.cursor?.y || 75;
    const summaryY = finalY + 15;
    doc.setFontSize(10);
    doc.text(`Subtotal: ${formatCurrency(order.subtotal || 0, 'Rs.')}`, 140, summaryY);
    
    let taxY = summaryY;
    order.appliedTaxes?.forEach(tax => {
      taxY += 5;
      doc.text(`${tax.name} (${tax.rate}%): +${formatCurrency(tax.amount || 0, 'Rs.')}`, 140, taxY);
    });

    doc.setFontSize(14);
    doc.text(`Total Amount: ${formatCurrency(order.totalAmount, 'Rs.')}`, 140, taxY + 10);

    if (order.remarks) {
      doc.setFontSize(10);
      doc.text("Remarks:", 14, summaryY);
      doc.setFontSize(9);
      doc.text(order.remarks, 14, summaryY + 5, { maxWidth: 100 });
    }

    doc.save(`Receipt_${(order.id || '').split('-')[0]}.pdf`);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Loading Order Details...</p>
      </div>
    </div>
  );

  if (!order) return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-slate-50 dark:bg-slate-950">
       <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
         <Activity size={32} className="text-slate-300 dark:text-slate-700" />
       </div>
       <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Order Not Found</h2>
       <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm text-center">The requested order could not be retrieved. It may have been deleted or the ID is incorrect.</p>
       <button 
        onClick={() => navigate('/pos')}
        className="px-8 py-4 bg-slate-900 dark:bg-primary text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all hover:bg-primary dark:hover:bg-blue-600 active:scale-95 shadow-lg"
       >
         Back to POS
       </button>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 pb-24 custom-scrollbar">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-8">
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-3 text-slate-500 hover:text-primary transition-all font-bold text-[10px] uppercase tracking-widest"
        >
          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center transition-all group-hover:bg-primary group-hover:text-white shadow-sm border border-slate-200 dark:border-slate-800">
            <ArrowLeft size={16} />
          </div>
          Back to Archives
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Ticket */}
          <div className="lg:col-span-2 space-y-8">
             <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-slate-900 dark:bg-slate-800 text-primary rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                      <Receipt size={32} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Order Information</h1>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                          ID: #{(order.id || '').split('-')[0].toUpperCase()}
                        </span>
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border",
                          order.status === 'REJECTED' ? "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50" :
                          order.status === 'DELIVERED' ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50" : "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50"
                        )}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="w-12 h-12 bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-900 dark:hover:bg-slate-950 hover:text-white dark:hover:text-white transition-all shadow-sm flex items-center justify-center"
                      title="Print Order"
                    >
                      <Printer size={20} />
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="w-12 h-12 bg-primary text-white rounded-xl hover:bg-slate-900 dark:hover:bg-blue-600 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
                      title="Download PDF"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                   <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700 relative group">
                      <div className="flex items-center gap-2 mb-6 text-slate-400 dark:text-slate-500">
                        <User size={14} className="group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Customer Details</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{order.customerName}</p>
                      
                      {order.customerDetails && (
                        <div className="mt-6 space-y-2">
                          {order.customerDetails.phone && (
                            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                              <Phone size={14} className="text-slate-300 dark:text-slate-600" />
                              {order.customerDetails.phone}
                            </div>
                          )}
                          {order.customerDetails.address && (
                            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                              <MapPin size={14} className="text-slate-300 dark:text-slate-600" />
                              {order.customerDetails.address}
                            </div>
                          )}
                        </div>
                      )}
                   </div>
                   <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700 relative group">
                      <div className="flex items-center gap-2 mb-6 text-slate-400 dark:text-slate-500">
                        <CreditCard size={14} className="group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Payment Method</span>
                      </div>
                      <p className="text-2xl font-bold text-primary tracking-tight">{order.paymentType}</p>
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-6">Secure Transaction</p>
                   </div>
                </div>

                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-8 pl-1">
                    <div className="w-1 h-3.5 bg-primary rounded-full"></div>
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Service Distribution</label>
                  </div>
                  <div className="space-y-4">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/30 dark:hover:border-primary/50 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                        <div className="flex items-center gap-6">
                           <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                             <Zap size={20} />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white transition-colors group-hover:text-primary leading-tight">{item.serviceName}</p>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                              {item.quantity} {item.pricingType} Units <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span> Rate: {formatCurrency(item.rate)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {order.remarks && (
                  <div className="p-8 bg-slate-900 dark:bg-slate-950 rounded-2xl text-white relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-4 text-primary dark:text-primary font-bold uppercase tracking-widest text-[10px]">
                      <FileText size={16} />
                      Order Remarks
                    </div>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium leading-relaxed">"{order.remarks}"</p>
                  </div>
                )}
             </div>
          </div>

          {/* Side Summary */}
          <div className="space-y-8">
             <div className="bg-slate-950 dark:bg-black rounded-3xl p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-10 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                      <Wallet size={16} />
                      Yield Summary
                   </div>
                   
                   <div className="space-y-6 mb-8 pt-8 border-t border-white/10 dark:border-white/5">
                      <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-600">
                        <span>Subtotal</span>
                        <span className="text-white text-sm">{formatCurrency(order.subtotal)}</span>
                      </div>
                      {order.appliedTaxes?.map((t, i) => (
                        <div key={i} className="flex justify-between items-center text-[11px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-700">
                          <span className="flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-slate-700" />
                            {t.name} ({t.rate}%)
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 text-sm">+{formatCurrency(t.amount)}</span>
                        </div>
                      ))}
                   </div>
                   
                   <div className="pt-8 border-t border-white/10 dark:border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">Total Amount Payable</p>
                      <p className="text-4xl font-bold tracking-tight text-white tabular-nums leading-none">{formatCurrency(order.totalAmount)}</p>
                   </div>
                </div>
             </div>

             <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-8">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-10 block">Delivery Timeline</label>
                <div className="space-y-10 relative">
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-50 dark:bg-slate-800"></div>
                  
                  <div className="flex items-start gap-6 relative group">
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0 group-hover:border-primary group-hover:text-primary transition-all">
                      <Clock size={18} />
                    </div>
                    <div className="pt-1.5">
                       <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 group-hover:text-primary transition-colors">Order Placed</p>
                       <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{formatDate(order.date)}</p>
                       <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>

                  {order.status === 'REJECTED' ? (
                     <div className="flex items-start gap-6 relative group">
                      <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                        <Activity size={18} />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">Cancelled</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{formatDate(order.deliveryDate || order.date)}</p>
                        <p className="text-[10px] text-rose-400 dark:text-rose-600 font-medium mt-1.5 italic">Order Voided</p>
                      </div>
                    </div>
                  ) : order.deliveryDate ? (
                     <div className="flex items-start gap-6 relative group">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-500 shrink-0 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/10">
                        <ShieldCheck size={18} />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">Delivered</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{formatDate(order.deliveryDate)}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1.5">{new Date(order.deliveryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-6 relative opacity-40">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-700 shrink-0">
                        <Activity size={18} />
                      </div>
                      <div className="pt-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Processing</p>
                        <p className="text-sm font-bold text-slate-400 italic">Awaiting Fulfillment</p>
                      </div>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
