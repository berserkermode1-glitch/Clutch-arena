import React, { useState } from 'react';
import { User, SupportTicket, Tournament } from '../../types/tournament';
import { appStore } from '../../services/store';

interface HelpSupportScreenProps {
  user: User;
  onBack: () => void;
  onToast: (msg: string) => void;
}

const FAQS_DATA = [
  {
    category: 'Rooms & Credentials',
    q: 'How do I get the Custom Room ID and Password?',
    a: 'Once a tournament is marked "Live" by our arena marshals (typically 15-20 minutes before match time), the Room ID and Password unlock automatically in the "My Matches" tab. Copy the credentials and enter the in-game custom room directly.',
  },
  {
    category: 'Rooms & Credentials',
    q: 'Where do I enter my Free Fire UID?',
    a: 'Go to Settings > Account & Profile > Free Fire UID. Enter your numerical in-game UID. Room marshals use this exact UID to invite you to private lobbies and verify kill scores.',
  },
  {
    category: 'Verification & Results',
    q: 'How are match winners and scores verified?',
    a: 'Arena marshals record official match replays and end-screen leaderboards. Winners are announced directly on Clutch Arena and prizes are credited automatically to the verified player ledger.',
  },
  {
    category: 'Wallet & Clearance',
    q: 'Why are cash deposits and bank withdrawals paused?',
    a: 'Clutch Arena is operating in strict regulatory compliance mode while finalizing payment gateway clearances. Paid fiat transactions and direct bank cashouts are temporarily disabled to ensure player funds safety. Free scrims and internal tournament credits remain active.',
  },
  {
    category: 'Fair Play',
    q: 'How do I report a hacker, teamer, or emulator user?',
    a: 'Use the "File Dispute / Report" tab right here. Select "Player Report / Cheat", provide the suspect player’s UID or in-game name, and attach match details. Our anti-cheat marshals review logs within 4 hours.',
  },
  {
    category: 'Fair Play',
    q: 'What happens if a room server crashes during a match?',
    a: 'If a match suffers a verified server drop affecting more than 20% of participants, the tournament is nullified and all entry credits are refunded. File a "Tournament Dispute" ticket to notify marshals.',
  },
];

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  user,
  onBack,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'faqs' | 'file_ticket' | 'my_tickets' | 'contact'>('faqs');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [faqSearch, setFaqSearch] = useState('');

  // Form State
  const [ticketType, setTicketType] = useState<SupportTicket['type']>('tournament_dispute');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketTournamentId, setTicketTournamentId] = useState<string>('');
  const [ticketReportedPlayer, setTicketReportedPlayer] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tournaments: Tournament[] = appStore.getTournaments();
  const userTickets: SupportTicket[] = appStore.getSupportTickets(user.id);

  const handleFaqToggle = (idx: number) => {
    setExpandedFaqIndex(expandedFaqIndex === idx ? null : idx);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) {
      onToast('Please fill in both subject and description.');
      return;
    }

    setIsSubmitting(true);
    const res = appStore.createSupportTicket({
      userId: user.id,
      username: user.username,
      type: ticketType,
      subject: ticketSubject,
      description: ticketDescription,
      tournament_id: ticketTournamentId ? parseInt(ticketTournamentId) : undefined,
      reported_player: ticketReportedPlayer,
    });
    setIsSubmitting(false);

    if (res.success) {
      onToast(res.message);
      // Reset form
      setTicketSubject('');
      setTicketDescription('');
      setTicketTournamentId('');
      setTicketReportedPlayer('');
      setActiveTab('my_tickets');
    }
  };

  const filteredFaqs = FAQS_DATA.filter(f => {
    if (!faqSearch.trim()) return true;
    const q = faqSearch.toLowerCase();
    return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.category.toLowerCase().includes(q);
  });

  const getStatusBadge = (status: SupportTicket['status']) => {
    switch (status) {
      case 'Open':
        return <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">Open</span>;
      case 'In Review':
        return <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-full">In Review</span>;
      case 'Resolved':
        return <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">Resolved</span>;
      case 'Closed':
      default:
        return <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">Closed</span>;
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
          Help & Disputes
        </span>
      </div>

      {/* Screen Title */}
      <div>
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center text-xs">
            <i className="fa-solid fa-headset"></i>
          </span>
          Help & Support Center
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Rules guide, FAQs, tournament dispute submissions, and player reports.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('faqs')}
          className={`py-1.5 rounded-lg transition ${
            activeTab === 'faqs' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          FAQs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('file_ticket')}
          className={`py-1.5 rounded-lg transition ${
            activeTab === 'file_ticket' ? 'bg-purple-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Dispute / Report
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_tickets')}
          className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1 ${
            activeTab === 'my_tickets' ? 'bg-purple-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Tickets</span>
          <span className="text-[9px] px-1 rounded-full bg-slate-800 text-slate-300 font-mono">
            {userTickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contact')}
          className={`py-1.5 rounded-lg transition ${
            activeTab === 'contact' ? 'bg-purple-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Channels
        </button>
      </div>

      {/* ================= TAB 1: FAQS ================= */}
      {activeTab === 'faqs' && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 text-xs">
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>
            <input
              type="text"
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
              placeholder="Search FAQs (rooms, rules, free fire UID, payouts)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Accordion Items */}
          <div className="space-y-2">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No FAQs matching "{faqSearch}". Try another search term.
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = expandedFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition"
                  >
                    <button
                      type="button"
                      onClick={() => handleFaqToggle(idx)}
                      className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-bold text-white hover:text-cyan-300 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        <span>{faq.q}</span>
                      </div>
                      <i
                        className={`fa-solid fa-chevron-down text-slate-400 text-[10px] transition-transform ${
                          isOpen ? 'rotate-180 text-cyan-400' : ''
                        }`}
                      ></i>
                    </button>

                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/60 pt-2.5">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-purple-400 block mb-1">
                          Category: {faq.category}
                        </span>
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 2: FILE DISPUTE / REPORT ================= */}
      {activeTab === 'file_ticket' && (
        <form onSubmit={handleFormSubmit} className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3.5">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <i className="fa-solid fa-triangle-exclamation text-amber-400"></i> Submit Dispute or Player Report
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Marshals investigate match replays, server drops, or anti-cheat reports.
            </p>
          </div>

          {/* Issue Type */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Issue Category <span className="text-purple-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'tournament_dispute', label: 'Match Dispute', icon: 'fa-trophy' },
                { id: 'player_report', label: 'Cheat / Toxic Report', icon: 'fa-shield-halved' },
                { id: 'account_issue', label: 'Account / UID Inquiry', icon: 'fa-user' },
                { id: 'other', label: 'General Feedback', icon: 'fa-comments' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTicketType(opt.id as any)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition ${
                    ticketType === opt.id
                      ? 'bg-purple-950/70 border-purple-500 text-white font-bold ring-1 ring-purple-400/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${opt.icon} text-xs text-purple-400`}></i>
                  <span className="text-[10px] leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Related Tournament Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Related Tournament / Match (Optional)
            </label>
            <select
              value={ticketTournamentId}
              onChange={e => setTicketTournamentId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="">-- None / General Inquiry --</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>
                  #{t.id} - {t.title} ({t.game_name})
                </option>
              ))}
            </select>
          </div>

          {/* Suspect Player UID if cheat report */}
          {(ticketType === 'player_report' || ticketType === 'tournament_dispute') && (
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Reported Player Free Fire UID / Gamer Tag
              </label>
              <input
                type="text"
                value={ticketReportedPlayer}
                onChange={e => setTicketReportedPlayer(e.target.value)}
                placeholder="e.g. FF-77281930 or vampire_pro"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Subject Summary <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              value={ticketSubject}
              onChange={e => setTicketSubject(e.target.value)}
              placeholder="e.g. Room server delay in Match #104 or Teaming in Solo"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">
              Detailed Description & Evidence <span className="text-purple-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={ticketDescription}
              onChange={e => setTicketDescription(e.target.value)}
              placeholder="Provide match timestamps, weapon anomalies, or specific details..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs shadow-lg shadow-purple-600/25 active:scale-98 transition flex items-center justify-center gap-1.5"
          >
            <i className="fa-solid fa-paper-plane"></i>
            <span>{isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
          </button>
        </form>
      )}

      {/* ================= TAB 3: MY TICKETS ================= */}
      {activeTab === 'my_tickets' && (
        <div className="space-y-3">
          {userTickets.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2 text-xl">
                <i className="fa-solid fa-ticket-simple"></i>
              </div>
              <h3 className="text-xs font-bold text-slate-300">No support tickets filed</h3>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                Need help with a room, tournament result, or player behavior? Tap "Dispute / Report" to submit.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('file_ticket')}
                className="mt-3 text-xs font-bold text-cyan-400 hover:underline"
              >
                File a Ticket &rarr;
              </button>
            </div>
          ) : (
            userTickets.map(ticket => (
              <div
                key={ticket.id}
                className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Ticket #{ticket.id}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{ticket.subject}</h4>
                  </div>
                  <div>{getStatusBadge(ticket.status)}</div>
                </div>

                <p className="text-[11px] text-slate-300 leading-snug bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
                  {ticket.description}
                </p>

                {ticket.reported_player && (
                  <div className="text-[10px] text-rose-300 font-mono">
                    Reported Player: <strong>{ticket.reported_player}</strong>
                  </div>
                )}

                {/* Staff Response */}
                {ticket.response && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-[11px] text-emerald-200 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center gap-1">
                      <i className="fa-solid fa-user-shield"></i> Arena Marshal Resolution:
                    </span>
                    <p>{ticket.response}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-500">
                  <span>Category: {ticket.type}</span>
                  <span>{new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ================= TAB 4: CHANNELS ================= */}
      {activeTab === 'contact' && (
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <i className="fa-solid fa-comments text-cyan-400"></i> Official Community & Support
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Connect directly with arena marshals, announcements, and match hosts.
            </p>
          </div>

          <div className="space-y-2 pt-1">
            {/* Discord */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-base">
                  <i className="fa-brands fa-discord"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Official Discord Server</span>
                  <span className="text-[10px] text-slate-400">Live marshals & 24/7 lobby voice channels</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToast('Discord invitation link copied: discord.gg/clutcharena')}
                className="text-[11px] font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-2.5 py-1 rounded-lg transition hover:bg-indigo-900"
              >
                Join Server
              </button>
            </div>

            {/* Telegram */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-base">
                  <i className="fa-brands fa-telegram"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Telegram Scrims Alert</span>
                  <span className="text-[10px] text-slate-400">Instant room ID and password broadcasts</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToast('Telegram channel link copied: t.me/clutcharenas')}
                className="text-[11px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-lg transition hover:bg-cyan-900"
              >
                Subscribe
              </button>
            </div>

            {/* Email */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-base">
                  <i className="fa-solid fa-envelope"></i>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Direct Email Support</span>
                  <span className="text-[10px] text-slate-400">support@clutcharena.gg</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText('support@clutcharena.gg');
                  onToast('Email copied: support@clutcharena.gg');
                }}
                className="text-[11px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2.5 py-1 rounded-lg transition hover:bg-purple-900"
              >
                Copy Email
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
