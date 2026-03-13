import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, User, Mail, ListChecks, Terminal, Info } from 'lucide-react';

function prettyValue(value) {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function formatTs(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
}

function RunDetailPage() {
    const { runId } = useParams();

    const run = useMemo(() => {
        try {
            const raw = JSON.parse(localStorage.getItem('vdb-run-history') || '[]');
            return raw.find((r) => String(r.id) === String(runId)) || null;
        } catch {
            return null;
        }
    }, [runId]);

    if (!run) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="max-w-5xl mx-auto">
                    <Link to="/history" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                        <ArrowLeft className="size-4" /> Back to history
                    </Link>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
                        <p className="text-sm text-slate-600">Run not found.</p>
                    </div>
                </div>
            </div>
        );
    }

    const displayEvents = Array.isArray(run.events)
        ? run.events.filter((e) => e && e.message && e.type !== 'steps' && e.type !== 'step' && e.type !== 'run-id')
        : [];

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-6xl mx-auto space-y-4">
                <Link to="/history" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                    <ArrowLeft className="size-4" /> Back to history
                </Link>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">{run.label}</h1>
                            <p className="text-xs text-slate-500 mt-1">Run ID: {run.id}</p>
                        </div>
                        <span className="text-xs font-semibold uppercase rounded-full px-2.5 py-1 bg-slate-100 text-slate-700">
                            {run.status || 'unknown'}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 text-sm text-slate-600">
                        <p className="inline-flex items-center gap-2"><Clock className="size-4" /> Started: {formatTs(run.startedAt)}</p>
                        <p className="inline-flex items-center gap-2"><Clock className="size-4" /> Ended: {formatTs(run.endedAt)}</p>
                        <p className="inline-flex items-center gap-2"><User className="size-4" /> User: {run.user || 'Unknown'}</p>
                        <p className="inline-flex items-center gap-2"><Mail className="size-4" /> Email: {run.userEmail || '—'}</p>
                    </div>
                    {run.resultMessage && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 inline-flex items-start gap-2">
                            <Info className="size-4 mt-0.5 shrink-0" />
                            <span>{run.resultMessage}</span>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-sm font-bold text-slate-800 mb-3">Request Data</h2>
                    {run.request ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {Object.entries(run.request).map(([key, value]) => (
                                <div key={key} className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                                    <p className="text-[11px] text-slate-500 uppercase">{key}</p>
                                    <p className="text-slate-800 break-all">{prettyValue(value)}</p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-slate-500">No request snapshot stored for this run.</p>}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-sm font-bold text-slate-800 mb-3 inline-flex items-center gap-2">
                        <ListChecks className="size-4" /> Steps
                    </h2>
                    {Array.isArray(run.steps) && run.steps.length > 0 ? (
                        <div className="space-y-2">
                            {run.steps.map((step, idx) => (
                                <div key={`${step.id || step.label}-${idx}`} className="rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-slate-800">{idx + 1}. {step.label || step.id}</p>
                                        <span className="text-[11px] uppercase font-bold text-slate-500">{step.status || 'pending'}</span>
                                    </div>
                                    {step.error && <p className="text-xs text-red-600 mt-1">{step.error}</p>}
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-slate-500">No step details stored.</p>}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h2 className="text-sm font-bold text-slate-800 mb-3 inline-flex items-center gap-2">
                        <Terminal className="size-4" /> Logs
                    </h2>
                    <div className="rounded-lg bg-slate-950 p-3 max-h-[420px] overflow-y-auto">
                        {displayEvents.length > 0 ? (
                            <div className="space-y-1.5 font-mono text-xs">
                                {displayEvents.map((event, idx) => (
                                    <div key={`${event.timestamp || idx}-${idx}`} className="text-slate-200">
                                        <span className="text-slate-500 mr-2">[{event.type}]</span>
                                        <span className="text-slate-400 mr-2">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '--:--:--'}</span>
                                        <span>{event.message}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-slate-400">No logs stored for this run.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RunDetailPage;
