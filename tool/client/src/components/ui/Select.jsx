import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '../../lib/utils.js';

function Select({
    className,
    children,
    value,
    onChange,
    disabled,
    id,
    name,
    searchable,
    searchPlaceholder = 'Search...'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);

    const options = useMemo(
        () => React.Children.toArray(children).filter((child) => React.isValidElement(child) && child.type === 'option'),
        [children]
    );

    const normalizedValue = value == null ? '' : String(value);
    const selectedOption = options.find((opt) => String(opt.props.value ?? '') === normalizedValue) || options[0];
    const enableSearch = searchable ?? options.length > 8;

    const filteredOptions = useMemo(() => {
        if (!enableSearch) return options;
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((opt) => String(opt.props.children ?? '').toLowerCase().includes(q));
    }, [enableSearch, options, query]);

    useEffect(() => {
        const onDocClick = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        const onEsc = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, []);

    const emitChange = (nextValue) => {
        onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } });
    };

    const handleSelect = (nextValue) => {
        emitChange(nextValue);
        setIsOpen(false);
    };

    return (
        <div className={cn('relative', className)} ref={rootRef}>
            {name && <input type="hidden" name={name} value={normalizedValue} />}
            <button
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    setIsOpen((v) => {
                        const next = !v;
                        if (next) setQuery('');
                        return next;
                    });
                }}
                className={cn(
                    'flex h-10 w-full items-center justify-between rounded-lg border-2 border-slate-200 bg-white px-3.5 py-2 text-sm shadow-sm transition-all outline-none',
                    'hover:border-slate-300',
                    'focus-visible:border-violet-400 focus-visible:ring-4 focus-visible:ring-violet-100',
                    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
                    isOpen && 'border-violet-400 ring-4 ring-violet-100'
                )}
            >
                <span className="truncate text-left">{selectedOption?.props?.children}</span>
                <ChevronDown className={cn('size-4.5 text-slate-400 transition-transform', isOpen && 'rotate-180')} strokeWidth={2.5} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-lg border-2 border-slate-200 bg-white shadow-xl">
                    {enableSearch && (
                        <div className="border-b border-slate-200 p-2">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-sm outline-none focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-100"
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-72 overflow-auto py-1">
                        {filteredOptions.map((opt) => {
                            const optionValue = String(opt.props.value ?? '');
                            const isSelected = optionValue === normalizedValue;
                            return (
                                <button
                                    key={`${optionValue}-${String(opt.props.children)}`}
                                    type="button"
                                    onClick={() => handleSelect(optionValue)}
                                    className={cn(
                                        'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50',
                                        isSelected && 'bg-blue-50 text-blue-700'
                                    )}
                                >
                                    <span className="truncate">{opt.props.children}</span>
                                    {isSelected && <Check className="size-4 shrink-0" />}
                                </button>
                            );
                        })}
                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                No options found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export { Select };
