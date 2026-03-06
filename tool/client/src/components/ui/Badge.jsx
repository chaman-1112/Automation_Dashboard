import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all w-fit border',
    {
        variants: {
            variant: {
                default: 'border-slate-200 bg-slate-50 text-slate-700',
                secondary: 'border-slate-300 bg-slate-100 text-slate-700',
                destructive: 'border-red-300 bg-red-100 text-red-700',
                outline: 'border-slate-300 text-slate-700 bg-white',
                success: 'border-emerald-300 bg-emerald-100 text-emerald-700',
                warning: 'border-amber-300 bg-amber-100 text-amber-700',
                info: 'border-blue-300 bg-blue-100 text-blue-700',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

function Badge({ className, variant, ...props }) {
    return (
        <div data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
