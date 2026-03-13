import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Menu, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils.js';

const overlay = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
};

const drawer = {
    initial: { x: '-100%' },
    animate: { x: 0, transition: { type: 'spring', damping: 28, stiffness: 300 } },
    exit: { x: '-100%', transition: { duration: 0.2, ease: 'easeIn' } },
};

function Sidebar({ isOpen, onClose, items, activeId, onSelect, disabled }) {
    const grouped = {
        main: items.filter(i => !i.scriptKey),
        scripts: items.filter(i => !!i.scriptKey),
    };

    const handleSelect = (id) => {
        if (disabled) return;
        onSelect(id);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        {...overlay}
                        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.aside
                        {...drawer}
                        className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col"
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Workflows</h2>
                                <p className="text-xs text-slate-500 mt-0.5">{disabled ? 'Locked — a process is running' : 'Select an automation task'}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="size-5 text-slate-500" />
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto py-3">
                            <div className="px-4 mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                    Replication
                                </p>
                            </div>
                            {grouped.main.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.id === activeId;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item.id)}
                                        disabled={disabled}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-5 py-3 text-left transition-all',
                                            isActive
                                                ? 'bg-blue-50 border-r-3 border-blue-600'
                                                : 'hover:bg-slate-50 border-r-3 border-transparent',
                                            disabled && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        <div className={cn('p-1.5 rounded-lg', item.iconBg || 'bg-slate-100')}>
                                            <Icon className={cn('size-4', item.iconColor || 'text-slate-600')} strokeWidth={2} />
                                        </div>
                                        <span className={cn(
                                            'text-sm font-medium flex-1',
                                            isActive ? 'text-blue-700' : 'text-slate-700'
                                        )}>
                                            {item.label}
                                        </span>
                                        {isActive && <ChevronRight className="size-4 text-blue-500" />}
                                    </button>
                                );
                            })}

                            <div className="px-4 mt-5 mb-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                                    Scripts
                                </p>
                            </div>
                            {grouped.scripts.map((item) => {
                                const Icon = item.icon;
                                const isActive = item.id === activeId;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item.id)}
                                        disabled={disabled}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-all',
                                            isActive
                                                ? 'bg-amber-50 border-r-3 border-amber-500'
                                                : 'hover:bg-slate-50 border-r-3 border-transparent',
                                            disabled && 'opacity-50 cursor-not-allowed'
                                        )}
                                    >
                                        <div className={cn('p-1.5 rounded-lg', item.iconBg || 'bg-slate-100')}>
                                            <Icon className={cn('size-3.5', item.iconColor || 'text-slate-600')} strokeWidth={2} />
                                        </div>
                                        <span className={cn(
                                            'text-xs font-medium flex-1 leading-tight',
                                            isActive ? 'text-amber-700' : 'text-slate-600'
                                        )}>
                                            {item.label.replace('Script: ', '')}
                                        </span>
                                        {isActive && <ChevronRight className="size-3.5 text-amber-500" />}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
                            <p className="text-[10px] text-slate-400 text-center">VDB Automation Dashboard</p>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

function SidebarTrigger({ onClick, className }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all',
                className
            )}
        >
            <Menu className="size-5 text-slate-700" strokeWidth={2} />
        </button>
    );
}

export { Sidebar, SidebarTrigger };
