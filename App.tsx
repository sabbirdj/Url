import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { LinkService, AnalyticsService } from './services/db';
import { Link, AnalyticsSummary } from './types';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { QRCodeModal } from './components/QRCodeModal';
import { 
  LayoutDashboard, 
  Plus, 
  Trash2, 
  ExternalLink, 
  BarChart2, 
  QrCode, 
  Copy, 
  Globe, 
  Zap, 
  Search,
  CheckCircle2,
  Calendar,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [links, setLinks] = useState<Link[]>([]);
  const [view, setView] = useState<'dashboard' | 'analytics' | 'create'>('dashboard');
  const [selectedLink, setSelectedLink] = useState<Link | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTarget, setQrTarget] = useState({ url: '', alias: '' });
  
  // Redirection State
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState('');

  // Create Form State
  const [newUrl, setNewUrl] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [error, setError] = useState('');
  
  // Toast State
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    refreshLinks();
    checkRedirect();
  }, []);

  const checkRedirect = () => {
    // Check if the URL has a hash like #/my-alias or #my-alias
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      // Remove '#' and leading '/' if present
      const alias = hash.substring(1).replace(/^\//, '');
      
      if (alias) {
        const link = LinkService.resolveAlias(alias);
        if (link) {
          setIsRedirecting(true);
          setRedirectUrl(link.originalUrl);
          
          // Track the click
          AnalyticsService.trackClick(alias);
          
          // Perform the redirect after a short delay for UX
          setTimeout(() => {
            window.location.replace(link.originalUrl);
          }, 1500);
        } else {
           // Alias found in URL but not in DB (404)
           showToast("Link not found or expired");
           // Remove hash so user stays on dashboard
           history.pushState("", document.title, window.location.pathname + window.location.search);
        }
      }
    }
  };

  const refreshLinks = () => {
    setLinks(LinkService.getAll());
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      LinkService.create({
        originalUrl: newUrl,
        alias: newAlias || undefined,
        expiresAt: newExpiry || undefined
      });
      refreshLinks();
      setView('dashboard');
      setNewUrl('');
      setNewAlias('');
      setNewExpiry('');
      setError('');
      showToast('Link created successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this link?')) {
      LinkService.delete(id);
      refreshLinks();
      if (selectedLink?.id === id) {
        setSelectedLink(null);
        setAnalyticsData(null);
        setView('dashboard');
      }
      showToast('Link deleted');
    }
  };

  const handleViewAnalytics = (link: Link) => {
    setSelectedLink(link);
    setAnalyticsData(AnalyticsService.getStatsForLink(link.id));
    setView('analytics');
  };

  const handleShowQR = (link: Link) => {
    setQrTarget({ 
      url: `${window.location.origin}/#/${link.alias}`, 
      alias: link.alias 
    });
    setQrModalOpen(true);
  };

  const handleSimulateClick = (link: Link) => {
    // Simulate cache hit and tracking
    const resolved = LinkService.resolveAlias(link.alias);
    if (resolved) {
      AnalyticsService.trackClick(link.alias);
      showToast(`⚡ Redirect simulated for ${link.alias}`);
      // Refresh analytics if we are looking at them
      if (selectedLink?.id === link.id && view === 'analytics') {
        setAnalyticsData(AnalyticsService.getStatsForLink(link.id));
      }
    } else {
      alert('Link expired or invalid');
    }
  };

  const copyToClipboard = (alias: string) => {
    const url = `${window.location.origin}/#/${alias}`;
    navigator.clipboard.writeText(url);
    showToast('Copied to clipboard!');
  };

  // --- REDIRECT VIEW ---
  if (isRedirecting) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-gray-50 text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full"
        >
           <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <Loader2 className="w-8 h-8 animate-spin" />
           </div>
           <h2 className="text-2xl font-bold text-gray-900 mb-2">Redirecting...</h2>
           <p className="text-gray-500 mb-6">
             You are being redirected to<br/>
             <span className="font-mono text-indigo-600 break-all">{redirectUrl}</span>
           </p>
           <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
             <motion.div 
                className="bg-indigo-600 h-full rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
             />
           </div>
        </motion.div>
        <p className="mt-8 text-sm text-gray-400">Powered by Linkly</p>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">Linkly</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button 
            onClick={() => setView('create')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'create' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <Plus className="w-5 h-5" />
            Create New
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white">
            <h4 className="font-semibold text-sm mb-1">Pro Plan</h4>
            <p className="text-xs text-indigo-100 mb-3">50,000 clicks / month</p>
            <div className="w-full bg-indigo-400/30 rounded-full h-1.5 mb-2">
              <div className="bg-white w-3/4 h-1.5 rounded-full"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-xl font-semibold text-gray-800">
            {view === 'dashboard' && 'My Links'}
            {view === 'create' && 'Create Link'}
            {view === 'analytics' && (
              <span className="flex items-center gap-2">
                <span className="text-gray-400 font-normal">Analytics /</span> 
                {selectedLink?.alias}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                JD
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Search links..." 
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <button 
                    onClick={() => setView('create')} 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm shadow-indigo-200 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Link
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Original URL</th>
                        <th className="px-6 py-4">Short Link</th>
                        <th className="px-6 py-4">Created</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {links.map(link => (
                        <tr key={link.id} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-6 py-4 max-w-xs truncate">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <Globe className="w-4 h-4 text-gray-500" />
                              </div>
                              <div className="truncate">
                                <div className="text-sm font-medium text-gray-900 truncate">{link.originalUrl}</div>
                                {link.expiresAt && <div className="text-xs text-orange-500 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3"/> Expires {new Date(link.expiresAt).toLocaleDateString()}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => copyToClipboard(link.alias)}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-100"
                            >
                              /{link.alias}
                              <Copy className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(link.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleSimulateClick(link)}
                                className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Simulate Click"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleShowQR(link)}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="QR Code"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleViewAnalytics(link)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Analytics"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(link.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {links.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            No links created yet. Click "Create Link" to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {view === 'create' && (
               <motion.div 
               key="create"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="max-w-2xl mx-auto"
             >
               <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="p-8 border-b border-gray-100">
                   <h2 className="text-lg font-bold text-gray-900 mb-1">Create New Link</h2>
                   <p className="text-gray-500 text-sm">Shorten your URL and track its performance.</p>
                 </div>
                 <form onSubmit={handleCreate} className="p-8 space-y-6">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Destination URL</label>
                     <input
                       type="url"
                       required
                       value={newUrl}
                       onChange={(e) => setNewUrl(e.target.value)}
                       placeholder="https://example.com/long-url"
                       className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                     />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-6">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Custom Alias (Optional)</label>
                       <div className="relative">
                         <span className="absolute left-4 top-3 text-gray-400 select-none">link.ly/</span>
                         <input
                           type="text"
                           value={newAlias}
                           onChange={(e) => setNewAlias(e.target.value)}
                           placeholder="my-link"
                           className="w-full pl-20 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                         />
                       </div>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">Expiration (Optional)</label>
                       <input
                         type="date"
                         value={newExpiry}
                         onChange={(e) => setNewExpiry(e.target.value)}
                         className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                       />
                     </div>
                   </div>

                   {error && (
                     <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                       <span className="font-bold">Error:</span> {error}
                     </div>
                   )}

                   <div className="flex items-center justify-end gap-4 pt-4">
                     <button
                       type="button"
                       onClick={() => setView('dashboard')}
                       className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                     >
                       Cancel
                     </button>
                     <button
                       type="submit"
                       className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md shadow-indigo-200 transition-all active:scale-95"
                     >
                       Create Link
                     </button>
                   </div>
                 </form>
               </div>
             </motion.div>
            )}

            {view === 'analytics' && analyticsData && (
              <motion.div 
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                   <button 
                    onClick={() => setView('dashboard')}
                    className="text-indigo-600 hover:underline text-sm font-medium flex items-center gap-1"
                   >
                     ← Back to Dashboard
                   </button>
                   <div className="text-sm text-gray-500">
                     Data simulated for demo purposes
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm font-medium mb-1">Total Clicks</div>
                    <div className="text-3xl font-bold text-gray-900">{analyticsData.totalClicks}</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm font-medium mb-1">Top Referrer</div>
                    <div className="text-xl font-bold text-gray-900 truncate">
                      {analyticsData.clicksByReferrer[0]?.referrer || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm font-medium mb-1">Top Country</div>
                    <div className="text-xl font-bold text-gray-900">
                      {analyticsData.clicksByCountry[0]?.country || 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                     <div className="text-gray-500 text-sm font-medium mb-1">Status</div>
                     <div className="flex items-center gap-2 text-green-600 font-bold text-xl">
                       <CheckCircle2 className="w-5 h-5" /> Active
                     </div>
                  </div>
                </div>

                <AnalyticsCharts data={analyticsData} />

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <QRCodeModal 
        isOpen={qrModalOpen} 
        onClose={() => setQrModalOpen(false)} 
        url={qrTarget.url} 
        alias={qrTarget.alias}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const root = createRoot(rootElement);
root.render(<App />);