import { Router } from 'express';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PLAYWRIGHT_ROOT = resolve(__dirname, '../../..');
const TMP_DIR = resolve(__dirname, '../../../tmp');

const router = Router();

let activeProcess = null;
const activeRuns = new Map(); // runId → { dataFile, failedStep, ... }

function stripAnsi(str) { return str.replace(/\x1b\[[0-9;]*m/g, ''); }

function runNodeScript(scriptPath, args, sendEvent) {
    return new Promise((resolveP, rejectP) => {
        sendEvent('progress', `Running ${scriptPath} ${args.join(' ')}...`);
        const child = spawn('node', [scriptPath, ...args], { cwd: PLAYWRIGHT_ROOT, env: process.env, shell: false });
        activeProcess = child;
        child.stdout.on('data', d => { for (const l of d.toString().split('\n').filter(Boolean)) sendEvent('log', stripAnsi(l.trim())); });
        child.stderr.on('data', d => { for (const l of d.toString().split('\n').filter(Boolean)) sendEvent('log', stripAnsi(l.trim())); });
        child.on('close', c => { activeProcess = null; resolveP(c); });
        child.on('error', e => { activeProcess = null; rejectP(e); });
    });
}

function runSpec(specFile, dataFile, sendEvent, extraEnv = {}) {
    return new Promise((resolveP, rejectP) => {
        sendEvent('progress', `Running ${specFile}...`);
        const runEnv = { ...process.env, ...extraEnv };
        if (dataFile) runEnv.REPLICATION_DATA_FILE = dataFile;
        const pw = spawn('npx', ['playwright', 'test', '--reporter=list', '--retries=0', specFile], {
            cwd: PLAYWRIGHT_ROOT, env: runEnv, shell: true,
        });
        activeProcess = pw;
        pw.stdout.on('data', d => { for (const l of d.toString().split('\n').filter(Boolean)) sendEvent('log', l.trim()); });
        pw.stderr.on('data', d => { for (const l of d.toString().split('\n').filter(Boolean)) sendEvent('log', l.trim()); });
        pw.on('close', c => { activeProcess = null; resolveP(c); });
        pw.on('error', e => { activeProcess = null; rejectP(e); });
    });
}

function sendStepEvent(sendEvent, stepId, status, extra = {}) {
    sendEvent('step', JSON.stringify({ stepId, status, ...extra }));
}

function killActiveProcess(reason = 'Process stopped') {
    if (!activeProcess) return null;
    const proc = activeProcess;
    const pid = proc.pid;
    try {
        if (process.platform === 'win32') spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { shell: true });
        else proc.kill('SIGTERM');
    } catch {}
    activeProcess = null;
    return { pid, reason };
}

function attachDisconnectCleanup(req, res, sendEvent) {
    let finished = false;
    const originalEnd = res.end.bind(res);

    res.end = (...args) => {
        finished = true;
        return originalEnd(...args);
    };

    const onDisconnect = () => {
        if (finished) return;
        const killed = killActiveProcess('Client disconnected');
        if (killed) {
            try { sendEvent('error', `Client disconnected. Stopped process ${killed.pid}.`); } catch {}
        }
    };

    req.on('close', onDisconnect);
    res.on('close', onDisconnect);
}

