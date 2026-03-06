import React, { useState, useMemo } from 'react';
import { Search, Building, Tag } from 'lucide-react';
import { Select } from './ui/Select.jsx';
import { Input } from './ui/Input.jsx';
import { Label } from './ui/Label.jsx';

function CompanySelector({ companies, selectedCompany, onSelect }) {
    const [filter, setFilter] = useState('');

    const filtered = useMemo(() => {
        if (!filter.trim()) return companies;
        const q = filter.toLowerCase();
        return companies.filter(c => c.name.toLowerCase().includes(q) || String(c.id).includes(q));
    }, [companies, filter]);

    return (
        <div className="space-y-3">
            <Label htmlFor="company-select" className="flex items-center gap-2">
                <div className="p-1 rounded bg-blue-50 text-blue-600">
                    <Building className="size-3.5" />
                </div>
                Company 
                <span className="text-muted-foreground/60 font-normal text-xs">(optional)</span>
            </Label>
            <Select
                id="company-select"
                value={selectedCompany || ''}
                onChange={(e) => onSelect(e.target.value || null)}
                className="bg-white/80"
            >
                <option value="">Select a company...</option>
                {filtered.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name} ({c.company_type}) #{c.id}
                    </option>
                ))}
            </Select>

            {filter && filtered.length === 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="p-1 rounded bg-amber-100 text-amber-600">
                        <Search className="size-3" />
                    </div>
                    <p className="text-xs text-amber-700">No companies match "{filter}"</p>
                </div>
            )}
        </div>
    );
}

export default CompanySelector;
