import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Database } from 'lucide-react';
import { SidebarTrigger } from './Sidebar.jsx';
import StepPipeline from './StepPipeline.jsx';
import StatusLog from './StatusLog.jsx';
import { Card } from './ui/Card.jsx';
import { Badge } from './ui/Badge.jsx';
import { fadeIn } from '../constants.js';

function MainContent({
    activeNavItem, ActiveIcon, isRunning, dbStatus,
    steps, logs, overallStatus, runStartTime, selectedOrg,
    onResume, onRetry, onSkip, onOpenSidebar,
}) {
    return (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <header className="h-[62px] border-b border-slate-200 bg-white flex items-center justify-between px-5 shrink-0">
                <div className="flex items-center gap-3">
                    <SidebarTrigger onClick={onOpenSidebar} className="lg:hidden" />
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-md ${activeNavItem?.iconBg || 'bg-slate-100'}`}>
                            <ActiveIcon className={`size-3.5 ${activeNavItem?.iconColor || 'text-slate-600'}`} strokeWidth={2} />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{activeNavItem?.label || 'Select Workflow'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={dbStatus === 'connected' ? 'success' : dbStatus === 'error' ? 'destructive' : 'warning'} className="px-2 py-0.5 text-[10px] hidden sm:inline-flex">
                        <Database className="size-3 mr-1" />
                        {dbStatus === 'connected' ? 'Online' : dbStatus === 'error' ? 'Offline' : 'Checking'}
                    </Badge>
                    <Badge variant={isRunning ? 'warning' : 'secondary'} className="px-2 py-0.5 text-[10px]">
                        <Activity className="size-3 mr-1" />
                        {isRunning ? 'Running' : 'Idle'}
                    </Badge>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="px-6 py-6">
                    {steps.length > 0 || logs.length > 0 ? (
                        <div className={`flex gap-5 ${steps.length > 0 && logs.length > 0 ? 'flex-row' : 'flex-col'}`}>
                            {steps.length > 0 && (
                                <motion.div {...fadeIn} className={logs.length > 0 ? 'w-1/2 min-w-0' : 'w-full'}>
                                    <Card className="overflow-hidden border-slate-200 h-full">
                                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                                            <div>
                                                <h2 className="text-sm font-bold text-slate-900">
                                                    {activeNavItem?.label || 'Process'} {selectedOrg ? `· Org #${selectedOrg}` : ''}
                                                </h2>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    Started {runStartTime ? `${runStartTime.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}, ${runStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '—'}
                                                </p>
                                            </div>
                                            <Badge variant={overallStatus === 'running' ? 'info' : overallStatus === 'completed' ? 'success' : overallStatus === 'failed' ? 'destructive' : 'secondary'} className="capitalize text-[10px] px-2.5">
                                                {overallStatus}
                                            </Badge>
                                        </div>
                                        <div className="px-5 py-4">
                                            <StepPipeline steps={steps} onResume={onResume} onRetry={onRetry} onSkip={onSkip} isRunning={isRunning} />
                                        </div>
                                    </Card>
                                </motion.div>
                            )}

                            <AnimatePresence>
                                {logs.length > 0 && (
                                    <motion.div {...fadeIn} className={steps.length > 0 ? 'w-1/2 min-w-0' : 'w-full'}>
                                        <StatusLog logs={logs} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center w-full">
                            <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                <ActiveIcon className="size-7 text-slate-400" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 mb-1">{activeNavItem?.label || 'Select a Workflow'}</h3>
                            <p className="text-sm text-slate-400 max-w-sm">Configure the parameters in the left panel and click Start to begin.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MainContent;
