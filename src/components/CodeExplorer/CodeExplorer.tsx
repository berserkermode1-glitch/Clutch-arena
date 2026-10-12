import React, { useState } from 'react';
import { PHP_PROJECT_FILES, PhpFile } from '../../data/phpFiles';
import JSZip from 'jszip';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PhpFile>(
    PHP_PROJECT_FILES.find(f => f.filename === 'index.php') || PHP_PROJECT_FILES[0]
  );
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = PHP_PROJECT_FILES.filter(f => 
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = () => {
    if (selectedFile) {
      navigator.clipboard.writeText(selectedFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add each file to the zip
      for (const file of PHP_PROJECT_FILES) {
        zip.file(file.path, file.content);
      }

      // Add a handy README.md
      zip.file("README.md", `# Clutch Arena - Mobile-First Esports Tournament Platform

A complete, production-ready esports tournament web application built with:
- PHP 8.x
- MySQL Database
- Tailwind CSS (via CDN)
- Font Awesome 6 Icons
- Pure JavaScript (strict native app feel, text selection & right click disabled)
- Manual UPI QR Code Deposits & Withdrawals
- Multiple Battle Themes (Emerald Neon, Crimson Fury, Cyber Violet, Glacier Cyan, Apex Gold)

## Quick Installation (XAMPP / LAMP / cPanel)
1. Extract all files into your web root (e.g., \`htdocs/clutch_arena\` or \`public_html\`).
2. Verify database connection credentials in \`config.php\` (Default: host: 127.0.0.1, user: root, pass: root).
3. Open your browser and navigate to \`install.php\` to automatically create the database (\`clutch_arena\`) and tables:
   - users
   - admin
   - tournaments
   - participants
   - transactions
   - deposits
   - withdrawals
   - settings
4. Default Admin Login:
   - Username: \`admin\`
   - Password: \`admin123\`
   - URL: \`admin/login.php\`

## Safe Migration
If you already have the database installed, run \`update_database.php\` to add the UPI deposits, withdrawals, and user upi_id columns without losing data.
`);

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "clutch_arena_full_project.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to build ZIP file: " + e);
    } finally {
      setIsZipping(false);
    }
  };

  // Group files by directory
  const rootFiles = filteredFiles.filter(f => f.folder === '/');
  const commonFiles = filteredFiles.filter(f => f.folder === '/common');
  const adminFiles = filteredFiles.filter(f => f.folder === '/admin');
  const adminCommonFiles = filteredFiles.filter(f => f.folder === '/admin/common');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-slate-100">
      
      {/* Top Banner & Download Button */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-900/60 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
            <i className="fa-solid fa-code text-sm"></i> Full PHP & MySQL Source Code Deliverable
          </div>
          <h2 className="text-xl font-black text-white">Clutch Arena Project Files</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            {PHP_PROJECT_FILES.length} complete PHP, SQL, and configuration files ready for deployment on Apache/XAMPP/Nginx with traditional PHP form POST handling.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black py-3 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition shrink-0"
        >
          {isZipping ? (
            <>
              <i className="fa-solid fa-spinner fa-spin"></i> Packaging ZIP...
            </>
          ) : (
            <>
              <i className="fa-solid fa-download text-sm"></i> Download Complete Project (ZIP)
            </>
          )}
        </button>
      </div>

      {/* Main Grid: File Tree + Code Viewer */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left: File Tree Explorer */}
        <div className="md:col-span-4 bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <i className="fa-solid fa-folder-tree text-indigo-400"></i> Project Structure
            </span>
            <span className="text-[10px] font-mono text-slate-500">{filteredFiles.length} files</span>
          </div>

          {/* Search Box */}
          <div className="relative mb-3">
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 pl-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-[10px] text-slate-500"></i>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 text-xs font-mono">
            
            {/* Root Files */}
            {rootFiles.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5 font-sans">
                  <i className="fa-solid fa-folder-open text-amber-400 text-xs"></i> Root Directory (/)
                </div>
                <div className="space-y-1 pl-3 border-l border-slate-800">
                  {rootFiles.map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${selectedFile.path === file.path ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/80'}`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <i className={`fa-solid ${file.filename.endsWith('.php') ? 'fa-file-code text-indigo-400' : 'fa-gear text-slate-400'} text-[10px]`}></i>
                        <span className="truncate">{file.filename}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* common/ Files */}
            {commonFiles.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5 font-sans">
                  <i className="fa-solid fa-folder text-amber-400 text-xs"></i> common/
                </div>
                <div className="space-y-1 pl-3 border-l border-slate-800">
                  {commonFiles.map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${selectedFile.path === file.path ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/80'}`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <i className="fa-solid fa-file-code text-indigo-400 text-[10px]"></i>
                        <span className="truncate">{file.filename}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* admin/ Files */}
            {adminFiles.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5 font-sans">
                  <i className="fa-solid fa-folder text-indigo-400 text-xs"></i> admin/
                </div>
                <div className="space-y-1 pl-3 border-l border-slate-800">
                  {adminFiles.map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${selectedFile.path === file.path ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/80'}`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <i className="fa-solid fa-file-shield text-indigo-400 text-[10px]"></i>
                        <span className="truncate">{file.filename}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* admin/common/ Files */}
            {adminCommonFiles.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1.5 font-sans">
                  <i className="fa-solid fa-folder text-indigo-400 text-xs"></i> admin/common/
                </div>
                <div className="space-y-1 pl-3 border-l border-slate-800">
                  {adminCommonFiles.map(file => (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between transition ${selectedFile.path === file.path ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800/80'}`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <i className="fa-solid fa-file-code text-indigo-400 text-[10px]"></i>
                        <span className="truncate">{file.filename}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="md:col-span-8 bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col">
          
          {/* File Header Details */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                Directory: <span className="text-slate-300 font-mono">{selectedFile.folder}</span>
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <i className="fa-solid fa-file-code text-emerald-400"></i>
                <span className="font-mono text-emerald-300">{selectedFile.filename}</span>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${copied ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'}`}
            >
              <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>

          {/* Source Code Container */}
          <div className="relative bg-slate-950 rounded-xl border border-slate-800/80 p-4 font-mono text-xs overflow-x-auto max-h-[600px] text-slate-200">
            <pre className="whitespace-pre">{selectedFile.content}</pre>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Encoding: UTF-8 &bull; Engine: PHP 8.x / MySQL PDO</span>
            <span>Lines: {selectedFile.content.split('\n').length}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
