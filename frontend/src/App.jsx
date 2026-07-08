import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Vote, ShieldAlert, BarChart3, HelpCircle } from 'lucide-react';

import SubmitComplaint from './pages/SubmitComplaint';
import ProcessingScreen from './pages/ProcessingScreen';
import ResultsScreen from './pages/ResultsScreen';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-[#070b13]">
        {/* Modern Glassmorphic Navbar */}
        <header className="sticky top-0 z-[1000] w-full border-b border-white/5 bg-[#0b0f19]/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo / Brand */}
              <div className="flex items-center gap-3">
                <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-500/20">
                  <Vote size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-brand-400 bg-clip-text text-transparent">
                    JannAI
                  </h1>
                  <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                    Civic Planning & Priority Hub
                  </p>
                </div>
              </div>

              {/* Navigation Links */}
              <nav className="flex items-center gap-1">
                <Link
                  to="/"
                  className="px-4 py-2 text-sm font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  Report Issue
                </Link>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-all border border-brand-500/10 hover:border-brand-500/30"
                >
                  <BarChart3 size={16} />
                  <span>MP Dashboard</span>
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Page Content area */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<SubmitComplaint />} />
            <Route path="/processing/:jobId" element={<ProcessingScreen />} />
            <Route path="/results/:jobId" element={<ResultsScreen />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-[#0b0f19]/40 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 JannAI. Modern Civic Infrastructure Development Toolkit.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-300">Privacy Policy</a>
              <a href="#" className="hover:text-slate-300">Governance Portal</a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
