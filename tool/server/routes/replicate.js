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

// ── Track active child process so it can be stopped ──
let activeProcess = null;

// ════════════════════════════════════════════════════════════════
//  Helper: strip ANSI escape codes from script output
// ════════════════════════════════════════════════════════════════

function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ════════════════════════════════════════════════════════════════
//  Helper: spawn a standalone Node script and stream output via SSE
//  Used for Phase 2 scripts (vdbdatamappings creds)
// ════════════════════════════════════════════════════════════════

function runNodeScript(scriptPath, args, sendEvent) {
    return new Promise((resolvePromise, rejectPromise) => {
        sendEvent('progress', `Running ${scriptPath} ${args.join(' ')}...`);

        const child = spawn('node', [scriptPath, ...args], {
            cwd: PLAYWRIGHT_ROOT,
            env: process.env,
            shell: true,
        });
        activeProcess = child;

        child.stdout.on('data', (data) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
                sendEvent('log', stripAnsi(line.trim()));
            }
        });

        child.stderr.on('data', (data) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
                sendEvent('log', stripAnsi(line.trim()));
            }
        });

        child.on('close', (code) => { activeProcess = null; resolvePromise(code); });
        child.on('error', (err) => { activeProcess = null; rejectPromise(err); });
    });
}

// ════════════════════════════════════════════════════════════════
//  Helper: fetch ALL replication data from DB in one shot
// ════════════════════════════════════════════════════════════════

