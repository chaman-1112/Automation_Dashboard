import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';

function Dropdown({ value, onChange, options, disabled, className }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt => opt.id === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionId) => {
        onChange(optionId);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className={cn('relative', className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={cn(
                    'flex h-11 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-all outline-none',
                    'hover:bg-slate-50 hover:border-slate-400',
                    'focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-200',
                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
                    isOpen && 'border-blue-500 ring-2 ring-blue-200'
                )}
            >
                <span className="text-slate-700">{selectedOption.label}</span>
                <ChevronDown className={cn(
                    'size-4 text-slate-500 transition-transform ml-2',
                    isOpen && 'rotate-180'
                )} strokeWidth={2} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-slate-300 bg-white shadow-xl overflow-hidden">
                    {options.map((option) => {
                        const Icon = option.icon;
                        const isSelected = option.id === value;
                        return (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSelect(option.id)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                                    isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700',
                                    'border-b border-slate-100 last:border-b-0'
                                )}
                            >
                                {Icon && (
                                    <div className={cn(
                                        'p-1.5 rounded-md',
                                        option.iconBg || 'bg-slate-100'
                                    )}>
                                        <Icon className={cn(
                                            'size-4 shrink-0',
                                            option.iconColor || 'text-slate-600'
                                        )} strokeWidth={2} />
                                    </div>
                                )}
                                <span className="text-sm font-medium">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export { Dropdown };
