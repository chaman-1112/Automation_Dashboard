import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Building, Building2, Database, Square, UserPlus, FileCode, Copy, Palette, Zap, FlaskConical } from 'lucide-react';

import OrgSelector from './components/OrgSelector.jsx';
import CompanySelector from './components/CompanySelector.jsx';
import ReplicationForm from './components/ReplicationForm.jsx';
import CopyCompanyForm from './components/CopyCompanyForm.jsx';
import CreateUserForm from './components/CreateUserForm.jsx';
import ScriptRunnerForm, { SCRIPT_FIELDS } from './components/ScriptRunnerForm.jsx';
import StatusLog from './components/StatusLog.jsx';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/Card.jsx';
import { Badge } from './components/ui/Badge.jsx';
import { Button } from './components/ui/Button.jsx';
import { Dropdown } from './components/ui/Dropdown.jsx';

const plans = { 0: 'Starter', 1: 'Professional', 2: 'Enterprise', 3: 'Advanced' };

const fadeIn = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

const NAV_ITEMS = [
    {
        id: 'org',
        label: 'Copy Organization',
        icon: Building2,
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
    },
    {
        id: 'company',
        label: 'Copy Company',
        icon: Building,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
    },
    {
        id: 'user',
        label: 'Create Users',
        icon: UserPlus,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
    },
    {
        id: 'script-copy-search-menus',
        label: 'Script: Copy Custom Search Menus',
        icon: Copy,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        scriptKey: 'copyCustomSearchMenus',
    },
    {
        id: 'script-copy-white-label',
        label: 'Script: Copy White Label',
        icon: Palette,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        scriptKey: 'copyOrgWhiteLabel',
    },
    {
        id: 'script-copy-customizations',
        label: 'Script: Copy Org Customizations(Global, Custom Texts, JsonNavMenu)',
        icon: FileCode,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        scriptKey: 'copyOrgCustomizations',
    },
    {
        id: 'script-copy-company-customizations',
        label: 'Script: Copy Company Customizations(Global, Custom Texts, JsonNavMenu)',
        icon: FileCode,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        scriptKey: 'copyCompanyCustomizations',
    },
    {
        id: 'script-test-features',
        label: 'Script: Feature Switches Copy(Company)',
        icon: Zap,
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        scriptKey: 'testFeatureActivation',
    },
    {
        id: 'script-test-customizations',
        label: 'Script: Customizations Spec(PDP, SearchResult, SearchForm)',
        icon: FlaskConical,
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
        scriptKey: 'testCustomizations',
    },
    {
        id: 'script-import-search-menus-sheet',
        label: 'Script: Import Custom Search Menus (Sheet)',
        icon: FileCode,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        scriptKey: 'importCustomSearchMenusFromSheet',
    },
];

