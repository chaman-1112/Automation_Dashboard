import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Building2 } from 'lucide-react';

import { SCRIPT_FIELDS } from './components/ScriptRunnerForm.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import MainContent from './components/MainContent.jsx';
import { OrgForm, CompanyForm, UserForm, InventoryPermissionForm, ScriptForm } from './components/SidebarForms.jsx';
import { NAV_ITEMS, STEP_DEFS } from './constants.js';

function App() {
    const [mode, setMode] = useState('org');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [orgs, setOrgs] = useState([]);
    const [dbStatus, setDbStatus] = useState('checking');
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const abortRef = useRef(null);

    const [companies, setCompanies] = useState([]);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [orgDetails, setOrgDetails] = useState(null);
    const [companyDetails, setCompanyDetails] = useState(null);

    const [newOrgName, setNewOrgName] = useState('');
    const [newDomainUrl, setNewDomainUrl] = useState('');
    const [newCompanyName, setNewCompanyName] = useState('');

    const [ccSourceOrg, setCcSourceOrg] = useState('');
    const [ccCompanies, setCcCompanies] = useState([]);
    const [ccSelectedCompany, setCcSelectedCompany] = useState('');
    const [ccDestOrg, setCcDestOrg] = useState('');
    const [ccNewName, setCcNewName] = useState('');

    const [cuBaseUrl, setCuBaseUrl] = useState('');
    const [cuEmail, setCuEmail] = useState('');
    const [cuPassword, setCuPassword] = useState('');
    const [cuCompanyId, setCuCompanyId] = useState('');
    const [cuName, setCuName] = useState('');
    const [cuCount, setCuCount] = useState(3);
    const [ipClientCompanyId, setIpClientCompanyId] = useState('');
    const [ipVendorCompanyIds, setIpVendorCompanyIds] = useState('');
    const [ipCreateApiClient, setIpCreateApiClient] = useState(true);
    const [ipProducts, setIpProducts] = useState({
        diamond: true,
        gemstone: true,
        jewelry: true,
        labgrown_diamond: true,
    });

    const [scriptValues, setScriptValues] = useState({});

    const [steps, setSteps] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [currentRunId, setCurrentRunId] = useState(null);
    const [lastRunParams, setLastRunParams] = useState(null);
    const stepsRef = useRef([]);
    const [runStartTime, setRunStartTime] = useState(null);
    const [currentUser, setCurrentUser] = useState({ name: 'Unknown', email: null });

    const [runHistory, setRunHistory] = useState(() => {
        try { const s = localStorage.getItem('vdb-run-history'); return s ? JSON.parse(s) : []; } catch { return []; }
    });
    const [activeHistoryId, setActiveHistoryId] = useState(null);
    const [toastMessage, setToastMessage] = useState('');

    const addToHistory = useCallback((run) => {
        setRunHistory(prev => {
            const updated = [run, ...prev.filter(r => r.id !== run.id)].slice(0, 50);
            try { localStorage.setItem('vdb-run-history', JSON.stringify(updated)); } catch {}
            return updated;
        });
    }, []);

    const updateHistoryRun = useCallback((runId, updates) => {
        setRunHistory(prev => {
            const updated = prev.map(r => r.id === runId ? { ...r, ...updates } : r);
            try { localStorage.setItem('vdb-run-history', JSON.stringify(updated)); } catch {}
            return updated;
        });
    }, []);

    useEffect(() => {
        if (!toastMessage) return;
        const timer = setTimeout(() => setToastMessage(''), 6000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    // ── Data fetching ──
    useEffect(() => { fetch('/api/health').then(r => r.json()).then(d => setDbStatus(d.status === 'ok' ? 'connected' : 'error')).catch(() => setDbStatus('error')); }, []);
    useEffect(() => { fetch('/api/data/orgs').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { if (Array.isArray(d)) setOrgs(d); }).catch(() => setOrgs([])); }, []);
    useEffect(() => {
        fetch('/api/whoami')
            .then(r => r.json())
            .then((d) => {
                const user = {
                    name: d?.name || 'Unknown',
                    email: d?.email || null,
                };
                setCurrentUser(user);
                localStorage.setItem('vdb-user', JSON.stringify(user));
            })
            .catch(() => {
                try {
                    const saved = JSON.parse(localStorage.getItem('vdb-user') || '{}');
                    if (saved?.name) setCurrentUser({ name: saved.name, email: saved.email || null });
                } catch {}
            });
    }, []);

    useEffect(() => {
        if (!selectedOrg) { setCompanies([]); setSelectedCompany(null); setOrgDetails(null); setCompanyDetails(null); return; }
        fetch(`/api/data/orgs/${selectedOrg}`).then(r => r.json()).then(d => { setOrgDetails(d); setNewOrgName(`Copy of ${d.name}`); setNewDomainUrl(`copy-${d.domain_url || 'org'}-${Date.now()}`); }).catch(console.error);
        fetch(`/api/data/companies?org_id=${selectedOrg}`).then(r => r.json()).then(setCompanies).catch(console.error);
        setSelectedCompany(null); setCompanyDetails(null);
    }, [selectedOrg]);

    useEffect(() => {
        if (!selectedCompany) { setCompanyDetails(null); setNewCompanyName(''); return; }
        fetch(`/api/data/companies/${selectedCompany}`).then(r => r.json()).then(d => { setCompanyDetails(d); setNewCompanyName(`Copy of ${d.name}`); }).catch(console.error);
    }, [selectedCompany]);

    useEffect(() => { if (!ccSourceOrg) { setCcCompanies([]); setCcSelectedCompany(''); return; } fetch(`/api/data/companies?org_id=${ccSourceOrg}`).then(r => r.json()).then(setCcCompanies).catch(console.error); setCcSelectedCompany(''); }, [ccSourceOrg]);
    useEffect(() => { if (!ccSelectedCompany) { setCcNewName(''); return; } const co = ccCompanies.find(c => String(c.id) === String(ccSelectedCompany)); if (co) setCcNewName(`Copy of ${co.name}`); }, [ccSelectedCompany, ccCompanies]);

    // ── SSE reader ──
    const readSSE = async (response, eventCollector = []) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        eventCollector.push(data);
                        if (typeof data?.message === 'string' && /\b(502|503|504)\b|bad gateway|service temporarily unavailable|gateway timeout/i.test(data.message)) {
                            setToastMessage('Please check your business demo and retry after some time.');
                        }
                        if (data.type === 'steps') {
                            const init = JSON.parse(data.message).map(s => ({ ...s, status: 'pending' }));
                            stepsRef.current = init;
                            setSteps(init);
                        } else if (data.type === 'step') {
                            const sd = JSON.parse(data.message);
                            setSteps(prev => {
                                const u = prev.map(s => s.id === sd.stepId ? { ...s, status: sd.status, error: sd.error, duration: sd.duration } : s);
                                stepsRef.current = u;
                                return u;
                            });
                        } else if (data.type === 'run-id') {
                            setCurrentRunId(data.message);
                        } else {
                            setLogs(prev => [...prev, data]);
                        }
                    } catch {}
                }
            }
        } catch (err) { if (err.name !== 'AbortError') throw err; }
    };

    // ── Get client-side step definitions for immediate display ──
    const getClientSteps = (modeId) => {
        if (modeId === 'org') return STEP_DEFS.org;
        if (modeId === 'company') return STEP_DEFS.company;
        if (modeId === 'user') return STEP_DEFS.user;
        if (modeId === 'inventory-permissions') return STEP_DEFS.inventoryPermissions;
        const nav = NAV_ITEMS.find(n => n.id === modeId);
        if (nav?.scriptKey && STEP_DEFS[nav.scriptKey]) return STEP_DEFS[nav.scriptKey];
        return null;
    };

    const initSteps = (modeId) => {
        const defs = getClientSteps(modeId);
        if (defs) {
            const init = defs.map(s => ({ ...s, status: 'pending' }));
            stepsRef.current = init;
            setSteps(init);
        }
    };

    const getUsername = () => {
        if (currentUser?.name) return currentUser.name;
        try {
            const saved = JSON.parse(localStorage.getItem('vdb-user') || '{}');
            return saved?.name || 'Unknown';
        } catch {
            return 'Unknown';
        }
    };

    const getUserEmail = () => {
        if (currentUser?.email) return currentUser.email;
        try {
            const saved = JSON.parse(localStorage.getItem('vdb-user') || '{}');
            return saved?.email || null;
        } catch {
            return null;
        }
    };

    const trimText = (value) => (typeof value === 'string' ? value.trim() : value);
    const serializeSteps = () => stepsRef.current.map((s) => ({
        id: s.id,
        label: s.label,
        status: s.status,
        error: s.error || null,
        duration: s.duration || null,
    }));
    const getResultMessage = (events) => {
        const success = [...events].reverse().find((e) => e.type === 'success');
        if (success?.message) return success.message;
        const error = [...events].reverse().find((e) => e.type === 'error');
        return error?.message || null;
    };

    // ── Handlers ──
    const handleStop = async () => {
        try {
            await fetch('/api/replicate/stop', { method: 'POST' });
            abortRef.current?.abort(); abortRef.current = null;
            setLogs(prev => [...prev, { type: 'error', message: 'Process stopped by user.', timestamp: new Date().toISOString() }]);
            setSteps(prev => {
                const u = prev.map(s => s.status === 'running' ? { ...s, status: 'failed', error: 'Process stopped by user' } : s);
                stepsRef.current = u;
                return u;
            });
            if (currentRunId) {
                updateHistoryRun(currentRunId, {
                    status: 'paused',
                    endedAt: new Date().toISOString(),
                    steps: serializeSteps(),
                    events: logs,
                });
            }
        } catch (err) { console.error(err); }
        finally { setIsRunning(false); setIsPaused(true); }
    };

    const handleCopyOrg = async (resumeFromStep = null) => {
        if (!selectedOrg || !newOrgName) return;
        const ctrl = new AbortController(); abortRef.current = ctrl;
        setIsRunning(true); setIsPaused(false); setRunStartTime(new Date());
        if (!resumeFromStep) {
            setLogs([{ type: 'progress', message: 'Starting org replication...', timestamp: new Date().toISOString() }]);
            initSteps('org');
        }
        const params = {
            sourceOrgId: selectedOrg,
            sourceCompanyId: selectedCompany || undefined,
            newOrgName: trimText(newOrgName),
            newDomainUrl: trimText(newDomainUrl),
            newCompanyName: companyDetails ? trimText(newCompanyName) : undefined,
        };
        setLastRunParams(params);
        const runId = currentRunId || `run-${Date.now()}`;
        setCurrentRunId(runId);
        addToHistory({
            id: runId,
            label: params.newOrgName || `Org ${selectedOrg}`,
            status: 'running',
            startedAt: new Date().toISOString(),
            mode: 'org',
            user: getUsername(),
            userEmail: getUserEmail(),
            request: {
                sourceOrgId: params.sourceOrgId,
                sourceCompanyId: params.sourceCompanyId,
                newOrgName: params.newOrgName,
                newDomainUrl: params.newDomainUrl,
                newCompanyName: params.newCompanyName,
                resumedFromStep: resumeFromStep || null,
            },
        });
        setActiveHistoryId(runId);
        const runEvents = [];
        try {
            const res = await fetch('/api/replicate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...params, ...(resumeFromStep ? { resumeFromStep, runId } : {}) }), signal: ctrl.signal });
            await readSSE(res, runEvents);
            const hasFailed = stepsRef.current.some(s => s.status === 'failed');
            updateHistoryRun(runId, {
                status: hasFailed ? 'failed' : 'completed',
                endedAt: new Date().toISOString(),
                steps: serializeSteps(),
                events: runEvents,
                resultMessage: getResultMessage(runEvents),
            });
            if (hasFailed) setIsPaused(true);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setLogs(prev => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]);
                updateHistoryRun(runId, { status: 'failed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: err.message });
                setIsPaused(true);
            }
        } finally { abortRef.current = null; setIsRunning(false); }
    };

    const handleCopyCompany = async () => {
        if (!ccDestOrg || !ccSelectedCompany || !ccNewName) return;
        const ctrl = new AbortController(); abortRef.current = ctrl;
        setIsRunning(true); setIsPaused(false); setRunStartTime(new Date());
        setLogs([{ type: 'progress', message: 'Starting company replication...', timestamp: new Date().toISOString() }]);
        initSteps('company');
        const params = {
            targetOrgId: trimText(ccDestOrg),
            sourceCompanyId: trimText(ccSelectedCompany),
            newCompanyName: trimText(ccNewName),
        };
        const runId = `run-${Date.now()}`;
        setCurrentRunId(runId);
        addToHistory({
            id: runId,
            label: params.newCompanyName,
            status: 'running',
            startedAt: new Date().toISOString(),
            mode: 'company',
            user: getUsername(),
            userEmail: getUserEmail(),
            request: params,
        });
        setActiveHistoryId(runId);
        const runEvents = [];
        try {
            const res = await fetch('/api/replicate/company', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params), signal: ctrl.signal });
            await readSSE(res, runEvents);
            const hasFailed = stepsRef.current.some(s => s.status === 'failed');
            updateHistoryRun(runId, { status: hasFailed ? 'failed' : 'completed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: getResultMessage(runEvents) });
        } catch (err) {
            if (err.name !== 'AbortError') { setLogs(prev => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]); updateHistoryRun(runId, { status: 'failed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: err.message }); }
        } finally { abortRef.current = null; setIsRunning(false); }
    };

    const handleCreateUser = async () => {
        if (!cuBaseUrl || !cuEmail || !cuPassword || !cuCompanyId || !cuName || !cuCount) return;
        const ctrl = new AbortController(); abortRef.current = ctrl;
        setIsRunning(true); setIsPaused(false); setRunStartTime(new Date());
        setLogs([{ type: 'progress', message: `Creating ${cuCount} user(s)...`, timestamp: new Date().toISOString() }]);
        initSteps('user');
        const params = {
            baseUrl: trimText(cuBaseUrl),
            email: trimText(cuEmail),
            password: trimText(cuPassword),
            companyId: trimText(cuCompanyId),
            name: trimText(cuName),
            numberOfUsers: Number(cuCount),
        };
        const runId = `run-${Date.now()}`;
        setCurrentRunId(runId);
        addToHistory({
            id: runId,
            label: `${params.numberOfUsers} Users`,
            status: 'running',
            startedAt: new Date().toISOString(),
            mode: 'user',
            user: getUsername(),
            userEmail: getUserEmail(),
            request: { ...params, password: '********' },
        });
        setActiveHistoryId(runId);
        const runEvents = [];
        try {
            const res = await fetch('/api/replicate/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params), signal: ctrl.signal });
            await readSSE(res, runEvents);
            const hasFailed = stepsRef.current.some(s => s.status === 'failed');
            updateHistoryRun(runId, { status: hasFailed ? 'failed' : 'completed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: getResultMessage(runEvents) });
        } catch (err) {
            if (err.name !== 'AbortError') { setLogs(prev => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]); updateHistoryRun(runId, { status: 'failed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: err.message }); }
        } finally { abortRef.current = null; setIsRunning(false); }
    };

    const handleInventoryPermissions = async () => {
        const selectedProducts = Object.entries(ipProducts)
            .filter(([, enabled]) => !!enabled)
            .map(([key]) => key);

        if (!ipClientCompanyId.trim() || !ipVendorCompanyIds.trim() || selectedProducts.length === 0) return;

        const vendorCompanyIds = ipVendorCompanyIds
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);

        const ctrl = new AbortController(); abortRef.current = ctrl;
        setIsRunning(true); setIsPaused(false); setRunStartTime(new Date());
        setLogs([{ type: 'progress', message: 'Starting inventory permission flow...', timestamp: new Date().toISOString() }]);
        initSteps('inventory-permissions');

        const params = {
            clientCompanyId: trimText(ipClientCompanyId),
            vendorCompanyIds,
            createApiClient: !!ipCreateApiClient,
            products: selectedProducts,
        };

        const runId = `run-${Date.now()}`;
        setCurrentRunId(runId);
        addToHistory({
            id: runId,
            label: `Inventory Permissions (${params.clientCompanyId})`,
            status: 'running',
            startedAt: new Date().toISOString(),
            mode: 'inventory-permissions',
            user: getUsername(),
            userEmail: getUserEmail(),
            request: params,
        });
        setActiveHistoryId(runId);

        const runEvents = [];
        try {
            const res = await fetch('/api/replicate/inventory-permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
                signal: ctrl.signal,
            });
            await readSSE(res, runEvents);
            const hasFailed = stepsRef.current.some(s => s.status === 'failed');
            updateHistoryRun(runId, { status: hasFailed ? 'failed' : 'completed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: getResultMessage(runEvents) });
        } catch (err) {
            if (err.name !== 'AbortError') { setLogs(prev => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]); updateHistoryRun(runId, { status: 'failed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: err.message }); }
        } finally { abortRef.current = null; setIsRunning(false); }
    };

    const handleRunScript = async () => {
        const navItem = NAV_ITEMS.find(n => n.id === mode);
        if (!navItem?.scriptKey) return;
        const config = SCRIPT_FIELDS[navItem.scriptKey];
        if (!config) return;
        const hasUploadedSheet = navItem.scriptKey === 'importCustomSearchMenusFromSheet'
            && !!scriptValues?.xlsxFileUpload?.contentBase64;
        if (!config.fields.every((f) => {
            if (f.required === false) return true;
            if (navItem.scriptKey === 'importCustomSearchMenusFromSheet' && f.key === 'xlsxPath' && hasUploadedSheet) return true;
            return (scriptValues[f.key] || '').trim();
        })) return;
        const args = config.fields
            .map((f) => {
                if (navItem.scriptKey === 'importCustomSearchMenusFromSheet' && f.key === 'xlsxPath' && hasUploadedSheet) {
                    return '__UPLOADED_FILE__';
                }
                return (scriptValues[f.key] || '').trim();
            })
            .filter((value, idx) => {
                const field = config.fields[idx];
                if (field.required === false) return !!value;
                return true;
            });
        const ctrl = new AbortController(); abortRef.current = ctrl;
        setIsRunning(true); setIsPaused(false); setRunStartTime(new Date());
        setLogs([{ type: 'progress', message: `Running script: ${navItem.scriptKey}...`, timestamp: new Date().toISOString() }]);
        initSteps(mode);
        const runId = `run-${Date.now()}`;
        setCurrentRunId(runId);
        addToHistory({
            id: runId,
            label: config.title || navItem.scriptKey,
            status: 'running',
            startedAt: new Date().toISOString(),
            mode: 'script',
            user: getUsername(),
            userEmail: getUserEmail(),
            request: {
                script: navItem.scriptKey,
                args: args.map((a) => (a === '__UPLOADED_FILE__' ? '[uploaded-xlsx]' : a)),
            },
        });
        setActiveHistoryId(runId);
        const runEvents = [];
        try {
            const res = await fetch('/api/replicate/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    script: navItem.scriptKey,
                    args,
                    fileUpload: hasUploadedSheet ? scriptValues.xlsxFileUpload : null,
                }),
                signal: ctrl.signal,
            });
            await readSSE(res, runEvents);
            const hasFailed = stepsRef.current.some(s => s.status === 'failed');
            updateHistoryRun(runId, { status: hasFailed ? 'failed' : 'completed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: getResultMessage(runEvents) });
        } catch (err) {
            if (err.name !== 'AbortError') { setLogs(prev => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]); updateHistoryRun(runId, { status: 'failed', endedAt: new Date().toISOString(), steps: serializeSteps(), events: runEvents, resultMessage: err.message }); }
        } finally { abortRef.current = null; setIsRunning(false); }
    };

    const handleStart = () => {
        switch (mode) {
            case 'org': handleCopyOrg(); break;
            case 'company': handleCopyCompany(); break;
            case 'user': handleCreateUser(); break;
            case 'inventory-permissions': handleInventoryPermissions(); break;
            default: handleRunScript(); break;
        }
    };

    const handleResume = (stepId) => { if (lastRunParams) handleCopyOrg(stepId); };
    const handleRetry = (stepId) => {
        if (!lastRunParams) return;
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, status: 'pending', error: null } : s));
        handleCopyOrg(stepId);
    };
    const handleSkip = (stepId) => {
        setSteps(prev => {
            const u = prev.map(s => s.id === stepId ? { ...s, status: 'skipped', error: null } : s);
            const idx = u.findIndex(s => s.id === stepId);
            if (idx < u.length - 1 && u[idx + 1].status === 'pending') handleCopyOrg(u[idx + 1].id);
            return u;
        });
    };

    const switchMode = (nextMode) => {
        if (isRunning) return;
        setMode(nextMode); setLogs([]); setSteps([]); setIsPaused(false); setScriptValues({});
    };

    const handleDeleteRun = (runId) => {
        setRunHistory(prev => { const u = prev.filter(r => r.id !== runId); try { localStorage.setItem('vdb-run-history', JSON.stringify(u)); } catch {} return u; });
        if (activeHistoryId === runId) setActiveHistoryId(null);
    };

    // ── Derived state ──
    const activeNavItem = NAV_ITEMS.find(n => n.id === mode);
    const ActiveIcon = activeNavItem?.icon || Building2;
    const allowStepControls = mode === 'org';
    const allowStopExecution = mode === 'org';
    const hasFailedStep = steps.some(s => s.status === 'failed');
    const allStepsComplete = steps.length > 0 && steps.every(s => s.status === 'completed' || s.status === 'skipped');
    const latestLog = logs.length ? logs[logs.length - 1] : null;
    const overallStatus = isRunning ? 'running' : hasFailedStep ? 'failed' : allStepsComplete ? 'completed' : latestLog?.type === 'error' ? 'failed' : latestLog?.type === 'success' ? 'completed' : 'idle';

    const canStart = (() => {
        if (isRunning) return false;
        switch (mode) {
            case 'org': return !!selectedOrg && !!newOrgName.trim();
            case 'company': return !!ccDestOrg && !!ccSelectedCompany && !!ccNewName.trim();
            case 'user': return !!(cuBaseUrl.trim() && cuEmail.trim() && cuPassword.trim() && cuCompanyId.trim() && cuName.trim() && Number(cuCount) > 0);
            case 'inventory-permissions': {
                const vendorIds = ipVendorCompanyIds.split(',').map(v => v.trim()).filter(Boolean);
                const hasProduct = Object.values(ipProducts).some(Boolean);
                return !!ipClientCompanyId.trim() && vendorIds.length > 0 && hasProduct;
            }
            default: {
                const nav = NAV_ITEMS.find(n => n.id === mode);
                if (!nav?.scriptKey) return false;
                const cfg = SCRIPT_FIELDS[nav.scriptKey];
                if (!cfg) return false;
                const hasUploadedSheet = nav.scriptKey === 'importCustomSearchMenusFromSheet'
                    && !!scriptValues?.xlsxFileUpload?.contentBase64;
                return cfg.fields.every((f) => {
                    if (f.required === false) return true;
                    if (nav.scriptKey === 'importCustomSearchMenusFromSheet' && f.key === 'xlsxPath' && hasUploadedSheet) return true;
                    return (scriptValues[f.key] || '').trim();
                });
            }
        }
    })();

    // ── Render form for current mode ──
    const renderForm = () => {
        const disabled = isRunning;
        switch (mode) {
            case 'org':
                return <OrgForm orgs={orgs} companies={companies} selectedOrg={selectedOrg} setSelectedOrg={setSelectedOrg} selectedCompany={selectedCompany} setSelectedCompany={setSelectedCompany} orgDetails={orgDetails} companyDetails={companyDetails} newOrgName={newOrgName} setNewOrgName={setNewOrgName} newDomainUrl={newDomainUrl} setNewDomainUrl={setNewDomainUrl} newCompanyName={newCompanyName} setNewCompanyName={setNewCompanyName} disabled={disabled} />;
            case 'company':
                return <CompanyForm orgs={orgs} ccSourceOrg={ccSourceOrg} setCcSourceOrg={setCcSourceOrg} ccCompanies={ccCompanies} ccSelectedCompany={ccSelectedCompany} setCcSelectedCompany={setCcSelectedCompany} ccDestOrg={ccDestOrg} setCcDestOrg={setCcDestOrg} ccNewName={ccNewName} setCcNewName={setCcNewName} disabled={disabled} />;
            case 'user':
                return <UserForm cuBaseUrl={cuBaseUrl} setCuBaseUrl={setCuBaseUrl} cuEmail={cuEmail} setCuEmail={setCuEmail} cuPassword={cuPassword} setCuPassword={setCuPassword} cuCompanyId={cuCompanyId} setCuCompanyId={setCuCompanyId} cuName={cuName} setCuName={setCuName} cuCount={cuCount} setCuCount={setCuCount} disabled={disabled} />;
            case 'inventory-permissions':
                return (
                    <InventoryPermissionForm
                        ipClientCompanyId={ipClientCompanyId}
                        setIpClientCompanyId={setIpClientCompanyId}
                        ipVendorCompanyIds={ipVendorCompanyIds}
                        setIpVendorCompanyIds={setIpVendorCompanyIds}
                        ipCreateApiClient={ipCreateApiClient}
                        setIpCreateApiClient={setIpCreateApiClient}
                        ipProducts={ipProducts}
                        setIpProducts={setIpProducts}
                        disabled={disabled}
                    />
                );
            default:
                return <ScriptForm mode={mode} scriptValues={scriptValues} setScriptValues={setScriptValues} disabled={disabled} />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} items={NAV_ITEMS} activeId={mode} onSelect={switchMode} disabled={isRunning} />

            <div className="flex h-screen">
                <LeftPanel
                    activeNavItem={activeNavItem} ActiveIcon={ActiveIcon} mode={mode}
                    isRunning={isRunning} canStart={canStart} dbStatus={dbStatus}
                    canStopExecution={allowStopExecution}
                    historyOpen={historyOpen} setHistoryOpen={setHistoryOpen}
                    onOpenSidebar={() => setSidebarOpen(true)} onStart={handleStart} onStop={handleStop}
                    runHistory={runHistory} activeHistoryId={activeHistoryId}
                    onSelectRun={setActiveHistoryId} onDeleteRun={handleDeleteRun}
                >
                    {renderForm()}
                </LeftPanel>

                <MainContent
                    activeNavItem={activeNavItem} ActiveIcon={ActiveIcon}
                    isRunning={isRunning} dbStatus={dbStatus}
                    steps={steps} logs={logs} overallStatus={overallStatus}
                    runStartTime={runStartTime} selectedOrg={selectedOrg}
                    onResume={allowStepControls ? handleResume : undefined}
                    onRetry={allowStepControls ? handleRetry : undefined}
                    onSkip={allowStepControls ? handleSkip : undefined}
                    onOpenSidebar={() => setSidebarOpen(true)}
                />
            </div>
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-lg">
                    {toastMessage}
                </div>
            )}
        </div>
    );
}

export default App;
