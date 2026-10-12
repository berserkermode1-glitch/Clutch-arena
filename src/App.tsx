import React, { useState, useEffect } from 'react';
import { UserApp } from './components/UserApp/UserApp';
import { AdminApp } from './components/AdminApp/AdminApp';
import { CodeExplorer } from './components/CodeExplorer/CodeExplorer';
import { DatabaseRunner } from './components/DatabaseRunner/DatabaseRunner';
import { appStore, AVAILABLE_THEMES } from './services/store';

export default function App() {
  const [activeMode, setActiveMode] = useState<'user' | 'admin' | 'files' | 'database'>('user');
  const [deviceView, setDeviceView] = useState<'mobile' | 'expanded'>('mobile');
  const [, setTick] = useState(0);

  useEffect(() => {
    return appStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const currentTheme = appStore.getTheme();

  return (
    <div className={`min-h-screen ${currentTheme.bgDark} text-slate-100 flex flex-col font-sans transition-colors duration-300`}>
      
      {/* Top Studio Control Bar */}
      <header className="bg-[#0b101e]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${currentTheme.gradient} flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20`}>
              <i className="fa-solid fa-gamepad text-sm"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white leading-none">
                  CLUTCH<span className={currentTheme.textColor}>ARENA</span>
                </span>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  PHP 8.2 + MySQL
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Esports Tournament Platform &bull; Theme: <strong className={currentTheme.textColor}>{currentTheme.name}</strong></span>
            </div>
          </div>

          {/* Right Mode Switcher Tabs + Theme Picker + Viewport Toggle */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            
            {/* Viewport Frame Toggle (Mobile vs Desktop Wide) */}
            {(activeMode === 'user' || activeMode === 'admin') && (
              <div className="hidden sm:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setDeviceView('mobile')}
                  title="Mobile Device Frame (390px)"
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    deviceView === 'mobile'
                      ? 'bg-slate-800 text-cyan-400 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-mobile-screen text-[11px]"></i>
                  <span>Mobile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceView('expanded')}
                  title="Expanded Wide View (Tablet & Desktop)"
                  className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                    deviceView === 'expanded'
                      ? 'bg-slate-800 text-cyan-400 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <i className="fa-solid fa-desktop text-[11px]"></i>
                  <span>Wide</span>
                </button>
              </div>
            )}

            {/* Quick Theme Selector Dropdown */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400 text-[11px] px-2 flex items-center gap-1 font-semibold">
                <i className="fa-solid fa-palette text-amber-400"></i> Theme:
              </span>
              <div className="flex items-center gap-1">
                {AVAILABLE_THEMES.map(th => {
                  const isCur = th.id === currentTheme.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => appStore.setTheme(th.id)}
                      title={`Switch to ${th.name}`}
                      className={`w-6 h-6 rounded-lg bg-gradient-to-tr ${th.gradient} flex items-center justify-center text-[10px] text-slate-950 transition ${isCur ? 'ring-2 ring-white scale-110 shadow-md font-bold' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <i className={`fa-solid ${th.icon}`}></i>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto max-w-full">
              <button
                onClick={() => setActiveMode('user')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeMode === 'user' ? `bg-gradient-to-r ${currentTheme.gradient} text-slate-950 font-bold shadow-md` : 'text-slate-400 hover:text-white'}`}
              >
                <i className="fa-solid fa-mobile-screen"></i>
                <span>User App</span>
              </button>

              <button
                onClick={() => setActiveMode('admin')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeMode === 'admin' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white'}`}
              >
                <i className="fa-solid fa-shield-halved"></i>
                <span>Admin Panel</span>
              </button>

              <button
                onClick={() => setActiveMode('files')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeMode === 'files' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white'}`}
              >
                <i className="fa-solid fa-folder-tree"></i>
                <span>PHP Files (ZIP)</span>
              </button>

              <button
                onClick={() => setActiveMode('database')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${activeMode === 'database' ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20' : 'text-slate-400 hover:text-white'}`}
              >
                <i className="fa-solid fa-database"></i>
                <span>Database</span>
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col justify-center items-center py-4 sm:py-6 px-2 sm:px-4">
        {activeMode === 'user' && (
          <div className={`w-full ${deviceView === 'expanded' ? 'max-w-2xl' : 'max-w-md'} mx-auto sm:border sm:border-slate-800 sm:rounded-3xl sm:shadow-2xl overflow-hidden bg-[#0b0f19] transition-all duration-300`}>
            <UserApp onSwitchToAdmin={() => setActiveMode('admin')} />
          </div>
        )}

        {activeMode === 'admin' && (
          <div className={`w-full ${deviceView === 'expanded' ? 'max-w-4xl' : 'max-w-md'} mx-auto sm:border sm:border-indigo-950 sm:rounded-3xl sm:shadow-2xl overflow-hidden bg-[#0b0f19] transition-all duration-300`}>
            <AdminApp onSwitchToUser={() => setActiveMode('user')} />
          </div>
        )}

        {activeMode === 'files' && (
          <div className="w-full">
            <CodeExplorer />
          </div>
        )}

        {activeMode === 'database' && (
          <div className="w-full">
            <DatabaseRunner />
          </div>
        )}
      </div>

    </div>
  );
}
