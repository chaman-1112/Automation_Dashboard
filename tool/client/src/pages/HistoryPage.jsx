import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Database, Trash2, Clock, Check, X, Loader2,
    Building2, Building, UserPlus, FileCode, Search, Filter,
} from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';

const MODE_META = {
    org: { icon: Building2, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', tag: 'Org Copy' },
    company: { icon: Building, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', tag: 'Company Copy' },
    user: { icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', tag: 'Create Users' },
    script: { icon: FileCode, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', tag: 'Script' },
};

const STATUS_BADGE = {
    completed: { variant: 'success', icon: Check, label: 'Completed' },
    failed: { variant: 'destructive', icon: X, label: 'Failed' },
    running: { variant: 'warning', icon: Loader2, label: 'Running' },
    pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
};

function HistoryPage() {
    const navigate = useNavigate();
    const [runs, setRuns] = useState(() => {
        try { const s = localStorage.getItem('vdb-run-history'); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterMode, setFilterMode] = useState('all');

    const filtered = useMemo(() => {
        return runs.filter(r => {
            if (filterStatus !== 'all' && r.status !== filterStatus) return false;
            if (filterMode !== 'all' && r.mode !== filterMode) return false;
            if (searchQuery && !r.label?.toLowerCase().includes(searchQuery.toLowerCase()) && !r.user?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [runs, searchQuery, filterStatus, filterMode]);

    const handleDelete = (runId) => {
        setRuns(prev => {
            const u = prev.filter(r => r.id !== runId);
            try { localStorage.setItem('vdb-run-history', JSON.stringify(u)); } catch {}
            return u;
        });
    };

    const handleClearAll = () => {
        setRuns([]);
        try { localStorage.removeItem('vdb-run-history'); } catch {}
    };

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) +
            ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const stats = useMemo(() => ({
        total: runs.length,
        completed: runs.filter(r => r.status === 'completed').length,
        failed: runs.filter(r => r.status === 'failed').length,
        running: runs.filter(r => r.status === 'running').length,
    }), [runs]);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="h-16 border-b border-slate-200 bg-white flex items-center px-6 gap-4 sticky top-0 z-10">
                <Link to="/" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
                    <ArrowLeft className="size-5 text-slate-600" />
                </Link>
                <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <Database className="size-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">Task History</h1>
                        <p className="text-[11px] text-slate-400">{stats.total} total runs</p>
                    </div>
                </div>
                <div className="flex-1" />
                {runs.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-red-500 hover:text-red-600 hover:bg-red-50 text-xs">
                        <Trash2 className="size-3.5" /> Clear All
                    </Button>
                )}
            </header>

            <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { label: 'Total', value: stats.total, color: 'text-slate-700', bg: 'bg-white' },
                        { label: 'Completed', value: stats.completed, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                        { label: 'Failed', value: stats.failed, color: 'text-red-700', bg: 'bg-red-50' },
                        { label: 'Running', value: stats.running, color: 'text-blue-700', bg: 'bg-blue-50' },
                    ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-xl border border-slate-200 px-4 py-3`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                            <p className={`text-2xl font-bold ${s.color} mt-0.5`}>{s.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-slate-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                            placeholder="Search by name or user..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Filter className="size-3.5 text-slate-400" />
                        {['all', 'completed', 'failed', 'running'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors capitalize ${
                                    filterStatus === s ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {['all', 'org', 'company', 'user', 'script'].map(m => (
                            <button
                                key={m}
                                onClick={() => setFilterMode(m)}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors capitalize ${
                                    filterMode === m ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="size-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <Clock className="size-6 text-slate-400" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-base font-semibold text-slate-600 mb-1">
                            {runs.length === 0 ? 'No history yet' : 'No matching runs'}
                        </h3>
                        <p className="text-sm text-slate-400">
                            {runs.length === 0 ? 'Run a task to see it here.' : 'Try adjusting your filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <AnimatePresence>
                            {filtered.map(run => {
                                const meta = MODE_META[run.mode] || MODE_META.script;
                                const Icon = meta.icon;
                                const sb = STATUS_BADGE[run.status] || STATUS_BADGE.pending;
                                const SbIcon = sb.icon;
                                return (
                                    <motion.div
                                        key={run.id}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        layout
                                        onClick={() => navigate(`/history/${run.id}`)}
                                        className="cursor-pointer"
                                    >
                                        <Card className="px-5 py-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2 rounded-lg ${meta.bg} ${meta.border} border shrink-0`}>
                                                    <Icon className={`size-5 ${meta.color}`} strokeWidth={1.8} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-sm font-bold text-slate-900 truncate">{run.label}</h3>
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider ${meta.color} ${meta.bg} px-1.5 py-0.5 rounded`}>{meta.tag}</span>
                                                        <Badge variant={sb.variant} className="text-[10px] px-2 py-0.5 gap-1">
                                                            <SbIcon className={`size-3 ${run.status === 'running' ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                                                            {sb.label}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1.5 text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="size-3" />
                                                            {formatDate(run.startedAt)}
                                                        </span>
                                                        {run.user && (
                                                            <span className="flex items-center gap-1 text-slate-500 font-medium">
                                                                👤 {run.user}
                                                            </span>
                                                        )}
                                                        {run.userEmail && (
                                                            <span className="text-slate-500">{run.userEmail}</span>
                                                        )}
                                                    </div>
                                                    {run.steps && run.steps.length > 0 && (
                                                        <div className="flex items-center gap-1 mt-2">
                                                            {run.steps.map((s, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`h-1.5 flex-1 rounded-full ${
                                                                        s.status === 'completed' ? 'bg-emerald-400' :
                                                                        s.status === 'failed' ? 'bg-red-400' :
                                                                        s.status === 'running' ? 'bg-blue-400 animate-pulse' :
                                                                        'bg-slate-200'
                                                                    }`}
                                                                    title={`${s.label}: ${s.status}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(run.id);
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HistoryPage;
