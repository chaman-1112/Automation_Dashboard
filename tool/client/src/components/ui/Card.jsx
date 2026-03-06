import React from 'react';
import { cn } from '../../lib/utils.js';

function Card({ className, ...props }) {
    return (
        <div
            data-slot="card"
            className={cn(
                'bg-white text-card-foreground flex flex-col rounded-xl border border-slate-200 shadow-md hover:shadow-lg transition-shadow',
                className
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }) {
    return (
        <div
            data-slot="card-header"
            className={cn('flex flex-col gap-1.5 p-6', className)}
            {...props}
        />
    );
}

function CardTitle({ className, ...props }) {
    return (
        <div
            data-slot="card-title"
            className={cn('leading-tight font-bold text-slate-900', className)}
            {...props}
        />
    );
}

function CardDescription({ className, ...props }) {
    return (
        <div
            data-slot="card-description"
            className={cn('text-slate-600 text-sm leading-relaxed', className)}
            {...props}
        />
    );
}

function CardContent({ className, ...props }) {
    return (
        <div
            data-slot="card-content"
            className={cn('p-6', className)}
            {...props}
        />
    );
}

function CardFooter({ className, ...props }) {
    return (
        <div
            data-slot="card-footer"
            className={cn('flex items-center pt-2', className)}
            {...props}
        />
    );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
