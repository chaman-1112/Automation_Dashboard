import React from 'react';
import { cn } from '../../lib/utils.js';

function Input({ className, type, ...props }) {
    return (
        <input
            data-slot="input"
            type={type}
            className={cn(
                'file:text-foreground placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground flex h-10 w-full min-w-0 rounded-lg border-2 border-slate-200 bg-white px-3.5 py-2 text-sm shadow-sm transition-all outline-none',
                'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
                'hover:border-slate-300',
                'focus-visible:border-violet-400 focus-visible:ring-4 focus-visible:ring-violet-100',
                'aria-invalid:ring-red-100 aria-invalid:border-red-400 aria-invalid:focus-visible:ring-red-100',
                'disabled:pointer-events-none disabled:opacity-50 disabled:bg-slate-50',
                className
            )}
            {...props}
        />
    );
}

export { Input };
