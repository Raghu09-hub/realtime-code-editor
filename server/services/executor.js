/**
 * executor.js — Sandboxed code execution via Judge0 CE (RapidAPI)
 *
 * Why Judge0?
 *   • Docker is not always available (e.g. macOS without Docker Desktop).
 *   • Judge0 CE runs each submission in an isolated sandbox with CPU/memory/time
 *     limits, network disabled, and a read-only filesystem.
 *   • The free RapidAPI tier is sufficient for local dev and small teams.
 *   • Self-hosting Judge0 (docker-compose) is straightforward for production.
 *
 * Env vars (see .env.example):
 *   JUDGE0_RAPIDAPI_KEY   — RapidAPI key (required when using RapidAPI host)
 *   JUDGE0_URL            — base URL (default: https://judge0-ce.p.rapidapi.com)
 *   JUDGE0_RAPIDAPI_HOST  — RapidAPI host header
 *   EXEC_TIMEOUT_SEC      — wall-clock timeout in seconds (default: 5)
 *   EXEC_MEMORY_KB        — memory limit in KB (default: 131072 = 128 MB)
 *   EXEC_MAX_OUTPUT_BYTES — truncate stdout/stderr above this (default: 102400 = 100 KB)
 */

const https = require('https');
const http  = require('http');

// Judge0 language IDs — https://ce.judge0.com/languages/
const LANGUAGE_IDS = {
    javascript: 63,  // Node.js 12.14.0
    python:     71,  // Python 3.8.1
    java:       62,  // Java OpenJDK 13.0.1
    cpp:        54,  // C++ (GCC 9.2.0)
};

const JUDGE0_URL    = process.env.JUDGE0_URL           || 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY  = process.env.JUDGE0_RAPIDAPI_KEY  || '';
const RAPIDAPI_HOST = process.env.JUDGE0_RAPIDAPI_HOST || 'judge0-ce.p.rapidapi.com';
const TIMEOUT_SEC   = parseInt(process.env.EXEC_TIMEOUT_SEC      || '5',      10);
const MEMORY_KB     = parseInt(process.env.EXEC_MEMORY_KB         || '131072', 10);
const MAX_BYTES     = parseInt(process.env.EXEC_MAX_OUTPUT_BYTES  || '102400', 10);

function truncate(str, maxBytes) {
    if (!str) return '';
    if (Buffer.byteLength(str, 'utf8') <= maxBytes) return str;
    return Buffer.from(str, 'utf8').slice(0, maxBytes).toString('utf8') + '\n... [output truncated]';
}
function b64encode(str) { return Buffer.from(str || '', 'utf8').toString('base64'); }
function b64decode(str) { return str ? Buffer.from(str, 'base64').toString('utf8') : ''; }

function request(method, url, body, headers) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const isHttps = u.protocol === 'https:';
        const bodyStr = body ? JSON.stringify(body) : null;
        const options = {
            hostname: u.hostname,
            port:     u.port || (isHttps ? 443 : 80),
            path:     u.pathname + u.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            },
        };
        const transport = isHttps ? https : http;
        const req = transport.request(options, (res) => {
            let data = '';
            res.on('data', (c) => { data += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Non-JSON response: ' + data.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.setTimeout((TIMEOUT_SEC + 10) * 1000, () => req.destroy(new Error('Request timed out')));
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function pollToken(token, rapidHeaders) {
    const pollUrl = `${JUDGE0_URL}/submissions/${token}?base64_encoded=true&fields=status,stdout,stderr,compile_output,exit_code,time,memory`;
    const maxAttempts = Math.ceil((TIMEOUT_SEC + 5) * 2);
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const result = await request('GET', pollUrl, null, rapidHeaders);
        if (result.status && result.status.id >= 3) return result;
    }
    throw new Error('Execution timed out waiting for Judge0 result');
}

async function executeCode({ language, code, stdin = '' }) {
    const langId = LANGUAGE_IDS[language];
    if (!langId) throw new Error(`Unsupported language: ${language}`);

    if (!RAPIDAPI_KEY) {
        return {
            stdout: '',
            stderr: [
                'Code execution is not configured.',
                '',
                'To enable it, add your RapidAPI key for Judge0 CE to .env:',
                '  JUDGE0_RAPIDAPI_KEY=your_key_here',
                '',
                'Get a free key at: https://rapidapi.com/judge0-official/api/judge0-ce',
                '',
                'Or run a self-hosted Judge0 instance and set JUDGE0_URL=http://localhost:2358',
            ].join('\n'),
            exitCode: 1,
            time: '0.000',
        };
    }

    const rapidHeaders = {
        'X-RapidAPI-Key':  RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
    };

    const submission = await request(
        'POST',
        `${JUDGE0_URL}/submissions?base64_encoded=true&wait=false`,
        {
            language_id:    langId,
            source_code:    b64encode(code),
            stdin:          b64encode(stdin),
            cpu_time_limit: TIMEOUT_SEC,
            memory_limit:   MEMORY_KB,
        },
        rapidHeaders
    );

    if (!submission.token) {
        throw new Error('Judge0 did not return a token: ' + JSON.stringify(submission));
    }

    const result   = await pollToken(submission.token, rapidHeaders);
    const statusId = result.status && result.status.id;
    const statusDesc = (result.status && result.status.description) || 'Unknown';

    let stdout = truncate(b64decode(result.stdout), MAX_BYTES);
    let stderr = truncate(b64decode(result.stderr) || b64decode(result.compile_output), MAX_BYTES);

    if (statusId === 5) stderr = '[Time Limit Exceeded — ' + TIMEOUT_SEC + 's]\n' + stderr;
    else if (statusId === 6) stderr = '[Compile Error]\n' + stderr;
    else if (statusId >= 7 && statusId <= 12) stderr = '[Runtime Error — ' + statusDesc + ']\n' + stderr;
    else if (statusId === 13) stderr = '[Internal Error]\n' + stderr;

    return {
        stdout,
        stderr,
        exitCode: result.exit_code != null ? result.exit_code : (statusId === 3 ? 0 : 1),
        time:     result.time || '0.000',
    };
}

module.exports = { executeCode, LANGUAGE_IDS };