async function fetchReplicationData(sourceOrgId, sourceCompanyId, sendEvent) {
    sendEvent('progress', 'Fetching organization data...');
    const { rows: orgRows } = await pool.query(`SELECT * FROM organizations WHERE id = $1`, [sourceOrgId]);
    if (orgRows.length === 0) throw new Error(`Organization #${sourceOrgId} not found`);

    sendEvent('progress', 'Fetching organization settings...');
    const { rows: orgSettings } = await pool.query(
        `SELECT f.id AS feature_id, f.name AS feature_name, f.description AS feature_description, s.access
         FROM settings s JOIN features f ON f.id = s.feature_id
         WHERE s.settable_type = 'Organization' AND s.settable_id = $1 AND s.active = true ORDER BY f.id`, [sourceOrgId]
    );
    sendEvent('progress', `Found ${orgSettings.length} active org settings`);

    sendEvent('progress', 'Fetching customizations...');
    const { rows: customizations } = await pool.query(
        `SELECT id, type, product_type, content, resource_type, resource_id, s3_url, updated_at
         FROM customizations WHERE resource_id = $1 ORDER BY type, product_type`, [sourceOrgId]
    );
    for (const c of customizations) sendEvent('log', `[DB] Found: ${c.type} | product_type=${c.product_type} | id=${c.id}`);
    sendEvent('progress', `Found ${customizations.length} customization rows`);

    sendEvent('progress', 'Fetching global...');
    const { rows: globals } = await pool.query(`SELECT * FROM custom_texts WHERE type = 'Global' AND resource_type = 'Organization' AND resource_id = $1`, [sourceOrgId]);
    sendEvent('log', globals.length > 0 ? `[DB] Found global (id=${globals[0].id})` : '[DB] No global found');

    sendEvent('progress', 'Fetching custom texts...');
    const { rows: customTexts } = await pool.query(`SELECT * FROM custom_texts WHERE resource_id = $1 AND resource_type = 'Organization' AND language_id IS NOT NULL ORDER BY language_id`, [sourceOrgId]);
    for (const ct of customTexts) sendEvent('log', `[DB] Found custom_text: language_id=${ct.language_id} | id=${ct.id}`);
    sendEvent('progress', `Found ${customTexts.length} custom text(s)`);

    sendEvent('progress', 'Fetching JSON navigation menu...');
    const { rows: jsonNavMenuRows } = await pool.query(`SELECT * FROM custom_texts WHERE type = 'JsonNavigationMenu' AND resource_type = 'Organization' AND resource_id = $1 LIMIT 1`, [sourceOrgId]);
    const jsonNavMenu = jsonNavMenuRows[0] || null;
    sendEvent('log', jsonNavMenu ? `[DB] Found JsonNavigationMenu (id=${jsonNavMenu.id})` : '[DB] No JsonNavigationMenu found');

    let company = null, activeFeatures = [];
    if (sourceCompanyId) {
        sendEvent('progress', 'Fetching company data...');
        const { rows: companyRows } = await pool.query(`SELECT * FROM companies WHERE id = $1`, [sourceCompanyId]);
        company = companyRows[0] || null;
        if (company) {
            sendEvent('progress', 'Fetching feature switches...');
            const { rows: featureRows } = await pool.query(
                `SELECT f.id AS feature_id, f.description AS feature_description, s.access
                 FROM settings s JOIN features f ON f.id = s.feature_id
                 WHERE s.settable_type = 'Company' AND s.settable_id = $1 AND s.active = true ORDER BY f.id`, [sourceCompanyId]
            );
            activeFeatures = featureRows;
            sendEvent('progress', `Found ${activeFeatures.length} feature switches`);
        }
    }

    let locations = [];
    if (sourceCompanyId) {
        sendEvent('progress', 'Fetching company locations...');
        const { rows: locationRows } = await pool.query(`SELECT * FROM locations WHERE vendor_id = $1 ORDER BY id`, [sourceCompanyId]);
        locations = locationRows;
        sendEvent('progress', `Found ${locations.length} location(s)`);
    }

    sendEvent('progress', 'Checking custom search menus...');
    const { rows: smRows } = await pool.query(`SELECT COUNT(*) as count FROM custom_search_menus WHERE organization_id = $1`, [sourceOrgId]);
    const searchMenuCount = parseInt(smRows[0].count);
    sendEvent('progress', `Found ${searchMenuCount} custom search menu(s)`);

    sendEvent('progress', 'Checking white label configurations...');
    const { rows: wlRows } = await pool.query(`SELECT COUNT(*) as count FROM theme_white_labelings WHERE resource_type = 'Organization' AND resource_id = $1`, [sourceOrgId]);
    const whiteLabelCount = parseInt(wlRows[0].count);
    sendEvent('progress', `Found ${whiteLabelCount} white label configuration(s)`);

    let authToken = null;
    try {
        const { rows: authRows } = await pool.query(`SELECT auth_token FROM admin_users WHERE email = $1 LIMIT 1`, [process.env.STAGE_SUPERADMIN_EMAIL]);
        if (authRows.length > 0) authToken = authRows[0].auth_token;
    } catch (err) { sendEvent('log', `[DB] Could not fetch auth_token: ${err.message}`); }

    return { org: orgRows[0], orgSettings, customizations, globals, customTexts, jsonNavMenu, company, activeFeatures, locations, authToken, searchMenuCount, whiteLabelCount };
}

// ═══════════════════════════════════════════════════════════════
//  STOP
// ═══════════════════════════════════════════════════════════════

