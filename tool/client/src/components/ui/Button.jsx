import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4 [&_svg]:shrink-0 ring-ring/10 focus-visible:ring-3 focus-visible:outline-1 active:scale-[0.98]',
    {
        variants: {
            variant: {
                default: 'bg-blue-600 text-white shadow-md hover:shadow-lg hover:bg-blue-700 border border-blue-700',
                destructive: 'bg-red-600 text-white shadow-md hover:shadow-lg hover:bg-red-700 border border-red-700',
                outline: 'border border-slate-300 bg-white shadow-sm hover:bg-slate-50 hover:shadow-md text-slate-900',
                secondary: 'bg-slate-100 text-slate-900 shadow-sm hover:shadow-md hover:bg-slate-200 border border-slate-200',
                ghost: 'hover:bg-slate-100 hover:text-slate-900 text-slate-700',
                link: 'text-blue-600 underline-offset-4 hover:underline hover:text-blue-700',
            },
            size: {
                default: 'h-10 px-4 py-2 has-[>svg]:px-3',
                sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs',
                lg: 'h-11 rounded-lg px-6 has-[>svg]:px-5 text-base',
                icon: 'size-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

function Button({ className, variant, size, ...props }) {
    return (
        <button
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    );
}

export { Button, buttonVariants };
