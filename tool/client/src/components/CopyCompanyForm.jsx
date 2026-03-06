import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Building2, Building, Pencil, X } from 'lucide-react';
import { Select } from './ui/Select.jsx';
import { Input } from './ui/Input.jsx';
import { Label } from './ui/Label.jsx';
import { Button } from './ui/Button.jsx';

const fade = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
};

function CopyCompanyForm({ orgs, isReplicating, onCopyCompany, onDetailsChange }) {
    const [sourceOrgId, setSourceOrgId] = useState('');
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState('');
    const [companyDetails, setCompanyDetails] = useState(null);
    const [sourceOrgDetails, setSourceOrgDetails] = useState(null);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [destOrgId, setDestOrgId] = useState('');
    const [destOrgDetails, setDestOrgDetails] = useState(null);
    const [companyNameError, setCompanyNameError] = useState('');
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        if (!sourceOrgId) { setCompanies([]); setSelectedCompany(''); setCompanyDetails(null); setSourceOrgDetails(null); setNewCompanyName(''); return; }
        setLoadingCompanies(true); setSelectedCompany(''); setCompanyDetails(null); setNewCompanyName('');
        fetch(`/api/data/orgs/${sourceOrgId}`).then(r => r.json()).then(setSourceOrgDetails).catch(console.error);
        fetch(`/api/data/companies?org_id=${sourceOrgId}`).then(r => r.json()).then(setCompanies).catch(console.error).finally(() => setLoadingCompanies(false));
    }, [sourceOrgId]);

    useEffect(() => {
        if (!selectedCompany) { setCompanyDetails(null); setNewCompanyName(''); return; }
        fetch(`/api/data/companies/${selectedCompany}`).then(r => r.json()).then(d => { setCompanyDetails(d); setNewCompanyName(`Copy of ${d.name}`); }).catch(console.error);
    }, [selectedCompany]);

    useEffect(() => {
        if (!destOrgId) { setDestOrgDetails(null); return; }
        fetch(`/api/data/orgs/${destOrgId}`).then(r => r.json()).then(setDestOrgDetails).catch(console.error);
    }, [destOrgId]);

    useEffect(() => {
        onDetailsChange?.({ orgDetails: sourceOrgDetails, companyDetails, destOrgDetails });
    }, [sourceOrgDetails, companyDetails, destOrgDetails, onDetailsChange]);

    // Validate company name on blur
    const validateCompanyName = async () => {
        if (!newCompanyName.trim() || !destOrgId) return;
        try {
            const res = await fetch(`/api/data/validate/company-name?name=${encodeURIComponent(newCompanyName)}&org_id=${destOrgId}`);
            const data = await res.json();
            if (data.exists) {
                setCompanyNameError(`This name is already used by company #${data.match.id} in this org`);
            } else {
                setCompanyNameError('');
            }
        } catch { setCompanyNameError(''); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!destOrgId || !selectedCompany || !newCompanyName) return;

        setValidating(true);
        try {
            const res = await fetch(`/api/data/validate/company-name?name=${encodeURIComponent(newCompanyName)}&org_id=${destOrgId}`);
            const data = await res.json();
            if (data.exists) {
                setCompanyNameError(`This name is already used by company #${data.match.id} in this org`);
                setValidating(false);
                return;
            }
        } catch { /* proceed if validation endpoint is down */ }

        setValidating(false);
        onCopyCompany({ targetOrgId: destOrgId, sourceCompanyId: selectedCompany, newCompanyName });
    };

    const hasFlow = sourceOrgDetails || companyDetails || destOrgDetails;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* ── Selectors ── */}
            <div className="space-y-2">
                <Label htmlFor="cc-src-org" className="flex items-center gap-2">
                    <div className="p-1 rounded bg-slate-100">
                        <Building2 className="size-3.5 text-slate-600" />
                    </div>
                    Source Organization
                    <span className="text-muted-foreground/50 font-normal text-xs">(pick company from this org)</span>
                </Label>
                <Select id="cc-src-org" value={sourceOrgId} onChange={(e) => setSourceOrgId(e.target.value)} className="bg-white/80">
                    <option value="">Select source org...</option>
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>)}
                </Select>
            </div>

            <AnimatePresence>
                {sourceOrgId && (
                    <motion.div {...fade} className="space-y-2">
                        <Label htmlFor="cc-src-co" className="flex items-center gap-2">
                            <div className="p-1 rounded bg-blue-50">
                                <Building className="size-3.5 text-blue-600" />
                            </div>
                            Source Company 
                            <span className="text-muted-foreground/50 font-normal text-xs">(to copy)</span>
                        </Label>
                        <Select id="cc-src-co" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} disabled={loadingCompanies} className="bg-white/80">
                            <option value="">{loadingCompanies ? 'Loading...' : 'Select a company...'}</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company_type}) #{c.id}</option>)}
                        </Select>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedCompany && (
                    <motion.div {...fade} className="space-y-2">
                        <Label htmlFor="cc-dest-org" className="flex items-center gap-2">
                            <div className="p-1 rounded bg-emerald-50">
                                <Building2 className="size-3.5 text-emerald-600" />
                            </div>
                            Destination Organization
                            <span className="text-muted-foreground/50 font-normal text-xs">(copy into this org)</span>
                        </Label>
                        <Select id="cc-dest-org" value={destOrgId} onChange={(e) => setDestOrgId(e.target.value)} className="bg-white/80">
                            <option value="">Select destination org...</option>
                            {orgs.map(o => <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>)}
                        </Select>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {companyDetails && destOrgId && (
                    <motion.div {...fade} className="space-y-2">
                        <Label htmlFor="cc-new-name" className="flex items-center gap-2">
                            <div className="p-1 rounded bg-violet-50">
                                <Pencil className="size-3.5 text-violet-600" />
                            </div>
                            New Company Name
                        </Label>
                        <Input 
                            id="cc-new-name" 
                            value={newCompanyName} 
                            onChange={(e) => { setNewCompanyName(e.target.value); setCompanyNameError(''); }} 
                            onBlur={validateCompanyName} 
                            placeholder="Enter new company name..." 
                            required 
                            className={companyNameError ? 'border-red-400 focus-visible:ring-red-100 focus-visible:border-red-400' : 'bg-white/80'} 
                        />
                        {companyNameError && (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border-2 border-red-200">
                                <X className="size-3.5 text-red-600 shrink-0" />
                                <p className="text-xs text-red-700 font-semibold">{companyNameError}</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit */}
            <Button 
                type="submit" 
                size="lg" 
                disabled={isReplicating || validating || !destOrgId || !selectedCompany || !newCompanyName || !!companyNameError} 
                className="w-full mt-2"
            >
                {isReplicating ? (
                    <>
                        <Loader2 className="size-4 animate-spin" /> 
                        Copying Company...
                    </>
                ) : (
                    <>
                        <Building className="size-4" /> 
                        Copy Company
                    </>
                )}
            </Button>

            {!sourceOrgId && (
                <p className="text-xs text-muted-foreground text-center">Select the source org to browse companies, then choose where to copy.</p>
            )}
        </form>
    );
}

export default CopyCompanyForm;
