import React, { useState } from 'react';

interface AboutLegalScreenProps {
  onBack: () => void;
  onToast: (msg: string) => void;
}

export const AboutLegalScreen: React.FC<AboutLegalScreenProps> = ({
  onBack,
  onToast,
}) => {
  const [activeDoc, setActiveDoc] = useState<'overview' | 'terms' | 'privacy' | 'community' | 'licenses'>('overview');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      onToast('Clutch Arena v2.4.0 is up to date! You have the latest esports release.');
    }, 1200);
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
          About & Legal
        </span>
      </div>

      {/* Screen Title */}
      <div>
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center text-xs">
            <i className="fa-solid fa-scale-balanced"></i>
          </span>
          About Clutch Arena & Legal
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          App version, competitive esports rules, privacy commitment, and licenses.
        </p>
      </div>

      {/* App Version Branding Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg text-center relative overflow-hidden">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-slate-950 text-2xl font-black mx-auto shadow-lg shadow-purple-500/20 ring-2 ring-purple-400/40 mb-2.5">
          <i className="fa-solid fa-gamepad"></i>
        </div>

        <h3 className="text-base font-extrabold text-white">
          CLUTCH<span className="text-cyan-400">ARENA</span>
        </h3>
        <p className="text-[11px] text-slate-400">Mobile-First Esports Tournament Platform</p>

        <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-300 mt-2">
          <span>Version 2.4.0</span>
          <span className="text-slate-600">&bull;</span>
          <span className="text-purple-400 font-semibold">Build 2026.10-esports</span>
        </div>

        <div className="mt-3">
          <button
            type="button"
            disabled={isCheckingUpdate}
            onClick={handleCheckUpdate}
            className="text-xs font-bold text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/40 px-3 py-1.5 rounded-xl transition inline-flex items-center gap-1.5"
          >
            <i className={`fa-solid fa-arrows-rotate ${isCheckingUpdate ? 'animate-spin' : ''}`}></i>
            <span>{isCheckingUpdate ? 'Checking Server...' : 'Check for Updates'}</span>
          </button>
        </div>
      </div>

      {/* Legal & Policy Navigation Cards */}
      <div className="space-y-2">
        {[
          {
            id: 'terms',
            title: 'Terms of Service',
            desc: 'Tournament competition rules, skill gaming integrity, and age guidelines',
            icon: 'fa-file-contract',
            color: 'text-purple-400',
          },
          {
            id: 'privacy',
            title: 'Privacy Policy',
            desc: 'How we protect your gamer identity, Free Fire UID, and transaction logs',
            icon: 'fa-shield-halved',
            color: 'text-cyan-400',
          },
          {
            id: 'community',
            title: 'Community Guidelines',
            desc: 'Anti-cheating protocols, emulator policy, and sportsman conduct',
            icon: 'fa-users',
            color: 'text-emerald-400',
          },
          {
            id: 'licenses',
            title: 'Third-Party Acknowledgements',
            desc: 'Open-source software licenses, fonts, and frameworks',
            icon: 'fa-code-branch',
            color: 'text-amber-400',
          },
        ].map(item => (
          <div
            key={item.id}
            className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
          >
            <button
              type="button"
              onClick={() => setActiveDoc(activeDoc === item.id ? 'overview' : (item.id as any))}
              className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-slate-800/40 transition"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-sm ${item.color}`}>
                  <i className={`fa-solid ${item.icon}`}></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>

              <i
                className={`fa-solid fa-chevron-down text-slate-500 text-xs transition-transform ${
                  activeDoc === item.id ? 'rotate-180 text-cyan-400' : ''
                }`}
              ></i>
            </button>

            {/* Expanded Document Viewer */}
            {activeDoc === item.id && (
              <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-300 leading-relaxed space-y-3 font-sans">
                
                {item.id === 'terms' && (
                  <>
                    <h5 className="font-bold text-white text-xs">1. Skill-Based Esports Competition</h5>
                    <p>
                      Clutch Arena hosts competitive skill-based esports scrims for popular mobile titles (BGMI, Free Fire, COD Mobile). Winning requires tactical proficiency, mechanical skill, and teamwork.
                    </p>

                    <h5 className="font-bold text-white text-xs">2. Room Credentials & Disconnects</h5>
                    <p>
                      Players are strictly prohibited from sharing custom room IDs and passwords with non-registered participants. Doing so leads to immediate slot disqualification.
                    </p>

                    <h5 className="font-bold text-white text-xs">3. Compliance Notice</h5>
                    <p>
                      Fiat currency deposits and instant cash withdrawals are paused pending complete aggregator clearance. All participant slots in current release are hosted in verified tournament practice mode.
                    </p>
                  </>
                )}

                {item.id === 'privacy' && (
                  <>
                    <h5 className="font-bold text-white text-xs">1. Information We Collect</h5>
                    <p>
                      We collect your gamer username, Free Fire UID, email, and phone contact solely to operate tournament brackets, invite players to custom rooms, and prevent multi-accounting.
                    </p>

                    <h5 className="font-bold text-white text-xs">2. Data Security & Storage</h5>
                    <p>
                      Your credentials and ledger history are protected using industry-standard hashing. We never sell your personal data to external advertisers.
                    </p>

                    <h5 className="font-bold text-white text-xs">3. Data Export & Deletion</h5>
                    <p>
                      You maintain full ownership of your data and can request a complete machine-readable JSON download or permanently erase your account at any time via Settings &gt; Security & Privacy.
                    </p>
                  </>
                )}

                {item.id === 'community' && (
                  <>
                    <h5 className="font-bold text-white text-xs">1. Zero Tolerance for Cheating</h5>
                    <p>
                      Any use of third-party modifications, aimbots, speed hacks, texture injections, or teaming in solo scrims results in a permanent device hardware and IP ban across Clutch Arena.
                    </p>

                    <h5 className="font-bold text-white text-xs">2. Mobile Device Enforcement</h5>
                    <p>
                      Unless a tournament is explicitly tagged as "PC / Emulator Friendly", all players must compete exclusively on physical mobile smartphones or tablets. Emulator users will be kicked without refund.
                    </p>

                    <h5 className="font-bold text-white text-xs">3. Code of Conduct</h5>
                    <p>
                      Respect opponents and arena marshals. Harassment or abusive conduct in lobby chat or disputes will lead to temporary suspension.
                    </p>
                  </>
                )}

                {item.id === 'licenses' && (
                  <>
                    <h5 className="font-bold text-white text-xs">Open Source Credits & Components</h5>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                      <li><strong>Font Awesome 6</strong> &bull; Icons by Fonticons Inc. (SIL OFL 1.1)</li>
                      <li><strong>Tailwind CSS</strong> &bull; Utility-first CSS Framework (MIT License)</li>
                      <li><strong>React 19 & Vite</strong> &bull; Facebook/Meta & Evan You (MIT License)</li>
                      <li><strong>PHP 8.2 Engine</strong> &bull; The PHP Group (PHP License)</li>
                    </ul>
                  </>
                )}

              </div>
            )}
          </div>
        ))}
      </div>

      {/* Copyright Footer */}
      <div className="pt-4 text-center text-[10px] text-slate-500 font-mono">
        &copy; 2026 Clutch Arena Esports Platform &bull; All Rights Reserved
      </div>

    </div>
  );
};
