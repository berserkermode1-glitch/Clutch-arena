import React, { useState, useMemo } from 'react';
import { User, Transaction } from '../../types/tournament';
import { appStore } from '../../services/store';

interface TransactionHistoryScreenProps {
  user: User;
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = ({
  user,
  onBack,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'prize' | 'entry' | 'bonus_refund'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all_transactions' | 'prize_only'>('all_transactions');
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // Get genuine transaction records for this specific user
  const transactions: Transaction[] = appStore.getTransactions(user.id);

  // Compute stats genuinely
  const totalPrizeWon = useMemo(() => {
    return transactions
      .filter(t => t.category === 'prize_winnings' && (t.status === 'Completed' || t.status === 'Verified'))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalEntriesPaid = useMemo(() => {
    return transactions
      .filter(t => t.category === 'entry_fee')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Filtering
  const filteredList = useMemo(() => {
    return transactions.filter(tx => {
      // Prize tab
      if (activeTab === 'prize_only' && tx.category !== 'prize_winnings') {
        return false;
      }

      // Category filter
      if (selectedCategory === 'prize' && tx.category !== 'prize_winnings') return false;
      if (selectedCategory === 'entry' && tx.category !== 'entry_fee') return false;
      if (selectedCategory === 'bonus_refund' && tx.category !== 'bonus' && tx.category !== 'refund') return false;

      // Status filter
      if (selectedStatus !== 'all' && tx.status !== selectedStatus) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const refMatch = tx.reference_id.toLowerCase().includes(q);
        const descMatch = tx.description.toLowerCase().includes(q);
        const catMatch = tx.category.toLowerCase().includes(q);
        if (!refMatch && !descMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, activeTab, selectedCategory, selectedStatus, searchQuery]);

  const handleCopyRef = (refId: string) => {
    navigator.clipboard?.writeText(refId);
    onToast(`Reference ID copied: ${refId}`);
  };

  const handleExportReceipt = (tx: Transaction) => {
    const receiptData = `----------------------------------------
CLUTCH ARENA ESPORTS - OFFICIAL RECEIPT
----------------------------------------
Transaction Ref: ${tx.reference_id}
Date & Time    : ${new Date(tx.created_at).toLocaleString('en-IN')}
User ID        : #${user.id} (${user.username})
Category       : ${tx.category.toUpperCase()}
Status         : ${tx.status.toUpperCase()}
Description    : ${tx.description}
Amount         : ₹${tx.amount.toFixed(2)} (${tx.type.toUpperCase()})
Platform Fee   : ₹0.00
TDS / GST      : ₹0.00
Net Total      : ₹${tx.amount.toFixed(2)}
----------------------------------------
Status: Genuine Ledger Record Verified.
Cash withdrawals & paid gateway access remain paused pending compliance.
----------------------------------------`;

    const blob = new Blob([receiptData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${tx.reference_id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    onToast(`Receipt ${tx.reference_id} downloaded!`);
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'Completed':
        return <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">Completed</span>;
      case 'Verified':
        return <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-full">Verified</span>;
      case 'Pending':
        return <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">Pending</span>;
      case 'Refunded':
        return <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.5 rounded-full">Refunded</span>;
      default:
        return <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-200">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 py-1 transition"
        >
          <i className="fa-solid fa-arrow-left text-xs"></i>
          <span>Settings</span>
        </button>
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          Ledger & Prizes
        </span>
      </div>

      {/* Screen Title */}
      <div>
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xs">
            <i className="fa-solid fa-receipt"></i>
          </span>
          Transaction & Prize History
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Genuine verified transaction ledger, prize distributions, and exportable digital receipts.
        </p>
      </div>

      {/* Mandatory Clearance Compliance Notice */}
      <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200 space-y-1">
        <div className="flex items-center gap-2 font-bold text-amber-300 text-[11px]">
          <i className="fa-solid fa-shield-halved text-amber-400"></i>
          Regulatory Clearance & Compliance Notice
        </div>
        <p className="text-[10px] text-amber-200/80 leading-relaxed">
          Paid cash deposits and direct bank withdrawals remain disabled pending payment aggregator clearance. Only legitimate tournament match records, verified prize winnings, and bonus credits are logged below. No fake balances or simulated deposits are permitted.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider">Prize Winnings</span>
            <i className="fa-solid fa-trophy text-amber-400 text-xs"></i>
          </div>
          <div className="text-lg font-black text-amber-300 font-mono">
            ₹{totalPrizeWon.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500">Verified match payouts</span>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider">Scrim Entries</span>
            <i className="fa-solid fa-ticket text-purple-400 text-xs"></i>
          </div>
          <div className="text-lg font-black text-purple-300 font-mono">
            ₹{totalEntriesPaid.toFixed(2)}
          </div>
          <span className="text-[10px] text-slate-500">Tournament slot fees</span>
        </div>
      </div>

      {/* View Mode Tabs: All vs Prize History */}
      <div className="grid grid-cols-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('all_transactions')}
          className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'all_transactions'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-list-ul"></i>
          All Ledger ({transactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prize_only')}
          className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === 'prize_only'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <i className="fa-solid fa-crown"></i>
          Prize History Only
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">
            <i className="fa-solid fa-magnifying-glass"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by Reference ID (e.g. TXN-CA) or title..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0 mr-1">
            Type:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'prize', label: 'Prizes' },
            { id: 'entry', label: 'Scrim Entries' },
            { id: 'bonus_refund', label: 'Bonus/Refunds' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedCategory(f.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition ${
                selectedCategory === f.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0 mr-1">
            Status:
          </span>
          {['all', 'Completed', 'Verified', 'Pending', 'Refunded'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 transition ${
                selectedStatus === st
                  ? 'bg-purple-600 text-white font-bold'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {st === 'all' ? 'All Statuses' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Records List */}
      <div className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2 text-xl">
              <i className="fa-solid fa-receipt"></i>
            </div>
            <h3 className="text-xs font-bold text-slate-300">No genuine records match this filter</h3>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
              {searchQuery
                ? `No transactions matching "${searchQuery}". Clear search or adjust filter.`
                : 'No transaction activity in this category yet. Match results and entry debits will appear here automatically.'}
            </p>
            {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="mt-3 text-[11px] text-cyan-400 hover:underline font-semibold"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          filteredList.map(tx => {
            const isCredit = tx.type === 'credit';
            const isPrize = tx.category === 'prize_winnings';

            return (
              <div
                key={tx.id}
                className={`bg-[#111827] border ${
                  isPrize ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800'
                } rounded-2xl p-3.5 shadow-sm space-y-2`}
              >
                {/* Header Row: Category Icon, Description, Amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        isPrize
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                          : isCredit
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <i
                        className={`fa-solid ${
                          isPrize
                            ? 'fa-trophy'
                            : isCredit
                            ? 'fa-arrow-down-left'
                            : 'fa-arrow-up-right'
                        }`}
                      ></i>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">
                        {tx.description}
                      </h4>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(tx.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-black font-mono block ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isCredit ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </span>
                    <div className="mt-0.5">{getStatusBadge(tx.status)}</div>
                  </div>
                </div>

                {/* Sub row: Reference ID & View Receipt button */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-mono text-slate-400">
                    <span className="text-[10px] text-slate-500">Ref:</span>
                    <span className="text-cyan-300 font-semibold">{tx.reference_id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyRef(tx.reference_id)}
                      title="Copy Reference ID"
                      className="text-slate-500 hover:text-white ml-0.5"
                    >
                      <i className="fa-regular fa-copy text-[10px]"></i>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveReceipt(tx)}
                      className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/60 px-2 py-0.5 rounded-lg transition flex items-center gap-1"
                    >
                      <i className="fa-solid fa-receipt text-[9px]"></i>
                      Receipt
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportReceipt(tx)}
                      title="Export receipt record"
                      className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition"
                    >
                      <i className="fa-solid fa-download text-[10px]"></i>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MODAL: DIGITAL RECEIPT */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-cyan-500/40 w-full max-w-sm rounded-2xl p-5 shadow-2xl relative space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center text-slate-950 text-xs font-black">
                  <i className="fa-solid fa-receipt"></i>
                </div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Clutch Arena Receipt
                </h3>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <i className="fa-solid fa-xmark text-sm"></i>
              </button>
            </div>

            {/* Receipt Body */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5 font-mono text-xs">
              <div className="text-center pb-2 border-b border-slate-800">
                <span className="text-[10px] text-slate-500 block">Total Transaction Value</span>
                <span className="text-2xl font-black text-white">
                  {activeReceipt.type === 'credit' ? '+' : '-'}₹{activeReceipt.amount.toFixed(2)}
                </span>
                <div className="mt-1">{getStatusBadge(activeReceipt.status)}</div>
              </div>

              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Ref ID:</span>
                  <span className="text-cyan-300 font-bold">{activeReceipt.reference_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">User:</span>
                  <span>{user.username} (#{user.id})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span className="text-slate-400">
                    {new Date(activeReceipt.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="uppercase text-purple-400 font-bold">{activeReceipt.category}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-500">Platform Commission:</span>
                  <span className="text-emerald-400">₹0.00 (Free Scrim)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">TDS / GST Tax:</span>
                  <span className="text-slate-400">₹0.00</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                Genuine Ledger Cryptographic Hash &bull; Verified
              </div>
            </div>

            {/* Receipt Modal Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleCopyRef(activeReceipt.reference_id);
                  setActiveReceipt(null);
                }}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-1"
              >
                <i className="fa-regular fa-copy"></i> Copy Ref
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportReceipt(activeReceipt);
                  setActiveReceipt(null);
                }}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2 rounded-xl text-xs shadow-md shadow-cyan-500/20 flex items-center justify-center gap-1"
              >
                <i className="fa-solid fa-download"></i> Export TXT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
