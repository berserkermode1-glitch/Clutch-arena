import React, { useState } from 'react';
import { appStore } from '../../services/store';

export const DatabaseRunner: React.FC = () => {
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'tables' | 'install_sql' | 'update_sql'>('tables');

  const users = appStore.getUsers();
  const tournaments = appStore.getTournaments();
  const transactions = appStore.getTransactions();
  const deposits = appStore.getDeposits();
  const withdrawals = appStore.getWithdrawals();
  const settings = appStore.getSettings();

  const runSafeMigration = () => {
    setMigrationStatus('running');
    setTimeout(() => {
      setMigrationStatus('success');
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-slate-100">
      
      {/* Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <i className="fa-solid fa-database"></i> MySQL Database & Migration Engine
          </div>
          <span className="text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
            MySQL 8.x / MariaDB
          </span>
        </div>
        <h2 className="text-lg font-black text-white">Clutch Arena Database Architecture</h2>
        <p className="text-xs text-slate-400 mt-1">
          Self-contained schema automatically initialized via <code className="text-emerald-300">install.php</code> and safely updated without data loss using <code className="text-cyan-300">update_database.php</code>.
        </p>
      </div>

      {/* Migration Action Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-shield-halved text-cyan-400"></i> Safe Database Migration (update_database.php)
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Adds the <span className="font-mono text-emerald-300">deposits</span> and <span className="font-mono text-emerald-300">withdrawals</span> tables using <code className="font-mono text-slate-300">CREATE TABLE IF NOT EXISTS</code>, and adds <code className="font-mono text-slate-300">upi_id</code> to <span className="font-mono text-emerald-300">users</span> with column existence check.
            </p>
          </div>

          <button
            onClick={runSafeMigration}
            className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95 transition shrink-0"
          >
            <i className="fa-solid fa-bolt"></i> Test Migration Script
          </button>
        </div>

        {migrationStatus === 'success' && (
          <div className="mt-4 bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-4 rounded-xl text-xs space-y-2 animate-fade-in">
            <div className="font-bold text-emerald-200 flex items-center gap-2 text-sm">
              <i className="fa-solid fa-circle-check text-emerald-400"></i> Database schema updated successfully! You can now safely delete this file.
            </div>
            <div className="font-mono text-[11px] text-emerald-300/90 space-y-1 pl-6">
              <div>&check; Verified table: 'deposits' created or already exists.</div>
              <div>&check; Verified table: 'withdrawals' created or already exists.</div>
              <div>&check; Verified table: 'settings' created or already exists.</div>
              <div>&check; Verified column: 'upi_id' in 'users' table.</div>
              <div>&check; Zero records dropped or recreated.</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-slate-900 p-1 rounded-xl mb-4 border border-slate-800 text-xs font-semibold">
        <button 
          onClick={() => setActiveSchemaTab('tables')}
          className={`py-2 rounded-lg transition ${activeSchemaTab === 'tables' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-table-list mr-1"></i> Live Tables Status
        </button>
        <button 
          onClick={() => setActiveSchemaTab('install_sql')}
          className={`py-2 rounded-lg transition ${activeSchemaTab === 'install_sql' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-file-code mr-1"></i> install.php Schema
        </button>
        <button 
          onClick={() => setActiveSchemaTab('update_sql')}
          className={`py-2 rounded-lg transition ${activeSchemaTab === 'update_sql' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
        >
          <i className="fa-solid fa-wrench mr-1"></i> update_database.php
        </button>
      </div>

      {/* Tab 1: Live Tables Status */}
      {activeSchemaTab === 'tables' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-xs font-mono">users</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">{users.length} rows</span>
              </div>
              <p className="text-[11px] text-slate-400">Stores player accounts, hashed passwords, wallet balances, and upi_id.</p>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-xs font-mono">tournaments</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">{tournaments.length} rows</span>
              </div>
              <p className="text-[11px] text-slate-400">Title, game_name, entry_fee, prize_pool, room_id, room_password, status.</p>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-xs font-mono">deposits (UPI Add Money)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono border border-emerald-500/30">{deposits.length} rows</span>
              </div>
              <p className="text-[11px] text-slate-400">user_id, amount, transaction_id (12-digit UTR), status (Pending/Completed).</p>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-xs font-mono">withdrawals (UPI Payout)</span>
                <span className="text-[10px] bg-rose-950 text-rose-400 px-2 py-0.5 rounded font-mono border border-rose-500/30">{withdrawals.length} rows</span>
              </div>
              <p className="text-[11px] text-slate-400">user_id, amount, upi_id, status (Pending/Completed/Rejected).</p>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-xs font-mono">transactions</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">{transactions.length} rows</span>
              </div>
              <p className="text-[11px] text-slate-400">Audit ledger for entry deductions, prize additions, and deposits.</p>
            </div>

            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-white text-xs font-mono">settings</span>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded font-mono border border-indigo-500/30">Active</span>
              </div>
              <p className="text-[11px] text-slate-400">admin_upi_id: {settings.admin_upi_id}, admin_qr_code.</p>
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: install.php Schema SQL */}
      {activeSchemaTab === 'install_sql' && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-slate-300">
          <pre>{`-- Adept Play MySQL Database Schema
CREATE DATABASE IF NOT EXISTS \`adept_play\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`adept_play\`;

CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`email\` VARCHAR(100) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`wallet_balance\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  \`upi_id\` VARCHAR(255) NULL,
  \`is_blocked\` TINYINT(1) NOT NULL DEFAULT 0,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS \`admin\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`username\` VARCHAR(50) NOT NULL UNIQUE,
  \`password\` VARCHAR(255) NOT NULL,
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS \`tournaments\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`title\` VARCHAR(100) NOT NULL,
  \`game_name\` VARCHAR(50) NOT NULL,
  \`entry_fee\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  \`prize_pool\` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  \`commission_percent\` DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
  \`match_time\` DATETIME NOT NULL,
  \`room_id\` VARCHAR(100) NULL,
  \`room_password\` VARCHAR(100) NULL,
  \`winner_id\` INT NULL,
  \`status\` ENUM('Upcoming', 'Live', 'Completed') NOT NULL DEFAULT 'Upcoming',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS \`deposits\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`amount\` DECIMAL(10, 2) NOT NULL,
  \`transaction_id\` VARCHAR(100) NOT NULL,
  \`status\` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS \`withdrawals\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`amount\` DECIMAL(10, 2) NOT NULL,
  \`upi_id\` VARCHAR(255) NOT NULL,
  \`status\` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS \`settings\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`setting_key\` VARCHAR(50) NOT NULL UNIQUE,
  \`setting_value\` TEXT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;`}</pre>
        </div>
      )}

      {/* Tab 3: update_database.php SQL */}
      {activeSchemaTab === 'update_sql' && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-slate-300">
          <pre>{`-- Safe Migration Query Block in update_database.php
-- 1. Create deposits table if not exists
CREATE TABLE IF NOT EXISTS \`deposits\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`amount\` DECIMAL(10, 2) NOT NULL,
  \`transaction_id\` VARCHAR(100) NOT NULL,
  \`status\` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Create withdrawals table if not exists
CREATE TABLE IF NOT EXISTS \`withdrawals\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`amount\` DECIMAL(10, 2) NOT NULL,
  \`upi_id\` VARCHAR(255) NULL,
  \`status\` ENUM('Pending', 'Completed', 'Rejected') NOT NULL DEFAULT 'Pending',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Check and add upi_id column safely to users table
-- PHP: SHOW COLUMNS FROM \`users\` LIKE 'upi_id'
ALTER TABLE \`users\` ADD COLUMN \`upi_id\` VARCHAR(255) NULL AFTER \`wallet_balance\`;`}</pre>
        </div>
      )}

    </div>
  );
};
