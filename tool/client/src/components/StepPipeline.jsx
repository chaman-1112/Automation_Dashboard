import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, Circle, Play, RotateCcw, SkipForward, Clock } from 'lucide-react';
import { cn } from '../lib/utils.js';
import { Button } from './ui/Button.jsx';

function StepPipeline({ steps, onResume, onRetry, onSkip, isRunning }) {
    const fmtDuration = (ms) => {
        if (!ms) return null;
        const secs = Math.round(ms / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
    };

    if (!steps || steps.length === 0) return null;

    return (
        <div className="relative">
            {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const timing = fmtDuration(step.duration);
                const hasAnyAction = !!(onResume || onRetry || onSkip);
                const showActions = step.status === 'failed' && !isRunning && hasAnyAction;

                return (
                    <div key={step.id} className="relative flex gap-4">
                        {/* Vertical connector line */}
                        {!isLast && (
                            <div
                                className={cn(
                                    'absolute left-[13px] top-[34px] bottom-0 w-0.5 rounded-full',
                                    step.status === 'completed' ? 'bg-emerald-200' :
                                    step.status === 'failed' ? 'bg-red-200' :
                                    step.status === 'running' ? 'bg-blue-200' :
                                    'bg-slate-150'
                                )}
                                style={{ backgroundColor: step.status === 'pending' ? '#e8ecf0' : undefined }}
                            />
                        )}

                        {/* Icon */}
                        <div className="relative z-10 shrink-0 pt-2.5">
                            {step.status === 'completed' && (
                                <div className="size-7 rounded-full bg-emerald-500 flex items-center justify-center ring-4 ring-emerald-50">
                                    <Check className="size-3.5 text-white" strokeWidth={3} />
                                </div>
                            )}
                            {step.status === 'failed' && (
                                <div className="size-7 rounded-full bg-red-500 flex items-center justify-center ring-4 ring-red-50">
                                    <X className="size-3.5 text-white" strokeWidth={3} />
                                </div>
                            )}
                            {step.status === 'running' && (
                                <div className="size-7 rounded-full bg-blue-500 flex items-center justify-center ring-4 ring-blue-50 animate-pulse">
                                    <Loader2 className="size-3.5 text-white animate-spin" strokeWidth={2.5} />
                                </div>
                            )}
                            {step.status === 'skipped' && (
                                <div className="size-7 rounded-full bg-slate-300 flex items-center justify-center ring-4 ring-slate-50">
                                    <SkipForward className="size-3 text-white" strokeWidth={2.5} />
                                </div>
                            )}
                            {step.status === 'pending' && (
                                <div className="size-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center ring-4 ring-white">
                                    <Circle className="size-2.5 text-slate-300 fill-current" />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className={cn(
                            'flex-1 min-w-0 pb-5',
                            isLast && 'pb-0',
                        )}>
                            <div className={cn(
                                'rounded-xl px-4 py-3 transition-all',
                                step.status === 'running' && 'bg-blue-50/70 border border-blue-100',
                                step.status === 'failed' && 'bg-red-50/70 border border-red-100',
                                step.status === 'completed' && 'bg-white',
                                step.status === 'pending' && 'opacity-50',
                                step.status === 'skipped' && 'opacity-40',
                            )}>
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className={cn(
                                        'text-sm font-semibold',
                                        step.status === 'completed' ? 'text-slate-700' :
                                        step.status === 'failed' ? 'text-red-700' :
                                        step.status === 'running' ? 'text-blue-700' :
                                        'text-slate-400'
                                    )}>
                                        {i + 1}. {step.label}
                                    </h4>
                                    {timing && (
                                        <span className={cn(
                                            'text-[11px] tabular-nums flex items-center gap-1 shrink-0 font-medium',
                                            step.status === 'completed' ? 'text-slate-400' :
                                            step.status === 'failed' ? 'text-red-400' : 'text-slate-400'
                                        )}>
                                            <Clock className="size-3" />
                                            {timing}
                                        </span>
                                    )}
                                </div>

                                {step.error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-2.5 px-3 py-2 rounded-lg bg-red-100/80 border border-red-200"
                                    >
                                        <p className="text-xs text-red-700 font-medium leading-relaxed">{step.error}</p>
                                    </motion.div>
                                )}

                                {showActions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 mt-3"
                                    >
                                        {onResume && (
                                            <Button size="sm" onClick={() => onResume(step.id)} className="bg-blue-600 hover:bg-blue-700 border-blue-700 text-xs h-7 px-3">
                                                <Play className="size-3" />
                                                Resume from here
                                            </Button>
                                        )}
                                        {onRetry && (
                                            <Button size="sm" variant="outline" onClick={() => onRetry(step.id)} className="text-xs h-7 px-3">
                                                <RotateCcw className="size-3" />
                                                Retry
                                            </Button>
                                        )}
                                        {onSkip && (
                                            <Button size="sm" variant="ghost" onClick={() => onSkip(step.id)} className="text-slate-500 text-xs h-7 px-3">
                                                <SkipForward className="size-3" />
                                                Skip
                                            </Button>
                                        )}
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default StepPipeline;
