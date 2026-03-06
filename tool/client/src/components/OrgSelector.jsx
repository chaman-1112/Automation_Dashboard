import React from 'react';
import { Building2 } from 'lucide-react';
import { Label } from './ui/Label.jsx';
import { Select } from './ui/Select.jsx';

function OrgSelector({ orgs, selectedOrg, onSelect }) {
    return (
        <div className="space-y-3">
            <Label htmlFor="org-select" className="flex items-center gap-2">
                <div className="p-1 rounded bg-violet-50 text-violet-600">
                    <Building2 className="size-3.5" />
                </div>
                Organization
            </Label>

            <Select
                id="org-select"
                value={selectedOrg || ''}
                onChange={(e) => onSelect(e.target.value || null)}
                className="bg-white/80"
                searchable
                searchPlaceholder="Search by org name or ID..."
            >
                <option value="">Select an organization...</option>
                {orgs.map((org) => (
                    <option key={org.id} value={org.id}>
                        {org.name} (#{org.id})
                    </option>
                ))}
            </Select>
        </div>
    );
}

export default OrgSelector;