async function fetchReplicationData(sourceOrgId, sourceCompanyId, sendEvent) {
    // 1. Organization
    sendEvent('progress', 'Fetching organization data...');
    const { rows: orgRows } = await pool.query(
        `SELECT * FROM organizations WHERE id = $1`, [sourceOrgId]
    );
    if (orgRows.length === 0) throw new Error(`Organization #${sourceOrgId} not found`);

    // 2. Org settings
    sendEvent('progress', 'Fetching organization settings...');
    const { rows: orgSettings } = await pool.query(
        `SELECT f.id AS feature_id, f.name AS feature_name,
                f.description AS feature_description, s.access
         FROM settings s
         JOIN features f ON f.id = s.feature_id
         WHERE s.settable_type = 'Organization'
           AND s.settable_id = $1
           AND s.active = true
         ORDER BY f.id`,
        [sourceOrgId]
    );
    sendEvent('progress', `Found ${orgSettings.length} active org settings`);

    // 3. Customizations — fetch all rows for this org, then let the spec POST each one
    sendEvent('progress', 'Fetching customizations...');
    const { rows: customizations } = await pool.query(
        `SELECT id, type, product_type, content, resource_type, resource_id, s3_url, updated_at
         FROM customizations
         WHERE resource_id = $1
         ORDER BY type, product_type`,
        [sourceOrgId]
    );
    for (const c of customizations) {
        sendEvent('log', `[DB] Found: ${c.type} | product_type=${c.product_type} | id=${c.id}`);
    }
    sendEvent('progress', `Found ${customizations.length} customization rows`);

    // 4. Global (custom_texts where type = 'Global')
    sendEvent('progress', 'Fetching global...');
    const { rows: globals } = await pool.query(
        `SELECT * FROM custom_texts
         WHERE type = 'Global' AND resource_type = 'Organization' AND resource_id = $1`,
        [sourceOrgId]
    );
    if (globals.length > 0) {
        sendEvent('log', `[DB] Found global (id=${globals[0].id})`);
    } else {
        sendEvent('log', '[DB] No global found for this org');
    }

    // 5. Custom Texts (custom_texts with a language_id, type should be null)
    sendEvent('progress', 'Fetching custom texts...');
    const { rows: customTexts } = await pool.query(
        `SELECT * FROM custom_texts
         WHERE resource_id = $1 AND resource_type = 'Organization' AND language_id IS NOT NULL
         ORDER BY language_id`,
        [sourceOrgId]
    );
    for (const ct of customTexts) {
        sendEvent('log', `[DB] Found custom_text: language_id=${ct.language_id} | id=${ct.id}`);
    }
    sendEvent('progress', `Found ${customTexts.length} custom text(s)`);

    // 6. JsonNavigationMenu (custom_texts where type = 'JsonNavigationMenu')
    sendEvent('progress', 'Fetching JSON navigation menu...');
    const { rows: jsonNavMenuRows } = await pool.query(
        `SELECT * FROM custom_texts
         WHERE type = 'JsonNavigationMenu' AND resource_type = 'Organization' AND resource_id = $1
         LIMIT 1`,
        [sourceOrgId]
    );
    const jsonNavMenu = jsonNavMenuRows.length > 0 ? jsonNavMenuRows[0] : null;
    if (jsonNavMenu) {
        sendEvent('log', `[DB] Found JsonNavigationMenu (id=${jsonNavMenu.id})`);
    } else {
        sendEvent('log', '[DB] No JsonNavigationMenu found for this org');
    }

    // 7. Company + feature switches (if provided)
    let company = null;
    let activeFeatures = [];
    if (sourceCompanyId) {
        sendEvent('progress', 'Fetching company data...');
        const { rows: companyRows } = await pool.query(
            `SELECT * FROM companies WHERE id = $1`, [sourceCompanyId]
        );
        company = companyRows[0] || null;

        if (company) {
            sendEvent('progress', 'Fetching feature switches...');
            const { rows: featureRows } = await pool.query(
                `SELECT f.id AS feature_id, f.description AS feature_description, s.access
                 FROM settings s
                 JOIN features f ON f.id = s.feature_id
                 WHERE s.settable_type = 'Company'
                   AND s.settable_id = $1
                   AND s.active = true
                 ORDER BY f.id`,
                [sourceCompanyId]
            );
            activeFeatures = featureRows;
            sendEvent('progress', `Found ${activeFeatures.length} feature switches`);
        }
    }

    // 6b. Locations (vendor_id = company id)
    let locations = [];
    if (sourceCompanyId) {
        sendEvent('progress', 'Fetching company locations...');
        const { rows: locationRows } = await pool.query(
            `SELECT * FROM locations WHERE vendor_id = $1 ORDER BY id`,
            [sourceCompanyId]
        );
        locations = locationRows;
        sendEvent('progress', `Found ${locations.length} location(s)`);
    }

    // 8. Custom Search Menus count
    sendEvent('progress', 'Checking custom search menus...');
    const { rows: searchMenuCountRows } = await pool.query(
        `SELECT COUNT(*) as count FROM custom_search_menus WHERE organization_id = $1`,
        [sourceOrgId]
    );
    const searchMenuCount = parseInt(searchMenuCountRows[0].count);
    sendEvent('progress', `Found ${searchMenuCount} custom search menu(s)`);

    // 9. White Label configs count
    sendEvent('progress', 'Checking white label configurations...');
    const { rows: whiteLabelCountRows } = await pool.query(
        `SELECT COUNT(*) as count FROM theme_white_labelings
         WHERE resource_type = 'Organization' AND resource_id = $1`,
        [sourceOrgId]
    );
    const whiteLabelCount = parseInt(whiteLabelCountRows[0].count);
    sendEvent('progress', `Found ${whiteLabelCount} white label configuration(s)`);

    // 10. Auth token (for future direct API use)
    let authToken = null;
    try {
        const { rows: authRows } = await pool.query(
            `SELECT auth_token FROM admin_users WHERE email = $1 LIMIT 1`,
            [process.env.STAGE_SUPERADMIN_EMAIL]
        );
        if (authRows.length > 0) authToken = authRows[0].auth_token;
    } catch (err) {
        sendEvent('log', `[DB] Could not fetch auth_token: ${err.message}`);
    }

    return { org: orgRows[0], orgSettings, customizations, globals, customTexts, jsonNavMenu, company, activeFeatures, locations, authToken, searchMenuCount, whiteLabelCount };
}

// ════════════════════════════════════════════════════════════════
//  Helper: spawn a Playwright spec and stream output via SSE
// ════════════════════════════════════════════════════════════════

function runSpec(specFile, dataFile, sendEvent) {
    return new Promise((resolvePromise, rejectPromise) => {
        sendEvent('progress', `Running ${specFile}...`);

        const pw = spawn(
            'npx',
            ['playwright', 'test', '--reporter=list', '--retries=0', specFile],
            {
                cwd: PLAYWRIGHT_ROOT,
                env: { ...process.env, REPLICATION_DATA_FILE: dataFile },
                shell: true,
            }
        );
        activeProcess = pw;

        pw.stdout.on('data', (data) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
                sendEvent('log', line.trim());
            }
        });

        pw.stderr.on('data', (data) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
                sendEvent('log', line.trim());
            }
        });

        pw.on('close', (code) => { activeProcess = null; resolvePromise(code); });
        pw.on('error', (err) => { activeProcess = null; rejectPromise(err); });
    });
}

