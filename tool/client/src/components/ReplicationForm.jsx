import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Building2, Pencil, X, Copy } from 'lucide-react';
import { Input } from './ui/Input.jsx';
import { Label } from './ui/Label.jsx';
import { Button } from './ui/Button.jsx';

const fade = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
};

function ReplicationForm({ orgDetails, companyDetails, isReplicating, onReplicate, plans = {} }) {
    const [newOrgName, setNewOrgName] = useState('');
    const [newDomainUrl, setNewDomainUrl] = useState('');
    const [newCompanyName, setNewCompanyName] = useState('');
    const [orgNameError, setOrgNameError] = useState('');
    const [companyNameError, setCompanyNameError] = useState('');
    const [validating, setValidating] = useState(false);

    useEffect(() => {
        if (orgDetails) {
            setNewOrgName(`Copy of ${orgDetails.name}`);
            setNewDomainUrl(`copy-${orgDetails.domain_url || 'org'}-${Date.now()}`);
        }
    }, [orgDetails]);

    useEffect(() => {
        if (companyDetails) setNewCompanyName(`Copy of ${companyDetails.name}`);
        else setNewCompanyName('');
    }, [companyDetails]);

    // Validate org name on blur
    const validateOrgName = async () => {
        if (!newOrgName.trim()) return;
        try {
            const res = await fetch(`/api/data/validate/org-name?name=${encodeURIComponent(newOrgName)}`);
            const data = await res.json();
            if (data.exists) {
                setOrgNameError(`This name is already used by org #${data.match.id}`);
            } else {
                setOrgNameError('');
            }
        } catch { setOrgNameError(''); }
    };

    // Validate company name on blur
    const validateCompanyName = async () => {
        if (!newCompanyName.trim()) return;
        try {
            const res = await fetch(`/api/data/validate/company-name?name=${encodeURIComponent(newCompanyName)}`);
            const data = await res.json();
            if (data.exists) {
                setCompanyNameError(`This name is already used by company #${data.match.id}`);
            } else {
                setCompanyNameError('');
            }
        } catch { setCompanyNameError(''); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setValidating(true);

        // Pre-submit validation
        try {
            const orgRes = await fetch(`/api/data/validate/org-name?name=${encodeURIComponent(newOrgName)}`);
            const orgData = await orgRes.json();
            if (orgData.exists) {
                setOrgNameError(`This name is already used by org #${orgData.match.id}`);
                setValidating(false);
                return;
            }

            if (companyDetails && newCompanyName) {
                const compRes = await fetch(`/api/data/validate/company-name?name=${encodeURIComponent(newCompanyName)}`);
                const compData = await compRes.json();
                if (compData.exists) {
                    setCompanyNameError(`This name is already used by company #${compData.match.id}`);
                    setValidating(false);
                    return;
                }
            }
        } catch { /* proceed if validation endpoint is down */ }

        setValidating(false);
        onReplicate({ newOrgName, newDomainUrl, newCompanyName: companyDetails ? newCompanyName : undefined });
    };

    if (!orgDetails) {
        return (
            <div className="flex flex-col items-center justify-center py-14">
                <div className="flex size-12 items-center justify-center rounded-xl bg-muted mb-3">
                    <Copy className="size-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">Select an organization to get started.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

            {/* ── Override Fields ── */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-slate-100">
                        <Pencil className="size-3.5 text-slate-600" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Override Names</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-org-name">New Organization Name</Label>
                    <Input 
                        id="new-org-name" 
                        value={newOrgName} 
                        onChange={(e) => { setNewOrgName(e.target.value); setOrgNameError(''); }} 
                        onBlur={validateOrgName} 
                        placeholder="Enter new org name..." 
                        required 
                        className={orgNameError ? 'border-red-400 focus-visible:ring-red-100 focus-visible:border-red-400' : 'bg-white/80'} 
                    />
                    {orgNameError && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border-2 border-red-200">
                            <X className="size-3.5 text-red-600 shrink-0" />
                            <p className="text-xs text-red-700 font-semibold">{orgNameError}</p>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-domain-url">New Domain URL</Label>
                    <Input 
                        id="new-domain-url" 
                        value={newDomainUrl} 
                        onChange={(e) => setNewDomainUrl(e.target.value)} 
                        placeholder="Enter domain..." 
                        required 
                        className="bg-white/80"
                    />
                </div>

                <AnimatePresence>
                    {companyDetails && (
                        <motion.div {...fade} className="space-y-2">
                            <Label htmlFor="new-company-name">New Company Name</Label>
                            <Input 
                                id="new-company-name" 
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
            </div>

            <Button 
                type="submit" 
                size="lg" 
                disabled={isReplicating || validating || !newOrgName || !!orgNameError || !!companyNameError} 
                className="w-full mt-2 bg-violet-600 hover:bg-violet-700 border-violet-700"
            >
                {isReplicating ? (
                    <>
                        <Loader2 className="size-4 animate-spin" /> 
                        Copying Organization...
                    </>
                ) : (
                    <>
                        <Building2 className="size-4" /> 
                        Copy Organization
                    </>
                )}
            </Button>
        </form>
    );
}

export default ReplicationForm;