router.post('/stop', (req, res) => {
    if (!activeProcess) return res.json({ status: 'no_process' });
    try {
        const killed = killActiveProcess('Stopped by user');
        res.json({ status: 'stopped', message: `Process ${killed?.pid || ''} killed` });
    } catch (err) { res.status(500).json({ status: 'error', message: err.message }); }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/replicate — Granular org replication
//  Each Playwright phase is a separate spec so resume works correctly
// ═══════════════════════════════════════════════════════════════

const ORG_STEP_ORDER = [
    'fetch-data', 'validate-names', 'create-org', 'apply-settings',
    'create-company', 'copy-customizations-api', 'copy-white-label',
    'copy-search-menus', 'validate-finalize',
];

router.post('/', async (req, res) => {
    const { sourceOrgId, sourceCompanyId, newOrgName, newDomainUrl, newCompanyName, resumeFromStep, runId: clientRunId } = req.body;
    if (!sourceOrgId) return res.status(400).json({ error: 'sourceOrgId is required' });

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const sendEvent = (type, message) => { res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`); };
    attachDisconnectCleanup(req, res, sendEvent);

    const runId = clientRunId || `run-${Date.now()}`;
    sendEvent('run-id', runId);
    let effectiveResumeFromStep = resumeFromStep || null;

    const shouldSkip = (stepId) => {
        if (!effectiveResumeFromStep) return false;
        const stepIdx = ORG_STEP_ORDER.indexOf(stepId);
        const resumeIdx = ORG_STEP_ORDER.indexOf(effectiveResumeFromStep);
        if (stepIdx < 0 || resumeIdx < 0) return false;
        return stepIdx < resumeIdx;
    };

    // If resuming, try to reuse the previous data file
    const prevRun = activeRuns.get(runId);
    let dataFile = prevRun?.dataFile || null;

    // If a previous run already created org before interruption, never re-run create-org.
    if (effectiveResumeFromStep && dataFile && existsSync(dataFile)) {
        try {
            const resumeData = JSON.parse(readFileSync(dataFile, 'utf-8'));
            const createdOrgId = resumeData?.result?.newOrgId;
            const requestedIdx = ORG_STEP_ORDER.indexOf(effectiveResumeFromStep);
            const createOrgIdx = ORG_STEP_ORDER.indexOf('create-org');
            if (createdOrgId && requestedIdx > -1 && requestedIdx <= createOrgIdx) {
                effectiveResumeFromStep = 'apply-settings';
                sendEvent('progress', `Detected existing org #${createdOrgId} from previous run. Resuming from Apply Org Settings.`);
            }
        } catch (err) {
            sendEvent('log', `[RESUME] Could not inspect previous run data file: ${err.message}`);
        }
    }

    try {
        // ── Step 1: Fetch Production Data ──
        let data;
        if (shouldSkip('fetch-data')) {
            sendStepEvent(sendEvent, 'fetch-data', 'completed', { skipped: true });
        } else {
            sendStepEvent(sendEvent, 'fetch-data', 'running');
            const t = Date.now();
            try {
                data = await fetchReplicationData(sourceOrgId, sourceCompanyId, sendEvent);
                sendStepEvent(sendEvent, 'fetch-data', 'completed', { duration: Date.now() - t });
            } catch (err) {
                sendStepEvent(sendEvent, 'fetch-data', 'failed', { error: err.message, duration: Date.now() - t });
                activeRuns.set(runId, { sourceOrgId, sourceCompanyId, newOrgName, newDomainUrl, newCompanyName, failedStep: 'fetch-data' });
                res.end(); return;
            }
        }
        if (!data) data = await fetchReplicationData(sourceOrgId, sourceCompanyId, sendEvent);

        // ── Step 2: Validate Names ──
        const finalOrgName = (newOrgName || `Copy of ${data.org.name}`).trim();
        if (shouldSkip('validate-names')) {
            sendStepEvent(sendEvent, 'validate-names', 'completed', { skipped: true });
        } else {
            sendStepEvent(sendEvent, 'validate-names', 'running');
            const t = Date.now();
            try {
                if (!resumeFromStep) {
                    const { rows: eo } = await pool.query(`SELECT id FROM organizations WHERE LOWER(name) = LOWER($1) LIMIT 1`, [finalOrgName]);
                    if (eo.length > 0) { sendStepEvent(sendEvent, 'validate-names', 'failed', { error: `Org "${finalOrgName}" exists (#${eo[0].id})`, duration: Date.now() - t }); res.end(); return; }
                    if (newCompanyName) {
                        const { rows: ec } = await pool.query(`SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1`, [newCompanyName]);
                        if (ec.length > 0) { sendStepEvent(sendEvent, 'validate-names', 'failed', { error: `Company "${newCompanyName}" exists (#${ec[0].id})`, duration: Date.now() - t }); res.end(); return; }
                    }
                }
                sendEvent('progress', 'Name validation passed');
                sendStepEvent(sendEvent, 'validate-names', 'completed', { duration: Date.now() - t });
            } catch (err) { sendStepEvent(sendEvent, 'validate-names', 'failed', { error: err.message, duration: Date.now() - t }); res.end(); return; }
        }

        // Prepare data file (create new or reuse existing for resume)
        if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
        if (!dataFile || !existsSync(dataFile)) {
            dataFile = resolve(TMP_DIR, `replicate-${Date.now()}.json`);
            writeFileSync(dataFile, JSON.stringify({
                org: data.org, orgSettings: data.orgSettings, customizations: data.customizations,
                globals: data.globals, customTexts: data.customTexts, jsonNavMenu: data.jsonNavMenu,
                company: data.company, activeFeatures: data.activeFeatures, locations: data.locations,
                authToken: data.authToken,
                overrides: { newOrgName: finalOrgName, newDomainUrl: newDomainUrl || `copy-${data.org.domain_url}-${Date.now()}`, ...(newCompanyName ? { newCompanyName: newCompanyName.trim() } : {}) },
                result: {},
            }, null, 2));
        }

        // Send step definitions to client
        const stepDefs = [
            { id: 'fetch-data', label: 'Fetch Production Data' },
            { id: 'validate-names', label: 'Validate Names' },
            { id: 'create-org', label: 'Create Organization' },
            { id: 'apply-settings', label: 'Apply Org Settings' },
        ];
        if (data.company) stepDefs.push({ id: 'create-company', label: 'Create Company + Features' });
        stepDefs.push({ id: 'copy-customizations-api', label: 'Copy Customizations (API)' });
        if (data.whiteLabelCount > 0) stepDefs.push({ id: 'copy-white-label', label: 'Copy White Label' });
        if (data.searchMenuCount > 0) stepDefs.push({ id: 'copy-search-menus', label: 'Copy Search Menus' });
        stepDefs.push({ id: 'validate-finalize', label: 'Validate & Finalize' });
        sendEvent('steps', JSON.stringify(stepDefs));

        // Helper to run a phase spec as a step
        const runPhaseStep = async (stepId, specFile, errorMsg) => {
            if (shouldSkip(stepId)) { sendStepEvent(sendEvent, stepId, 'completed', { skipped: true }); return true; }
            sendStepEvent(sendEvent, stepId, 'running');
            const t = Date.now();
            const code = await runSpec(specFile, dataFile, sendEvent);
            if (code !== 0) {
                sendStepEvent(sendEvent, stepId, 'failed', { error: `${errorMsg} (exit code ${code})`, duration: Date.now() - t });
                sendEvent('error', `${errorMsg} (exit code ${code})`);
                activeRuns.set(runId, { sourceOrgId, sourceCompanyId, newOrgName, newDomainUrl, newCompanyName, failedStep: stepId, dataFile });
                return false;
            }
            sendStepEvent(sendEvent, stepId, 'completed', { duration: Date.now() - t });
            return true;
        };

        // Helper to run a Node script as a step
        const runScriptStep = async (stepId, scriptFile, args, errorMsg) => {
            if (shouldSkip(stepId)) { sendStepEvent(sendEvent, stepId, 'completed', { skipped: true }); return true; }
            sendStepEvent(sendEvent, stepId, 'running');
            const t = Date.now();
            try {
                const code = await runNodeScript(scriptFile, args, sendEvent);
                if (code !== 0) {
                    sendStepEvent(sendEvent, stepId, 'failed', { error: `${errorMsg} (exit code ${code})`, duration: Date.now() - t });
                    activeRuns.set(runId, { sourceOrgId, sourceCompanyId, newOrgName, newDomainUrl, newCompanyName, failedStep: stepId, dataFile });
                    return false;
                }
                sendStepEvent(sendEvent, stepId, 'completed', { duration: Date.now() - t });
                return true;
            } catch (err) {
                sendStepEvent(sendEvent, stepId, 'failed', { error: err.message, duration: Date.now() - t });
                activeRuns.set(runId, { sourceOrgId, sourceCompanyId, newOrgName, newDomainUrl, newCompanyName, failedStep: stepId, dataFile });
                return false;
            }
        };

        // ── Step 3: Create Organization ──
        if (!await runPhaseStep('create-org', 'tests/replication/phases/phase1_createOrg.spec.js', 'Create Organization failed')) { res.end(); return; }

        // ── Step 4: Apply Org Settings ──
        if (!await runPhaseStep('apply-settings', 'tests/replication/phases/phase2_applySettings.spec.js', 'Apply Org Settings failed')) { res.end(); return; }

        // ── Step 5: Create Company + Features ──
        if (data.company) {
            if (!await runPhaseStep('create-company', 'tests/replication/phases/phase3_createCompany.spec.js', 'Create Company failed')) { res.end(); return; }
        }

        // ── Step 6: Copy Customizations via API (Playwright) ──
        if (!await runPhaseStep('copy-customizations-api', 'tests/replication/phases/phase4_customizations.spec.js', 'Copy Customizations failed')) { res.end(); return; }

        // ── Step 7: Copy White Label (Node script) ──
        if (data.whiteLabelCount > 0) {
            const resultData = JSON.parse(readFileSync(dataFile, 'utf-8'));
            const newOrgId = resultData.result?.newOrgId;
            if (sourceOrgId && newOrgId) {
                sendEvent('progress', `Copying ${data.whiteLabelCount} white label configuration(s)...`);
                if (!await runScriptStep('copy-white-label', 'scripts/copyOrgWhiteLabel.js', [String(sourceOrgId), String(newOrgId)], 'White label copy failed')) { res.end(); return; }
                sendEvent('progress', 'White label configurations copied successfully');
            }
        }

        // ── Step 8: Copy Search Menus (Node script) ──
        if (data.searchMenuCount > 0) {
            const resultData = JSON.parse(readFileSync(dataFile, 'utf-8'));
            const newOrgId = resultData.result?.newOrgId;
            if (sourceOrgId && newOrgId) {
                sendEvent('progress', `Copying ${data.searchMenuCount} custom search menu(s)...`);
                if (!await runScriptStep('copy-search-menus', 'scripts/copyCustomSearchMenus.js', [String(sourceOrgId), String(newOrgId)], 'Search menu copy failed')) { res.end(); return; }
                sendEvent('progress', 'Custom search menus copied successfully');
            }
        }

        // ── Step 9: Validate & Finalize ──
        sendStepEvent(sendEvent, 'validate-finalize', 'running');
        const tFinal = Date.now();
        const resultData = JSON.parse(readFileSync(dataFile, 'utf-8'));
        const finalResult = resultData.result || {};
        const parts = [];
        if (finalResult.newOrgId) parts.push(`Org ID: ${finalResult.newOrgId}`);
        if (finalResult.newCompanyId) parts.push(`Company ID: ${finalResult.newCompanyId}`);
        if (finalResult.customizations) {
            const created = finalResult.customizations.filter(r => r.status === 'created').length;
            parts.push(`Customizations: ${created}/${data.customizations.length}`);
        }
        sendStepEvent(sendEvent, 'validate-finalize', 'completed', { duration: Date.now() - tFinal });
        sendEvent('success', `Replication completed! ${parts.join(' | ')}`);
        activeRuns.delete(runId);
        res.end();

    } catch (err) {
        console.error('Replication error:', err.message);
        sendEvent('error', `Replication failed: ${err.message}`);
        res.end();
    }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/replicate/company — Company replication with steps
// ═══════════════════════════════════════════════════════════════

router.post('/company', async (req, res) => {
    const { targetOrgId, sourceCompanyId, newCompanyName } = req.body;
    if (!targetOrgId || !sourceCompanyId) return res.status(400).json({ error: 'targetOrgId and sourceCompanyId are required' });

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const sendEvent = (type, message) => { res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`); };
    attachDisconnectCleanup(req, res, sendEvent);

    const stepDefs = [
        { id: 'verify-org', label: 'Verify Target Organization' },
        { id: 'validate-name', label: 'Validate Company Name' },
        { id: 'fetch-source', label: 'Fetch Source Company Data' },
        { id: 'run-spec', label: 'Run Company Replication (Playwright)' },
        { id: 'lookup-id', label: 'Lookup New Company ID' },
    ];
    sendEvent('steps', JSON.stringify(stepDefs));

    try {
        sendStepEvent(sendEvent, 'verify-org', 'running');
        let t = Date.now();
        const { rows: orgRows } = await pool.query(`SELECT id, name FROM organizations WHERE id = $1`, [targetOrgId]);
        if (orgRows.length === 0) { sendStepEvent(sendEvent, 'verify-org', 'failed', { error: `Org #${targetOrgId} not found`, duration: Date.now() - t }); res.end(); return; }
        sendEvent('progress', `Target org: "${orgRows[0].name}" (#${targetOrgId})`);
        sendStepEvent(sendEvent, 'verify-org', 'completed', { duration: Date.now() - t });

        sendStepEvent(sendEvent, 'validate-name', 'running');
        t = Date.now();
        if (newCompanyName) {
            const { rows: ex } = await pool.query(`SELECT id FROM companies WHERE LOWER(name) = LOWER($1) AND organization_id = $2 LIMIT 1`, [newCompanyName, targetOrgId]);
            if (ex.length > 0) { sendStepEvent(sendEvent, 'validate-name', 'failed', { error: `"${newCompanyName}" exists in org #${targetOrgId}`, duration: Date.now() - t }); res.end(); return; }
            sendEvent('progress', 'Company name validation passed');
        }
        sendStepEvent(sendEvent, 'validate-name', 'completed', { duration: Date.now() - t });

        sendStepEvent(sendEvent, 'fetch-source', 'running');
        t = Date.now();
        const { rows: companyRows } = await pool.query(`SELECT * FROM companies WHERE id = $1`, [sourceCompanyId]);
        if (companyRows.length === 0) { sendStepEvent(sendEvent, 'fetch-source', 'failed', { error: `Company #${sourceCompanyId} not found`, duration: Date.now() - t }); res.end(); return; }
        const { rows: featureRows } = await pool.query(
            `SELECT f.id AS feature_id, f.description AS feature_description, s.access
             FROM settings s JOIN features f ON f.id = s.feature_id
             WHERE s.settable_type = 'Company' AND s.settable_id = $1 AND s.active = true ORDER BY f.id`, [sourceCompanyId]
        );
        sendEvent('progress', `Found ${featureRows.length} feature switches`);
        const { rows: locationRows } = await pool.query(`SELECT * FROM locations WHERE vendor_id = $1 ORDER BY id`, [sourceCompanyId]);
        sendEvent('progress', `Found ${locationRows.length} location(s)`);
        sendStepEvent(sendEvent, 'fetch-source', 'completed', { duration: Date.now() - t });

        sendStepEvent(sendEvent, 'run-spec', 'running');
        t = Date.now();
        if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
        const dataFile = resolve(TMP_DIR, `replicate-company-${Date.now()}.json`);
        writeFileSync(dataFile, JSON.stringify({
            company: companyRows[0], activeFeatures: featureRows, locations: locationRows,
            overrides: { orgId: String(targetOrgId), ...(newCompanyName ? { newCompanyName: newCompanyName.trim() } : {}) },
            result: {},
        }, null, 2));
        const exitCode = await runSpec('tests/replication/replicateCompany.spec.js', dataFile, sendEvent);
        if (exitCode !== 0) { sendStepEvent(sendEvent, 'run-spec', 'failed', { error: `Company replication failed (exit ${exitCode})`, duration: Date.now() - t }); res.end(); return; }
        sendStepEvent(sendEvent, 'run-spec', 'completed', { duration: Date.now() - t });

        sendStepEvent(sendEvent, 'lookup-id', 'running');
        t = Date.now();
        const resultData = JSON.parse(readFileSync(dataFile, 'utf-8'));
        const createdName = resultData.result?.companyName;
        let newCompanyId = null;
        if (createdName) {
            for (let attempt = 1; attempt <= 5; attempt++) {
                const { rows } = await pool.query(`SELECT id FROM companies WHERE TRIM(name) = $1 AND organization_id = $2 ORDER BY id DESC LIMIT 1`, [createdName.trim(), targetOrgId]);
                if (rows.length > 0) { newCompanyId = String(rows[0].id); break; }
                sendEvent('log', `[DB] Attempt ${attempt}/5: not found yet...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
        sendStepEvent(sendEvent, 'lookup-id', 'completed', { duration: Date.now() - t });
        sendEvent('success', newCompanyId ? `Company replication completed! Org: ${targetOrgId} | Company: ${newCompanyId}` : `Company replication completed! Org: ${targetOrgId} | Warning: ID not found`);
        res.end();

    } catch (err) { console.error('Company replication error:', err.message); sendEvent('error', `Replication failed: ${err.message}`); res.end(); }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/replicate/create-user — Create users with steps
// ═══════════════════════════════════════════════════════════════

router.post('/create-user', async (req, res) => {
    const { baseUrl, email, password, companyId, name, numberOfUsers } = req.body;
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const sendEvent = (type, message) => { res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`); };
    attachDisconnectCleanup(req, res, sendEvent);

    const stepDefs = [
        { id: 'validate-fields', label: 'Validate Input Fields' },
        { id: 'write-data', label: 'Prepare Data File' },
        { id: 'run-spec', label: 'Create Users (Playwright)' },
    ];
    sendEvent('steps', JSON.stringify(stepDefs));

    sendStepEvent(sendEvent, 'validate-fields', 'running');
    let t = Date.now();
    if (!baseUrl || !email || !password || !companyId || !name || !numberOfUsers) {
        sendStepEvent(sendEvent, 'validate-fields', 'failed', { error: 'Missing required fields', duration: Date.now() - t });
        return res.end();
    }
    sendStepEvent(sendEvent, 'validate-fields', 'completed', { duration: Date.now() - t });

    try {
        sendStepEvent(sendEvent, 'write-data', 'running');
        t = Date.now();
        if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
        const dataFile = resolve(TMP_DIR, `create-user-${Date.now()}.json`);
        writeFileSync(dataFile, JSON.stringify({ baseUrl, email, password, companyId: String(companyId), name, numberOfUsers: Number(numberOfUsers) }));
        sendEvent('progress', `Creating ${numberOfUsers} user(s) in company ${companyId}...`);
        sendStepEvent(sendEvent, 'write-data', 'completed', { duration: Date.now() - t });

        sendStepEvent(sendEvent, 'run-spec', 'running');
        t = Date.now();
        const code = await runSpec('tests/standalone/Create_user.spec.js', dataFile, sendEvent);
        if (code === 0) { sendStepEvent(sendEvent, 'run-spec', 'completed', { duration: Date.now() - t }); sendEvent('success', `Successfully created ${numberOfUsers} user(s)!`); }
        else { sendStepEvent(sendEvent, 'run-spec', 'failed', { error: `Exit code ${code}`, duration: Date.now() - t }); sendEvent('error', `User creation failed (exit ${code})`); }
        res.end();
    } catch (err) { console.error('Create user error:', err.message); sendEvent('error', `Create user failed: ${err.message}`); res.end(); }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/replicate/inventory-permissions
// ═══════════════════════════════════════════════════════════════
router.post('/inventory-permissions', async (req, res) => {
    const { clientCompanyId, vendorCompanyIds, createApiClient, products } = req.body || {};

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const sendEvent = (type, message) => { res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`); };
    attachDisconnectCleanup(req, res, sendEvent);

    const stepDefs = [
        { id: 'validate-fields', label: 'Validate Input Fields' },
        { id: 'run-spec', label: 'Create API Client / Inventory Permissions' },
    ];
    sendEvent('steps', JSON.stringify(stepDefs));

    sendStepEvent(sendEvent, 'validate-fields', 'running');
    const tValidate = Date.now();

    const clientIdStr = String(clientCompanyId || '').trim();
    const vendorIds = Array.isArray(vendorCompanyIds)
        ? vendorCompanyIds.map((v) => String(v).trim()).filter(Boolean)
        : String(vendorCompanyIds || '').split(',').map((v) => v.trim()).filter(Boolean);
    const productKeys = Array.isArray(products) ? products.map((p) => String(p).trim()).filter(Boolean) : [];
    const invalidClientId = !/^\d+$/.test(clientIdStr);
    const invalidVendorId = vendorIds.find((v) => !/^\d+$/.test(v));

    if (invalidClientId || vendorIds.length === 0 || invalidVendorId || productKeys.length === 0) {
        const message = invalidClientId
            ? 'Client ID must be numeric'
            : vendorIds.length === 0
                ? 'At least one Vendor ID is required'
                : invalidVendorId
                    ? `Invalid Vendor ID: ${invalidVendorId}`
                    : 'At least one product must be selected';
        sendStepEvent(sendEvent, 'validate-fields', 'failed', { error: message, duration: Date.now() - tValidate });
        sendEvent('error', message);
        return res.end();
    }

    sendStepEvent(sendEvent, 'validate-fields', 'completed', { duration: Date.now() - tValidate });

    try {
        sendStepEvent(sendEvent, 'run-spec', 'running');
        const tRun = Date.now();

        const uniqueVendorIds = [...new Set(vendorIds)];
        const uniqueProducts = [...new Set(productKeys)];
        const env = {
            CLIENT_COMPANY_ID: clientIdStr,
            VENDOR_COMPANY_IDS: uniqueVendorIds.join(','),
            CREATE_API_CLIENT: String(Boolean(createApiClient)),
            INVENTORY_PRODUCTS: uniqueProducts.join(','),
        };

        const code = await runSpec('tests/standalone/Create_api_client_inventory_permissions.spec.js', '', sendEvent, env);
        if (code === 0) {
            sendStepEvent(sendEvent, 'run-spec', 'completed', { duration: Date.now() - tRun });
            sendEvent('success', 'Inventory permissions flow completed successfully');
        } else {
            sendStepEvent(sendEvent, 'run-spec', 'failed', { error: `Exit code ${code}`, duration: Date.now() - tRun });
            sendEvent('error', `Inventory permissions flow failed (exit ${code})`);
        }

        res.end();
    } catch (err) {
        sendStepEvent(sendEvent, 'run-spec', 'failed', { error: err.message });
        sendEvent('error', `Inventory permissions flow failed: ${err.message}`);
        res.end();
    }
});

// ═══════════════════════════════════════════════════════════════
//  POST /api/replicate/run-script — Run scripts with steps
// ═══════════════════════════════════════════════════════════════

const ALLOWED_SCRIPTS = {
    'copyCustomSearchMenus':  { file: 'scripts/copyCustomSearchMenus.js', argCount: 2 },
    'copyOrgWhiteLabel':      { file: 'scripts/copyOrgWhiteLabel.js', argCount: 2 },
    'copyOrgCustomizations':  { file: 'scripts/copyOrgCustomizations.js', argCount: 2 },
    'copyCompanyCustomizations': { file: 'scripts/copyCompanyCustomizations.js', argCount: 2 },
    'testFeatureActivation':  { file: 'scripts/testFeatureActivation.js', argCount: 2 },
    'testCustomizations':     { file: 'scripts/testCustomizations.js', argCount: 2 },
    'importCustomSearchMenusFromSheet': { file: 'scripts/importCustomSearchMenusFromSheet.js', minArgCount: 2, maxArgCount: 3 },
};

const SCRIPT_STEP_DEFS = {
    copyCustomSearchMenus: [{ id: 'init', label: 'Initialize' }, { id: 'run', label: 'Copy Search Menu Types & Menus' }],
    copyOrgWhiteLabel: [{ id: 'init', label: 'Initialize' }, { id: 'run', label: 'Copy White Label Configs' }],
    copyOrgCustomizations: [{ id: 'init', label: 'Initialize' }, { id: 'run', label: 'Copy Customizations, Texts & Nav' }],
    copyCompanyCustomizations: [{ id: 'init', label: 'Initialize' }, { id: 'run', label: 'Copy Company Customizations' }],
    testFeatureActivation: [{ id: 'init', label: 'Initialize' }, { id: 'run', label: 'Activate Features on Target' }],
    testCustomizations: [{ id: 'init', label: 'Initialize' }, { id: 'run', label: 'Run Customizations Spec' }],
    importCustomSearchMenusFromSheet: [{ id: 'init', label: 'Initialize' }, { id: 'run', label: 'Import from Sheet' }],
};

router.post('/run-script', async (req, res) => {
    const { script, args, fileUpload } = req.body;
    if (!script || !ALLOWED_SCRIPTS[script]) return res.status(400).json({ error: `Unknown script: ${script}` });

    const config = ALLOWED_SCRIPTS[script];
    const scriptArgs = Array.isArray(args) ? args.map(String) : [];

    // Support uploaded workbook for import script to avoid manual path entry.
    if (script === 'importCustomSearchMenusFromSheet' && fileUpload?.contentBase64) {
        try {
            const safeName = String(fileUpload.filename || 'sheet.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_');
            if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
            const uploadPath = resolve(TMP_DIR, `upload-${Date.now()}-${safeName}`);
            const contentBuffer = Buffer.from(String(fileUpload.contentBase64), 'base64');
            writeFileSync(uploadPath, contentBuffer);
            if (scriptArgs.length >= 2) scriptArgs[1] = uploadPath;
            else scriptArgs.push(uploadPath);
        } catch (err) {
            return res.status(400).json({ error: `Invalid uploaded file payload: ${err.message}` });
        }
    }
    const minArgs = Number.isInteger(config.minArgCount) ? config.minArgCount : config.argCount;
    const maxArgs = Number.isInteger(config.maxArgCount) ? config.maxArgCount : config.argCount;
    if (scriptArgs.length < minArgs || scriptArgs.length > maxArgs) return res.status(400).json({ error: `Wrong arg count` });

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const sendEvent = (type, message) => { res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`); };
    attachDisconnectCleanup(req, res, sendEvent);

    const stepDefs = SCRIPT_STEP_DEFS[script] || [{ id: 'run', label: 'Run Script' }];
    sendEvent('steps', JSON.stringify(stepDefs));

    sendStepEvent(sendEvent, 'init', 'running');
    const tInit = Date.now();

    try {
        sendEvent('progress', `Starting ${script} with args: ${scriptArgs.join(', ')}`);
        sendStepEvent(sendEvent, 'init', 'completed', { duration: Date.now() - tInit });

        sendStepEvent(sendEvent, 'run', 'running');
        const tRun = Date.now();
        const code = await runNodeScript(config.file, scriptArgs, sendEvent);

        if (code === 0) {
            sendStepEvent(sendEvent, 'run', 'completed', { duration: Date.now() - tRun });
            sendEvent('success', `Script "${script}" completed successfully`);
        } else {
            sendStepEvent(sendEvent, 'run', 'failed', { error: `Exit code ${code}`, duration: Date.now() - tRun });
            sendEvent('error', `Script "${script}" exited with code ${code}`);
        }
        res.end();
    } catch (err) { console.error(`Run script error (${script}):`, err.message); sendEvent('error', `Script failed: ${err.message}`); res.end(); }
});

export default router;
