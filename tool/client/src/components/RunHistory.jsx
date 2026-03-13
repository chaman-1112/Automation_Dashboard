import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock, Loader2, Trash2, Building2, Building, UserPlus, FileCode } from 'lucide-react';
import { cn } from '../lib/utils.js';

const MODE_META = {
    org: { icon: Building2, color: 'text-violet-500', bg: 'bg-violet-50', tag: 'Org Copy' },
    company: { icon: Building, color: 'text-blue-500', bg: 'bg-blue-50', tag: 'Company Copy' },
    user: { icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50', tag: 'Create Users' },
    script: { icon: FileCode, color: 'text-amber-500', bg: 'bg-amber-50', tag: 'Script' },
};

function RunHistory({ runs, activeRunId, onSelectRun, onDeleteRun }) {
    const navigate = useNavigate();
    if (!runs || runs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <Clock className="size-5 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">No runs yet</p>
                <p className="text-xs text-slate-400 mt-1">Start a task to see history</p>
            </div>
        );
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5"><Check className="size-2.5" strokeWidth={3} />Done</span>;
            case 'failed':
            case 'paused':
                return <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-red-600 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5"><X className="size-2.5" strokeWidth={3} />Failed</span>;
            case 'running':
                return <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5"><Loader2 className="size-2.5 animate-spin" strokeWidth={2.5} />Running</span>;
            default:
                return <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-1.5 py-0.5">Pending</span>;
        }
    };

    const formatDate = (ts) => {
        const d = new Date(ts);
        return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) +
            ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="space-y-1">
            <AnimatePresence>
                {runs.map((run) => {
                    const isActive = run.id === activeRunId;
                    const meta = MODE_META[run.mode] || MODE_META.script;
                    const Icon = meta.icon;
                    return (
                        <motion.button
                            key={run.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            onClick={() => {
                                onSelectRun?.(run.id);
                                navigate(`/history/${run.id}`);
                            }}
                            className={cn(
                                'w-full text-left px-3 py-2.5 rounded-lg transition-all group relative',
                                isActive
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'hover:bg-slate-50 border border-transparent'
                            )}
                        >
                            <div className="flex items-start gap-2.5">
                                <div className={cn('p-1 rounded-md shrink-0 mt-0.5', meta.bg)}>
                                    <Icon className={cn('size-3', meta.color)} strokeWidth={2} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={cn(
                                            'text-xs font-semibold truncate',
                                            isActive ? 'text-blue-800' : 'text-slate-800'
                                        )}>
                                            {run.label}
                                        </span>
                                        {onDeleteRun && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDeleteRun(run.id); }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 transition-all shrink-0"
                                            >
                                                <Trash2 className="size-3 text-slate-400 hover:text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={cn('text-[9px] font-semibold uppercase tracking-wide', meta.color)}>{meta.tag}</span>
                                        <span className="text-slate-300">|</span>
                                        {getStatusBadge(run.status)}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(run.startedAt)}</p>
                                    {(run.user || run.userEmail) && (
                                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                            {run.user || 'Unknown'}{run.userEmail ? ` (${run.userEmail})` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.button>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

export default RunHistory;
