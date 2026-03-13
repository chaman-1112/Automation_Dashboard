import React, { useRef, useEffect, useState } from 'react';
import { Check, X, Loader2, Terminal, Circle, Filter } from 'lucide-react';
import { Card } from './ui/Card.jsx';
import { Badge } from './ui/Badge.jsx';

function StatusLog({ logs, filterStep, onClearFilter }) {
    const listRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);
    const distanceFromBottomRef = useRef(0);

    const handleScroll = () => {
        const el = listRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        distanceFromBottomRef.current = distanceFromBottom;
        shouldAutoScrollRef.current = distanceFromBottom < 80;
    };

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;

        if (shouldAutoScrollRef.current) {
            el.scrollTop = el.scrollHeight;
            return;
        }

        const nextTop = el.scrollHeight - el.clientHeight - distanceFromBottomRef.current;
        el.scrollTop = Math.max(0, nextTop);
    }, [logs]);

    const icon = (type) => {
        switch (type) {
            case 'success': return <Check className="size-3.5 text-emerald-400" strokeWidth={3} />;
            case 'error':   return <X className="size-3.5 text-red-400" strokeWidth={3} />;
            case 'progress': return <Loader2 className="size-3.5 text-blue-400 animate-spin" strokeWidth={2.5} />;
            default:         return <Circle className="size-2 text-slate-500 fill-current" />;
        }
    };

    const displayLogs = logs?.filter(l => l && l.message && l.type !== 'steps' && l.type !== 'step' && l.type !== 'run-id') || [];
    const last = displayLogs.length > 0 ? displayLogs[displayLogs.length - 1] : null;
    const done = last && (last.type === 'success' || last.type === 'error');

    return (
        <Card className="overflow-hidden gap-0 p-0 border-slate-300 shadow-2xl shadow-slate-900/10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-slate-200 bg-linear-to-r from-slate-50 to-slate-100/50">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-200">
                        <Terminal className="size-4 text-slate-600" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-bold text-slate-900">Execution Output</span>
                </div>
                <div className="flex items-center gap-2">
                    {!done && displayLogs.length > 0 && (
                        <Badge variant="warning" className="py-1 px-3 text-[10px] font-bold animate-pulse">
                            <span className="mr-1.5 size-2 rounded-full bg-amber-500 animate-pulse" /> Running
                        </Badge>
                    )}
                    {done && last.type === 'success' && (
                        <Badge variant="success" className="py-1 px-3 text-[10px] font-bold">
                            <Check className="size-3 mr-0.5" strokeWidth={3} /> Complete
                        </Badge>
                    )}
                    {done && last.type === 'error' && (
                        <Badge variant="destructive" className="py-1 px-3 text-[10px] font-bold">
                            <X className="size-3 mr-0.5" strokeWidth={3} /> Failed
                        </Badge>
                    )}
                </div>
            </div>

            {/* Filter Bar */}
            {filterStep && (
                <div className="flex items-center justify-between px-5 py-2 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Filter className="size-3.5" />
                        <span>Filtered by step: <span className="font-bold text-slate-800">{filterStep}</span></span>
                    </div>
                    {onClearFilter && (
                        <button
                            onClick={onClearFilter}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            Show All
                        </button>
                    )}
                </div>
            )}

            {/* Terminal Content */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 p-5 max-h-[380px] overflow-y-auto terminal-scroll font-mono text-[13px] leading-7"
            >
                {displayLogs.length > 0 ? (
                    displayLogs.map((log, i) => (
                        <div
                            key={`log-${i}-${log.timestamp || Date.now()}`}
                            className="flex items-start gap-3 py-0.5 rounded-lg px-2 -mx-2 transition-colors hover:bg-white/5"
                        >
                            <span className="shrink-0 mt-[7px] w-4 flex justify-center">{icon(log.type)}</span>
                            <span className="text-slate-500 shrink-0 w-[62px] tabular-nums text-xs">
                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
                            </span>
                            <span className={`break-all min-w-0 ${
                                log.type === 'success' ? 'text-emerald-300 font-semibold' :
                                log.type === 'error'   ? 'text-red-300 font-semibold' :
                                log.type === 'progress' ? 'text-blue-200 font-medium' : 'text-slate-400'
                            }`}>{log.message}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-slate-400 text-center py-8">No logs yet...</div>
                )}
            </div>
        </Card>
    );
}

export default StatusLog;
