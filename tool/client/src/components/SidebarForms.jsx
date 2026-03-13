import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { SCRIPT_FIELDS } from './ScriptRunnerForm.jsx';
import { Select } from './ui/Select.jsx';
import { sideInput, sideLabel, fadeIn } from '../constants.js';

export function OrgForm({
    orgs, companies, selectedOrg, setSelectedOrg, selectedCompany, setSelectedCompany,
    orgDetails, companyDetails, newOrgName, setNewOrgName, newDomainUrl, setNewDomainUrl,
    newCompanyName, setNewCompanyName, disabled,
}) {
    return (
        <>
            <div className="flex flex-col gap-2">
                <div className="flex-1 min-w-0">
                    <label className={sideLabel}>Organization</label>
                    <Select value={selectedOrg || ''} onChange={e => setSelectedOrg(e.target.value || null)} className="w-full" searchable searchPlaceholder="Search orgs..." disabled={disabled}>
                        <option value="">Select org...</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>)}
                    </Select>
                </div>
                {selectedOrg && (
                    <div className="flex-1 min-w-0">
                        <label className={sideLabel}>Company <span className="text-slate-400 normal-case">(opt)</span></label>
                        <Select value={selectedCompany || ''} onChange={e => setSelectedCompany(e.target.value || null)} className="w-full" disabled={disabled}>
                            <option value="">None</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name} #{c.id}</option>)}
                        </Select>
                    </div>
                )}
            </div>
            {orgDetails && (
                <motion.div {...fadeIn} className="space-y-2 pt-1">
                    <div className="h-px bg-slate-100" />
                    <div>
                        <label className={sideLabel}>New Org Name</label>
                        <input className={sideInput} value={newOrgName} onChange={e => setNewOrgName(e.target.value)} onBlur={e => setNewOrgName(e.target.value.trim())} placeholder="New org name..." disabled={disabled} />
                    </div>
                    <div>
                        <label className={sideLabel}>Domain URL</label>
                        <input className={sideInput} value={newDomainUrl} onChange={e => setNewDomainUrl(e.target.value)} onBlur={e => setNewDomainUrl(e.target.value.trim())} placeholder="Domain..." disabled={disabled} />
                    </div>
                    {companyDetails && (
                        <div>
                            <label className={sideLabel}>New Company Name</label>
                            <input className={sideInput} value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} onBlur={e => setNewCompanyName(e.target.value.trim())} placeholder="Company name..." disabled={disabled} />
                        </div>
                    )}
                </motion.div>
            )}
        </>
    );
}

