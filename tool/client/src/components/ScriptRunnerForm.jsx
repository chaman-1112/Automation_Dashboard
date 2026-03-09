import React, { useState } from 'react';
import { Label } from './ui/Label.jsx';
import { Input } from './ui/Input.jsx';
import { Button } from './ui/Button.jsx';
import { Loader2, Play, Hash } from 'lucide-react';

const SCRIPT_FIELDS = {
    copyCustomSearchMenus: {
        title: 'Copy Custom Search Menus',
        description: 'Copies custom search menu types (with images) and menus from one org to another.',
        fields: [
            { key: 'sourceOrgId', label: 'Source Org ID', placeholder: 'e.g. 799' },
            { key: 'targetOrgId', label: 'Target Org ID', placeholder: 'e.g. 945' },
        ],
    },
    copyOrgWhiteLabel: {
        title: 'Copy White Label',
        description: 'Copies white label configurations (theme_white_labelings) from one org to another.',
        fields: [
            { key: 'sourceOrgId', label: 'Source Org ID', placeholder: 'e.g. 832' },
            { key: 'targetOrgId', label: 'Target Org ID', placeholder: 'e.g. 945' },
        ],
    },
    copyOrgCustomizations: {
        title: 'Copy Org Customizations',
        description: 'Copies all customizations (Global, Custom Texts, JsonNavMenu) between orgs.',
        fields: [
            { key: 'sourceOrgId', label: 'Source Org ID', placeholder: 'e.g. 832' },
            { key: 'targetOrgId', label: 'Target Org ID', placeholder: 'e.g. 945' },
        ],
    },
    testFeatureActivation: {
        title: 'Test Feature Activation',
        description: 'Tests the API-based feature activation by copying active features between companies.',
        fields: [
            { key: 'sourceCompanyId', label: 'Source Company ID', placeholder: 'e.g. 39416' },
            { key: 'targetCompanyId', label: 'Target Company ID', placeholder: 'e.g. 91268' },
        ],
    },
    testCustomizations: {
        title: 'Test Customizations',
        description: 'Fetches customizations from source org and runs the customizations spec(PDP, SearchResult, SearchForm) against the target.',
        fields: [
            { key: 'sourceOrgId', label: 'Source Org ID', placeholder: 'e.g. 577' },
            { key: 'targetOrgId', label: 'Target Org ID', placeholder: 'e.g. 1008' },
        ],
    },
    copyCompanyCustomizations: {
        title: 'Copy Company Customizations',
        description: 'Copies all customizations (Global, Custom Texts, JsonNavMenu) between companies.',
        fields: [
            { key: 'sourceCompanyId', label: 'Source Company ID', placeholder: 'e.g. 39416' },
            { key: 'targetCompanyId', label: 'Target Company ID', placeholder: 'e.g. 91268' },
        ],
    },
};

function ScriptRunnerForm({ scriptKey, isRunning, onSubmit }) {
    const config = SCRIPT_FIELDS[scriptKey];
    const [values, setValues] = useState({});

    if (!config) return null;

    const allFilled = config.fields.every(f => (values[f.key] || '').trim());
    const canSubmit = allFilled && !isRunning;

    const handleChange = (key, val) => {
        setValues(prev => ({ ...prev, [key]: val }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        const args = config.fields.map(f => values[f.key].trim());
        onSubmit({ script: scriptKey, args });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
                <p className="text-sm text-amber-800">{config.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                        <Label htmlFor={`sr-${field.key}`} className="flex items-center gap-2">
                            <div className="p-1 rounded bg-amber-50 text-amber-600">
                                <Hash className="size-3.5" />
                            </div>
                            {field.label}
                        </Label>
                        <Input
                            id={`sr-${field.key}`}
                            placeholder={field.placeholder}
                            value={values[field.key] || ''}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="bg-white/80"
                        />
                    </div>
                ))}
            </div>

            <Button
                type="submit"
                disabled={!canSubmit}
                size="lg"
                className="mt-3 w-full bg-amber-600 hover:bg-amber-700 border-amber-700"
            >
                {isRunning ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Running...
                    </>
                ) : (
                    <>
                        <Play className="size-4" />
                        Run Script
                    </>
                )}
            </Button>

            {!canSubmit && !isRunning && (
                <p className="text-xs text-center text-muted-foreground">
                    Fill in all fields to proceed
                </p>
            )}
        </form>
    );
}

export default ScriptRunnerForm;
export { SCRIPT_FIELDS };