// ════════════════════════════════════════════════════════════════
//  POST /api/replicate/stop — Kill the running Playwright process
// ════════════════════════════════════════════════════════════════

router.post('/stop', (req, res) => {
    if (!activeProcess) {
        return res.json({ status: 'no_process', message: 'No replication process is running' });
    }
    try {
        const pid = activeProcess.pid;
        if (process.platform === 'win32') {
            spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { shell: true });
        } else {
            activeProcess.kill('SIGTERM');
        }
        activeProcess = null;
        res.json({ status: 'stopped', message: `Process ${pid} killed` });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// ════════════════════════════════════════════════════════════════
//  POST /api/replicate — Two-phase replication
//  Phase 1 (spec): Login → Org → Settings → Company → Features → Customizations
//  Phase 2 (server): copyCustomSearchMenus + copyOrgWhiteLabel (vdbdatamappings creds)
// ════════════════════════════════════════════════════════════════

router.post('/', async (req, res) => {
    const { sourceOrgId, sourceCompanyId, newOrgName, newDomainUrl, newCompanyName } = req.body;

    if (!sourceOrgId) {
        return res.status(400).json({ error: 'sourceOrgId is required' });
    }

    // SSE setup
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    const sendEvent = (type, message) => {
        res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`);
    };

    try {
        // ── 1. Fetch all data from DB ──
        const data = await fetchReplicationData(sourceOrgId, sourceCompanyId, sendEvent);

        // ── 1b. Validate names are not already taken ──
        const finalOrgName = (newOrgName || `Copy of ${data.org.name}`).trim();
        const { rows: existingOrgs } = await pool.query(
            `SELECT id FROM organizations WHERE LOWER(name) = LOWER($1) LIMIT 1`,
            [finalOrgName]
        );
        if (existingOrgs.length > 0) {
            sendEvent('error', `Organization name "${finalOrgName}" already exists (ID: #${existingOrgs[0].id}). Please choose a different name.`);
            res.end();
            return;
        }

        if (newCompanyName) {
            // We check against all orgs since the new org doesn't exist yet
            const { rows: existingCompanies } = await pool.query(
                `SELECT id FROM companies WHERE LOWER(name) = LOWER($1) LIMIT 1`,
                [newCompanyName]
            );
            if (existingCompanies.length > 0) {
                sendEvent('error', `Company name "${newCompanyName}" already exists (ID: #${existingCompanies[0].id}). Please choose a different name.`);
                res.end();
                return;
            }
        }

        sendEvent('progress', 'Name validation passed');

        // ── 2. Write temp JSON ──
        if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
        const dataFile = resolve(TMP_DIR, `replicate-${Date.now()}.json`);

        const replicationData = {
            org: data.org,
            orgSettings: data.orgSettings,
            customizations: data.customizations,
            globals: data.globals,
            customTexts: data.customTexts,
            jsonNavMenu: data.jsonNavMenu,
            company: data.company,
            activeFeatures: data.activeFeatures,
            locations: data.locations,
            authToken: data.authToken,
            overrides: {
                newOrgName: finalOrgName,
                newDomainUrl: newDomainUrl || `copy-${data.org.domain_url}-${Date.now()}`,
                ...(newCompanyName ? { newCompanyName: newCompanyName.trim() } : {}),
            },
            result: {},
        };
        writeFileSync(dataFile, JSON.stringify(replicationData, null, 2));

        // Build step summary
        const steps = ['Create Org + Settings'];
        if (data.company) steps.push('Create Company + Features');
        if (data.customizations.length > 0) steps.push(`Customizations (${data.customizations.length})`);
        if (data.jsonNavMenu) steps.push('JsonNavigationMenu');
        if (data.globals.length > 0) steps.push('Global');
        if (data.customTexts.length > 0) steps.push(`Custom Texts (${data.customTexts.length})`);
        if (data.searchMenuCount > 0) steps.push(`Search Menus (${data.searchMenuCount})`);
        if (data.whiteLabelCount > 0) steps.push(`White Label (${data.whiteLabelCount})`);
        sendEvent('progress', `Data prepared. Running: ${steps.join(' → ')}`);

        // ── 3. Phase 1 — Run the unified spec (vdborg001 creds) ──
        const exitCode = await runSpec('tests/replication/replicate.spec.js', dataFile, sendEvent);

        if (exitCode !== 0) {
            sendEvent('error', `Phase 1 replication failed (exit code ${exitCode})`);
            res.end();
            return;
        }

        // ── 4. Read results from data file ──
        let resultData = JSON.parse(readFileSync(dataFile, 'utf-8'));
        const result = resultData.result || {};
        const newOrgId = result.newOrgId;

        sendEvent('progress', 'Phase 1 complete. Starting Phase 2 (Search Menus + White Label)...');

        // ── 5. Phase 2 — Spawn standalone scripts (vdbdatamappings creds) ──
        let searchMenuStatus = data.searchMenuCount > 0 ? 'pending' : 'skipped';
        let whiteLabelStatus = data.whiteLabelCount > 0 ? 'pending' : 'skipped';

        if (sourceOrgId && newOrgId) {
            // 5a. Copy Custom Search Menus
            if (data.searchMenuCount > 0) {
                try {
                    sendEvent('progress', `Copying ${data.searchMenuCount} custom search menu(s)...`);
                    const smCode = await runNodeScript(
                        'scripts/copyCustomSearchMenus.js',
                        [String(sourceOrgId), String(newOrgId)],
                        sendEvent
                    );
                    if (smCode === 0) {
                        sendEvent('progress', 'Custom search menus copied successfully');
                        searchMenuStatus = 'copied';
                    } else {
                        searchMenuStatus = 'failed';
                        sendEvent('log', `[SEARCH MENU] Script exited with code ${smCode}`);
                    }
                } catch (err) {
                    searchMenuStatus = 'failed';
                    sendEvent('log', `[SEARCH MENU] Error: ${err.message}`);
                }
            }

            // 5b. Copy White Label
            if (data.whiteLabelCount > 0) {
                try {
                    sendEvent('progress', `Copying ${data.whiteLabelCount} white label configuration(s)...`);
                    const wlCode = await runNodeScript(
                        'scripts/copyOrgWhiteLabel.js',
                        [String(sourceOrgId), String(newOrgId)],
                        sendEvent
                    );
                    if (wlCode === 0) {
                        sendEvent('progress', 'White label configurations copied successfully');
                        whiteLabelStatus = 'copied';
                    } else {
                        whiteLabelStatus = 'failed';
                        sendEvent('log', `[WHITE LABEL] Script exited with code ${wlCode}`);
                    }
                } catch (err) {
                    whiteLabelStatus = 'failed';
                    sendEvent('log', `[WHITE LABEL] Error: ${err.message}`);
                }
            }
        }

        // ── 6. Final summary ──
        resultData = JSON.parse(readFileSync(dataFile, 'utf-8'));
        const finalResult = resultData.result || {};

        const parts = [];
        if (finalResult.newOrgId) parts.push(`Org ID: ${finalResult.newOrgId}`);
        if (finalResult.newCompanyId) parts.push(`Company ID: ${finalResult.newCompanyId}`);
        if (finalResult.customizations) {
            const created = finalResult.customizations.filter(r => r.status === 'created').length;
            parts.push(`Customizations: ${created}/${data.customizations.length}`);
        }
        if (data.searchMenuCount > 0) parts.push(`Search Menus: ${searchMenuStatus}`);
        if (data.whiteLabelCount > 0) parts.push(`White Label: ${whiteLabelStatus}`);

        const phase2Failed = searchMenuStatus === 'failed' || whiteLabelStatus === 'failed';
        if (phase2Failed) {
            sendEvent('error', `Replication completed with Phase 2 errors. ${parts.join(' | ')}`);
        } else {
            sendEvent('success', `Replication completed! ${parts.join(' | ')}`);
        }
        res.end();

    } catch (err) {
        console.error('Replication error:', err.message);
        sendEvent('error', `Replication failed: ${err.message}`);
        res.end();
    }
});

// ════════════════════════════════════════════════════════════════
//  POST /api/replicate/company — Company-only replication
//  Uses the old standalone company spec (separate login)
// ════════════════════════════════════════════════════════════════

router.post('/company', async (req, res) => {
    const { targetOrgId, sourceCompanyId, newCompanyName } = req.body;

    if (!targetOrgId || !sourceCompanyId) {
        return res.status(400).json({ error: 'targetOrgId and sourceCompanyId are required' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    const sendEvent = (type, message) => {
        res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`);
    };

    try {
        // Verify org exists
        sendEvent('progress', `Verifying target organization #${targetOrgId}...`);
        const { rows: orgRows } = await pool.query(
            `SELECT id, name FROM organizations WHERE id = $1`, [targetOrgId]
        );
        if (orgRows.length === 0) {
            sendEvent('error', `Organization #${targetOrgId} not found`);
            res.end();
            return;
        }
        sendEvent('progress', `Target org: "${orgRows[0].name}" (#${targetOrgId})`);

        // Validate company name is not already taken in target org
        if (newCompanyName) {
            const { rows: existingCompanies } = await pool.query(
                `SELECT id FROM companies WHERE LOWER(name) = LOWER($1) AND organization_id = $2 LIMIT 1`,
                [newCompanyName, targetOrgId]
            );
            if (existingCompanies.length > 0) {
                sendEvent('error', `Company name "${newCompanyName}" already exists in org #${targetOrgId} (ID: #${existingCompanies[0].id}). Please choose a different name.`);
                res.end();
                return;
            }
            sendEvent('progress', 'Company name validation passed');
        }

        // Fetch company + features
        sendEvent('progress', 'Fetching source company data...');
        const { rows: companyRows } = await pool.query(
            `SELECT * FROM companies WHERE id = $1`, [sourceCompanyId]
        );
        if (companyRows.length === 0) {
            sendEvent('error', `Company #${sourceCompanyId} not found`);
            res.end();
            return;
        }

        sendEvent('progress', 'Fetching feature switches...');
        const { rows: featureRows } = await pool.query(
            `SELECT f.id AS feature_id, f.description AS feature_description, s.access
             FROM settings s
             JOIN features f ON f.id = s.feature_id
             WHERE s.settable_type = 'Company'
               AND s.settable_id = $1
               AND s.active = true
             ORDER BY f.id`,
            [sourceCompanyId]
        );
        sendEvent('progress', `Found ${featureRows.length} feature switches`);

        // Fetch locations for the source company
        sendEvent('progress', 'Fetching company locations...');
        const { rows: locationRows } = await pool.query(
            `SELECT * FROM locations WHERE vendor_id = $1 ORDER BY id`,
            [sourceCompanyId]
        );
        sendEvent('progress', `Found ${locationRows.length} location(s)`);

        // Write data
        if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
        const dataFile = resolve(TMP_DIR, `replicate-company-${Date.now()}.json`);
        writeFileSync(dataFile, JSON.stringify({
            company: companyRows[0],
            activeFeatures: featureRows,
            locations: locationRows,
            overrides: {
                orgId: String(targetOrgId),
                ...(newCompanyName ? { newCompanyName: newCompanyName.trim() } : {}),
            },
            result: {},
        }, null, 2));

        sendEvent('progress', 'Starting company replication...');

        // Run standalone company spec
        const exitCode = await runSpec('tests/replication/replicateCompany.spec.js', dataFile, sendEvent);

        if (exitCode !== 0) {
            sendEvent('error', `Company replication failed (exit code ${exitCode})`);
            res.end();
            return;
        }

        // Poll DB for the new company ID (retries with delay for write lag)
        sendEvent('progress', 'Looking up new company ID...');
        const resultData = JSON.parse(readFileSync(dataFile, 'utf-8'));
        const createdCompanyName = resultData.result?.companyName;

        let newCompanyId = null;
        if (createdCompanyName) {
            const trimmedName = createdCompanyName.trim();
            for (let attempt = 1; attempt <= 5; attempt++) {
                const { rows } = await pool.query(
                    `SELECT id FROM companies WHERE TRIM(name) = $1 AND organization_id = $2 ORDER BY id DESC LIMIT 1`,
                    [trimmedName, targetOrgId]
                );
                if (rows.length > 0) {
                    newCompanyId = String(rows[0].id);
                    if (rows.length > 1) {
                        sendEvent('log', `[DB] Found ${rows.length} companies named "${createdCompanyName}", using most recent (ID: ${newCompanyId})`);
                    }
                    break;
                }
                sendEvent('log', `[DB] Attempt ${attempt}/5: not found yet, retrying in 3s...`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        if (newCompanyId) {
            sendEvent('success', `Company replication completed! Org: ${targetOrgId} | Company: ${newCompanyId}`);
        } else {
            sendEvent('success', `Company replication completed! Org: ${targetOrgId} | Warning: company ID not found in DB`);
        }
        res.end();

    } catch (err) {
        console.error('Company replication error:', err.message);
        sendEvent('error', `Replication failed: ${err.message}`);
        res.end();
    }
});

// ════════════════════════════════════════════════════════════════
//  POST /api/replicate/create-user — Spawn Create_user spec via SSE
// ════════════════════════════════════════════════════════════════

router.post('/create-user', async (req, res) => {
    const { baseUrl, email, password, companyId, name, numberOfUsers } = req.body;

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const sendEvent = (type, message) => {
        res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`);
    };

    if (!baseUrl || !email || !password || !companyId || !name || !numberOfUsers) {
        sendEvent('error', 'Missing required fields: baseUrl, email, password, companyId, name, numberOfUsers');
        return res.end();
    }

    try {
        // Write a temp data file for the spec to read
        if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });
        const dataFile = resolve(TMP_DIR, `create-user-${Date.now()}.json`);
        writeFileSync(dataFile, JSON.stringify({
            baseUrl,
            email,
            password,
            companyId: String(companyId),
            name,
            numberOfUsers: Number(numberOfUsers),
        }));

        sendEvent('progress', `Creating ${numberOfUsers} user(s) in company ${companyId}...`);

        const specFile = 'tests/standalone/Create_user.spec.js';
        const code = await runSpec(specFile, dataFile, sendEvent);

        if (code === 0) {
            sendEvent('success', `Successfully created ${numberOfUsers} user(s)!`);
        } else {
            sendEvent('error', `User creation finished with exit code ${code}`);
        }
        res.end();

    } catch (err) {
        console.error('Create user error:', err.message);
        sendEvent('error', `Create user failed: ${err.message}`);
        res.end();
    }
});

// ════════════════════════════════════════════════════════════════
//  POST /api/replicate/run-script — Run a standalone script via SSE
//  Validates script name against allowlist, spawns as child process
// ════════════════════════════════════════════════════════════════

const ALLOWED_SCRIPTS = {
    'copyCustomSearchMenus':  { file: 'scripts/copyCustomSearchMenus.js',  argCount: 2 },
    'copyOrgWhiteLabel':      { file: 'scripts/copyOrgWhiteLabel.js',      argCount: 2 },
    'copyOrgCustomizations':  { file: 'scripts/copyOrgCustomizations.js',  argCount: 2 },
    'testFeatureActivation':  { file: 'scripts/testFeatureActivation.js',  argCount: 2 },
    'testCustomizations':     { file: 'scripts/testCustomizations.js',     argCount: 2 },
};

router.post('/run-script', async (req, res) => {
    const { script, args } = req.body;

    if (!script || !ALLOWED_SCRIPTS[script]) {
        return res.status(400).json({ error: `Unknown script: ${script}. Allowed: ${Object.keys(ALLOWED_SCRIPTS).join(', ')}` });
    }

    const config = ALLOWED_SCRIPTS[script];
    const scriptArgs = Array.isArray(args) ? args.map(String) : [];

    if (scriptArgs.length !== config.argCount) {
        return res.status(400).json({ error: `Script "${script}" requires ${config.argCount} argument(s), got ${scriptArgs.length}` });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const sendEvent = (type, message) => {
        res.write(`data: ${JSON.stringify({ type, message, timestamp: new Date().toISOString() })}\n\n`);
    };

    try {
        sendEvent('progress', `Starting ${script} with args: ${scriptArgs.join(', ')}`);

        const code = await runNodeScript(config.file, scriptArgs, sendEvent);

        if (code === 0) {
            sendEvent('success', `Script "${script}" completed successfully`);
        } else {
            sendEvent('error', `Script "${script}" exited with code ${code}`);
        }
        res.end();

    } catch (err) {
        console.error(`Run script error (${script}):`, err.message);
        sendEvent('error', `Script failed: ${err.message}`);
        res.end();
    }
});

export default router;