function App() {
    const [mode, setMode] = useState('org');
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

    const [copyCompanyDetails, setCopyCompanyDetails] = useState({
        orgDetails: null,
        companyDetails: null,
        destOrgDetails: null,
    });

    const latestLog = logs.length ? logs[logs.length - 1] : null;
    const successCount = logs.filter((log) => log.type === 'success').length;
    const errorCount = logs.filter((log) => log.type === 'error').length;

    const inferProgress = () => {
        for (let i = logs.length - 1; i >= 0; i -= 1) {
            const msg = logs[i]?.message || '';
            const percentMatch = msg.match(/\b(\d{1,3})%\b/);
            if (percentMatch) {
                return Math.max(0, Math.min(100, Number(percentMatch[1])));
            }
            const fractionMatch = msg.match(/\b(\d+)\s*\/\s*(\d+)\b/);
            if (fractionMatch) {
                const current = Number(fractionMatch[1]);
                const total = Number(fractionMatch[2]);
                if (total > 0) return Math.round((current / total) * 100);
            }
        }

        if (isRunning) return logs.length > 0 ? 45 : 10;
        if (latestLog?.type === 'success' || latestLog?.type === 'error') return 100;
        return 0;
    };

    const progressPercent = inferProgress();
    const statusLabel = isRunning ? 'In Progress' : latestLog?.type === 'error' ? 'Failed' : latestLog?.type === 'success' ? 'Completed' : 'Waiting';

    useEffect(() => {
        fetch('/api/health')
            .then((r) => r.json())
            .then((d) => setDbStatus(d.status === 'ok' ? 'connected' : 'error'))
            .catch(() => setDbStatus('error'));
    }, []);

    useEffect(() => {
        fetch('/api/data/orgs')
            .then((r) => {
                if (!r.ok) throw new Error(`Server returned ${r.status}`);
                return r.json();
            })
            .then((data) => {
                if (Array.isArray(data)) setOrgs(data);
                else console.error('Unexpected orgs response:', data);
            })
            .catch((err) => {
                console.error('Failed to load organizations:', err.message);
                setOrgs([]);
            });
    }, []);

    useEffect(() => {
        if (!selectedOrg) {
            setCompanies([]);
            setSelectedCompany(null);
            setOrgDetails(null);
            setCompanyDetails(null);
            return;
        }
        fetch(`/api/data/orgs/${selectedOrg}`).then((r) => r.json()).then(setOrgDetails).catch(console.error);
        fetch(`/api/data/companies?org_id=${selectedOrg}`).then((r) => r.json()).then(setCompanies).catch(console.error);
        setSelectedCompany(null);
        setCompanyDetails(null);
    }, [selectedOrg]);

    useEffect(() => {
        if (!selectedCompany) {
            setCompanyDetails(null);
            return;
        }
        fetch(`/api/data/companies/${selectedCompany}`).then((r) => r.json()).then(setCompanyDetails).catch(console.error);
    }, [selectedCompany]);

    const readSSE = async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Keep the last incomplete line in the buffer
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            setLogs((prev) => [...prev, data]);
                        } catch (err) {
                            console.error('Failed to parse SSE data:', line, err);
                        }
                    }
                }
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('SSE Read Error:', err);
                throw err;
            }
        }
    };

    const handleStop = async () => {
        try {
            await fetch('/api/replicate/stop', { method: 'POST' });
            abortRef.current?.abort();
            abortRef.current = null;
            setLogs((prev) => [...prev, { type: 'error', message: 'Process stopped by user.', timestamp: new Date().toISOString() }]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopyOrg = async (overrides) => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setIsRunning(true);
        setLogs([{ type: 'progress', message: 'Starting org replication...', timestamp: new Date().toISOString() }]);
        try {
            const res = await fetch('/api/replicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceOrgId: selectedOrg, sourceCompanyId: selectedCompany, ...overrides }),
                signal: ctrl.signal,
            });
            await readSSE(res);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setLogs((prev) => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]);
            }
        } finally {
            abortRef.current = null;
            setIsRunning(false);
        }
    };

    const handleCopyCompany = async ({ targetOrgId, sourceCompanyId, newCompanyName }) => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setIsRunning(true);
        setLogs([{ type: 'progress', message: 'Starting company replication...', timestamp: new Date().toISOString() }]);
        try {
            const res = await fetch('/api/replicate/company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetOrgId, sourceCompanyId, newCompanyName }),
                signal: ctrl.signal,
            });
            await readSSE(res);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setLogs((prev) => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]);
            }
        } finally {
            abortRef.current = null;
            setIsRunning(false);
        }
    };

    const handleCreateUser = async (config) => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setIsRunning(true);
        setLogs([{ type: 'progress', message: `Creating ${config.numberOfUsers} user(s)...`, timestamp: new Date().toISOString() }]);
        try {
            const res = await fetch('/api/replicate/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
                signal: ctrl.signal,
            });
            await readSSE(res);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setLogs((prev) => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]);
            }
        } finally {
            abortRef.current = null;
            setIsRunning(false);
        }
    };

    const handleRunScript = async ({ script, args }) => {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        setIsRunning(true);
        setLogs([{ type: 'progress', message: `Running script: ${script}...`, timestamp: new Date().toISOString() }]);
        try {
            const res = await fetch('/api/replicate/run-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script, args }),
                signal: ctrl.signal,
            });
            await readSSE(res);
        } catch (err) {
            if (err.name !== 'AbortError') {
                setLogs((prev) => [...prev, { type: 'error', message: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }]);
            }
        } finally {
            abortRef.current = null;
            setIsRunning(false);
        }
    };

    const switchMode = (nextMode) => {
        if (isRunning) return;
        setMode(nextMode);
        setLogs([]);
    };

    const renderContent = () => {
        switch (mode) {
            case 'org':
                return (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <Card>
                            <CardHeader className="border-b bg-linear-to-r from-violet-50 to-purple-50">
                                <CardTitle className="text-violet-900">Source Selection</CardTitle>
                                <CardDescription className="text-violet-700">Choose organization and optional company</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <OrgSelector orgs={orgs} selectedOrg={selectedOrg} onSelect={setSelectedOrg} />
                                <AnimatePresence>
                                    {selectedOrg && (
                                        <motion.div {...fadeIn}>
                                            <CompanySelector companies={companies} selectedCompany={selectedCompany} onSelect={setSelectedCompany} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="border-b bg-linear-to-r from-blue-50 to-cyan-50">
                                <CardTitle className="text-blue-900">Configure Replication</CardTitle>
                                <CardDescription className="text-blue-700">Set target values and launch process</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5">
                                <ReplicationForm
                                    orgDetails={orgDetails}
                                    companyDetails={companyDetails}
                                    isReplicating={isRunning}
                                    onReplicate={handleCopyOrg}
                                    plans={plans}
                                />
                            </CardContent>
                        </Card>
                    </div>
                );

            case 'company':
                return (
                    <Card className="w-full ml-0">
                        <CardHeader className="border-b bg-linear-to-r from-blue-50 to-indigo-50">
                            <CardTitle className="text-blue-900">Copy Company</CardTitle>
                            <CardDescription className="text-blue-700">Select source company and destination organization</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <CopyCompanyForm
                                orgs={orgs}
                                isReplicating={isRunning}
                                onCopyCompany={handleCopyCompany}
                                onDetailsChange={setCopyCompanyDetails}
                            />
                        </CardContent>
                    </Card>
                );

            case 'user':
                return (
                    <Card className="w-full ml-0">
                        <CardHeader className="border-b bg-linear-to-r from-emerald-50 to-teal-50">
                            <CardTitle className="text-emerald-900">Create Users</CardTitle>
                            <CardDescription className="text-emerald-700">Launch Playwright automation to generate test users</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <CreateUserForm isRunning={isRunning} onSubmit={handleCreateUser} />
                        </CardContent>
                    </Card>
                );

            default: {
                const navItem = NAV_ITEMS.find(n => n.id === mode);
                if (navItem?.scriptKey) {
                    const scriptConfig = SCRIPT_FIELDS[navItem.scriptKey];
                    return (
                        <Card className="w-full ml-0">
                            <CardHeader className="border-b bg-linear-to-r from-amber-50 to-orange-50">
                                <CardTitle className="text-amber-900">{scriptConfig?.title || navItem.label}</CardTitle>
                                <CardDescription className="text-amber-700">Run standalone script via the server</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-5">
                                <ScriptRunnerForm
                                    key={navItem.scriptKey}
                                    scriptKey={navItem.scriptKey}
                                    isRunning={isRunning}
                                    onSubmit={handleRunScript}
                                />
                            </CardContent>
                        </Card>
                    );
                }
                return null;
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-[1400px] px-6 py-6">

                {/* Header */}
                <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-xl shadow-md border border-blue-700 p-6 mb-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-6">
                        {/* Title */}
                        <div>
                            <h1 className="text-2xl font-semibold text-white mb-1">
                                VDB Automation Dashboard
                            </h1>
                            <p className="text-sm text-blue-100">Automation control center for VDB operations</p>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant={dbStatus === 'connected' ? 'success' : dbStatus === 'error' ? 'destructive' : 'warning'}
                                className="px-2.5 py-1"
                            >
                                <Database className="size-3.5 mr-1.5" />
                                {dbStatus === 'connected' ? 'Online' : dbStatus === 'error' ? 'Offline' : 'Checking'}
                            </Badge>
                            <Badge variant={isRunning ? 'warning' : 'secondary'} className="px-2.5 py-1">
                                <Activity className="size-3.5 mr-1.5" />
                                {isRunning ? 'Running' : 'Idle'}
                            </Badge>
                            <Badge variant="info" className="px-2.5 py-1">
                                {orgs.length} Organizations
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-end">
                        {/* Navigation Dropdown */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white block">
                                Select Workflow
                            </label>
                            <Dropdown
                                value={mode}
                                onChange={switchMode}
                                options={NAV_ITEMS}
                                disabled={isRunning}
                                className="max-w-md"
                            />
                        </div>

                        {/* Execution Progress Panel */}
                        <div className="rounded-lg border border-blue-300/40 bg-white/10 px-4 py-3 backdrop-blur-sm">
                            <div className="flex items-center justify-between text-xs text-blue-100 mb-2">
                                <span className="font-semibold tracking-wide uppercase">Execution Progress</span>
                                <span>{progressPercent}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-blue-900/40 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${
                                        statusLabel === 'Failed' ? 'bg-red-400' : statusLabel === 'Completed' ? 'bg-emerald-400' : 'bg-cyan-300'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-blue-100">
                                <span>Status: {statusLabel}</span>
                                <span className="text-right">Logs: {logs.length}</span>
                                <span>Success: {successCount}</span>
                                <span className="text-right">Errors: {errorCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-5">
                    <AnimatePresence mode="wait">
                        <motion.div key={mode} {...fadeIn}>
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>

                    {/* Logs */}
                    <AnimatePresence>
                        {logs.length > 0 && (
                            <motion.div {...fadeIn}>
                                <StatusLog logs={logs} />
                                {isRunning && (
                                    <Button variant="destructive" size="lg" className="w-full mt-4" onClick={handleStop}>
                                        <Square className="size-4" />
                                        Stop Execution
                                    </Button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default App;
