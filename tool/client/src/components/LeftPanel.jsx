import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity, Database, Square, Play, Menu, ChevronDown, History, X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button.jsx';
import RunHistory from './RunHistory.jsx';
import { fadeIn } from '../constants.js';

function LeftPanel({
    activeNavItem, ActiveIcon, mode, isRunning, canStart,
    canStopExecution = true,
    dbStatus, historyOpen, setHistoryOpen,
    onOpenSidebar, onStart, onStop,
    runHistory, activeHistoryId, onSelectRun, onDeleteRun,
    children,
}) {
    return (
        <div className="hidden lg:flex flex-col w-80 xl:w-96 border-r border-slate-200 bg-white shrink-0">
            <div className="px-5 py-3.5 h-[62px] border-b border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <Database className="size-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-slate-900 leading-tight">VDB Replication</h1>
                            <p className="text-[10px] text-slate-400">Dashboard</p>
                        </div>
                    </div>
                    <button onClick={onOpenSidebar} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors md:hidden" title="Switch workflow">
                        <Menu className="size-4.5 text-slate-400" />
                    </button>
                </div>
            </div>

            <button
                onClick={() => !isRunning && onOpenSidebar()}
                disabled={isRunning}
                className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-50"
            >
                <div className={`p-1 rounded-md ${activeNavItem?.iconBg || 'bg-slate-100'}`}>
                    <ActiveIcon className={`size-3.5 ${activeNavItem?.iconColor || 'text-slate-600'}`} strokeWidth={2} />
                </div>
                <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{activeNavItem?.label || 'Select Workflow'}</span>
                {isRunning
                    ? <Activity className="size-3.5 text-amber-500 animate-pulse shrink-0" />
                    : <ChevronDown className="size-3.5 text-slate-400 shrink-0" />
                }
            </button>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 sidebar-scroll">
                <AnimatePresence mode="wait">
                    <motion.div key={mode} {...fadeIn} className="space-y-2.5">
                        {children}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="px-4 py-3 border-t border-slate-200">
                {isRunning ? (
                    canStopExecution ? (
                        <Button variant="destructive" className="w-full" onClick={onStop}>
                            <Square className="size-3.5" /> Stop Execution
                        </Button>
                    ) : (
                        <Button className="w-full bg-slate-500 border-slate-500 hover:bg-slate-500 cursor-default" disabled>
                            <Activity className="size-3.5 animate-pulse" /> Running...
                        </Button>
                    )
                ) : (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 border-blue-700" disabled={!canStart} onClick={onStart}>
                        <Play className="size-3.5" /> Start {mode === 'org' ? 'Replication' : mode === 'company' ? 'Copy' : mode === 'user' ? 'Creating' : 'Script'}
                    </Button>
                )}
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`size-1.5 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <span className="text-[10px] text-slate-400">{dbStatus === 'connected' ? 'Connected' : 'Offline'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setHistoryOpen(prev => !prev)}
                        className={`p-1.5 rounded-lg transition-colors ${historyOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-200 text-slate-400'}`}
                        title="Toggle recent history"
                    >
                        <History className="size-4" />
                    </button>
                    <Link
                        to="/history"
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors text-[9px] font-bold uppercase tracking-wide"
                        title="Full history page"
                    >
                        All
                    </Link>
                </div>
            </div>

            <AnimatePresence>
                {historyOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1, transition: { duration: 0.2 } }}
                        exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                        className="border-t border-slate-200 bg-white overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 pt-3 pb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent</p>
                            <button onClick={() => setHistoryOpen(false)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                                <X className="size-3.5 text-slate-400" />
                            </button>
                        </div>
                        <div className="overflow-y-auto max-h-52 px-3 pb-3">
                            <RunHistory runs={runHistory.slice(0, 10)} activeRunId={activeHistoryId} onSelectRun={onSelectRun} onDeleteRun={onDeleteRun} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default LeftPanel;