export function CompanyForm({
    orgs, ccSourceOrg, setCcSourceOrg, ccCompanies, ccSelectedCompany, setCcSelectedCompany,
    ccDestOrg, setCcDestOrg, ccNewName, setCcNewName, disabled,
}) {
    return (
        <>
            <div className="flex flex-col gap-2">
                <div className="flex-1 min-w-0">
                    <label className={sideLabel}>Source Org</label>
                    <Select value={ccSourceOrg} onChange={e => setCcSourceOrg(e.target.value)} className="w-full" searchable searchPlaceholder="Search..." disabled={disabled}>
                        <option value="">Select...</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>)}
                    </Select>
                </div>
                {ccSourceOrg && (
                    <div className="flex-1 min-w-0">
                        <label className={sideLabel}>Source Company</label>
                        <Select value={ccSelectedCompany} onChange={e => setCcSelectedCompany(e.target.value)} className="w-full" disabled={disabled}>
                            <option value="">Select...</option>
                            {ccCompanies.map(c => <option key={c.id} value={c.id}>{c.name} #{c.id}</option>)}
                        </Select>
                    </div>
                )}
            </div>
            {ccSelectedCompany && (
                <motion.div {...fadeIn} className="space-y-2">
                    <div>
                        <label className={sideLabel}>Destination Org</label>
                        <Select value={ccDestOrg} onChange={e => setCcDestOrg(e.target.value)} className="w-full" searchable searchPlaceholder="Search..." disabled={disabled}>
                            <option value="">Select dest org...</option>
                            {orgs.map(o => <option key={o.id} value={o.id}>{o.name} (#{o.id})</option>)}
                        </Select>
                    </div>
                    {ccDestOrg && (
                        <div>
                            <label className={sideLabel}>New Company Name</label>
                            <input className={sideInput} value={ccNewName} onChange={e => setCcNewName(e.target.value)} onBlur={e => setCcNewName(e.target.value.trim())} placeholder="Company name..." disabled={disabled} />
                        </div>
                    )}
                </motion.div>
            )}
        </>
    );
}

export function UserForm({
    cuBaseUrl, setCuBaseUrl, cuEmail, setCuEmail, cuPassword, setCuPassword,
    cuCompanyId, setCuCompanyId, cuName, setCuName, cuCount, setCuCount, disabled,
}) {
    return (
        <>
            <div>
                <label className={sideLabel}>Base URL</label>
                <input className={sideInput} value={cuBaseUrl} onChange={e => setCuBaseUrl(e.target.value)} onBlur={e => setCuBaseUrl(e.target.value.trim())} placeholder="https://example.customvirtual.app" disabled={disabled} />
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex-1"><label className={sideLabel}>Email</label><input className={sideInput} type="email" value={cuEmail} onChange={e => setCuEmail(e.target.value)} onBlur={e => setCuEmail(e.target.value.trim())} placeholder="admin@example.com" disabled={disabled} /></div>
                <div className="flex-1"><label className={sideLabel}>Password</label><input className={sideInput} type="password" value={cuPassword} onChange={e => setCuPassword(e.target.value)} onBlur={e => setCuPassword(e.target.value.trim())} placeholder="********" disabled={disabled} /></div>
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex-1"><label className={sideLabel}>Company ID</label><input className={sideInput} value={cuCompanyId} onChange={e => setCuCompanyId(e.target.value)} onBlur={e => setCuCompanyId(e.target.value.trim())} placeholder="e.g. 204542" disabled={disabled} /></div>
                <div className="flex-1"><label className={sideLabel}>Name Prefix</label><input className={sideInput} value={cuName} onChange={e => setCuName(e.target.value)} onBlur={e => setCuName(e.target.value.trim())} placeholder="e.g. Automation" disabled={disabled} /></div>
            </div>
            <div className="w-1/2">
                <label className={sideLabel}>Users Count</label>
                <input className={sideInput} type="number" min={1} max={50} value={cuCount} onChange={e => setCuCount(e.target.value)} disabled={disabled} />
            </div>
        </>
    );
}

export function InventoryPermissionForm({
    ipClientCompanyId, setIpClientCompanyId,
    ipVendorCompanyIds, setIpVendorCompanyIds,
    ipCreateApiClient, setIpCreateApiClient,
    ipProducts, setIpProducts,
    disabled,
}) {
    const productDefs = [
        { key: 'diamond', label: 'Diamond' },
        { key: 'gemstone', label: 'Gemstone' },
        { key: 'jewelry', label: 'Jewelry' },
        { key: 'labgrown_diamond', label: 'Labgrown Diamond' },
    ];

    const toggleProduct = (key) => {
        setIpProducts((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <label className="text-[12px] font-semibold text-slate-700">Create API Client</label>
                <input
                    type="checkbox"
                    checked={ipCreateApiClient}
                    onChange={(e) => setIpCreateApiClient(e.target.checked)}
                    disabled={disabled}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
            </div>

            <div>
                <label className={sideLabel}>Client ID</label>
                <input
                    className={sideInput}
                    value={ipClientCompanyId}
                    onChange={(e) => setIpClientCompanyId(e.target.value)}
                    onBlur={(e) => setIpClientCompanyId(e.target.value.trim())}
                    placeholder="e.g. 204542"
                    disabled={disabled}
                />
            </div>

            <div>
                <label className={sideLabel}>Vendor ID(s)</label>
                <input
                    className={sideInput}
                    value={ipVendorCompanyIds}
                    onChange={(e) => setIpVendorCompanyIds(e.target.value)}
                    onBlur={(e) => setIpVendorCompanyIds(e.target.value.trim())}
                    placeholder="e.g. 39416, 91268"
                    disabled={disabled}
                />
                <p className="mt-1 text-[10px] text-slate-400">Use comma-separated vendor company IDs for multi-vendor inventory.</p>
            </div>

            <div>
                <label className={sideLabel}>Product Permissions</label>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2">
                    {productDefs.map((product) => (
                        <label key={product.key} className="flex items-center gap-2 text-[12px] text-slate-700">
                            <input
                                type="checkbox"
                                checked={!!ipProducts[product.key]}
                                onChange={() => toggleProduct(product.key)}
                                disabled={disabled}
                                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            {product.label}
                        </label>
                    ))}
                </div>
            </div>
        </>
    );
}

export function ScriptForm({ mode, scriptValues, setScriptValues, disabled }) {
    const sheetFileInputRef = useRef(null);
    const nav_id = mode;
    const scriptKey = nav_id.replace('script-copy-search-menus', 'copyCustomSearchMenus')
        .replace('script-copy-white-label', 'copyOrgWhiteLabel')
        .replace('script-copy-customizations', 'copyOrgCustomizations')
        .replace('script-copy-company-customizations', 'copyCompanyCustomizations')
        .replace('script-test-features', 'testFeatureActivation')
        .replace('script-test-customizations', 'testCustomizations')
        .replace('script-import-search-menus-sheet', 'importCustomSearchMenusFromSheet');

    const cfg = SCRIPT_FIELDS[scriptKey];
    if (!cfg) return null;

    const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });

    return (
        <>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-[11px] text-amber-700 leading-relaxed">{cfg.description}</p>
            </div>
            <div className={cfg.fields.length === 2 ? 'flex flex-col gap-2' : 'space-y-2'}>
                {cfg.fields.map(f => (
                    <div key={f.key} className={cfg.fields.length === 2 ? 'flex-1 min-w-0' : ''}>
                        <label className={sideLabel}>{f.label}</label>
                        {scriptKey === 'importCustomSearchMenusFromSheet' && f.key === 'xlsxPath' ? (
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <input
                                        className={sideInput}
                                        value={scriptValues[f.key] || ''}
                                        onChange={e => setScriptValues((p) => ({ ...p, [f.key]: e.target.value, xlsxFileUpload: null }))}
                                        onBlur={e => setScriptValues((p) => ({ ...p, [f.key]: e.target.value.trim(), xlsxFileUpload: null }))}
                                        placeholder={f.placeholder}
                                        disabled={disabled}
                                    />
                                    <input
                                        ref={sheetFileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                const dataUrl = await readFileAsBase64(file);
                                                const base64 = dataUrl.split(',')[1] || '';
                                                setScriptValues((p) => ({
                                                    ...p,
                                                    xlsxPath: file.name,
                                                    xlsxFileUpload: {
                                                        filename: file.name,
                                                        contentBase64: base64,
                                                    },
                                                }));
                                            } catch (error) {
                                                console.error(error);
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="h-8 px-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                                        disabled={disabled}
                                        onClick={() => sheetFileInputRef.current?.click()}
                                    >
                                        Browse
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">Tip: You can paste a path or pick the file directly.</p>
                            </div>
                        ) : (
                            <input
                                className={sideInput}
                                value={scriptValues[f.key] || ''}
                                onChange={e => setScriptValues(p => ({ ...p, [f.key]: e.target.value }))}
                                onBlur={e => setScriptValues(p => ({ ...p, [f.key]: e.target.value.trim() }))}
                                placeholder={f.placeholder}
                                disabled={disabled}
                            />
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
