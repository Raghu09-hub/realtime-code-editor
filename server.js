const express = require('express');
const app = express();

const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const ACTIONS = require('./src/Actions');
const { executeCode } = require('./server/services/executor');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
    },
});

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' }));

// Rate limit: 10 run requests per minute per IP
const runLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many run requests. Please wait a minute and try again.' },
});

// ── In-memory room state ──────────────────────────────────────────────────────
// roomId → { code: string, language: string }
const roomState = {};

// socketId → username
const userSocketMap = {};

function getAllConnectedClients(roomId) {
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => ({
        socketId,
        username: userSocketMap[socketId],
    }));
}

// ── REST — /api/run ───────────────────────────────────────────────────────────
app.post('/api/run', runLimiter, async (req, res) => {
    const { language, code, stdin = '', roomId } = req.body;

    // Validate
    const SUPPORTED = ['javascript', 'python', 'java', 'cpp'];
    if (!language || !SUPPORTED.includes(language)) {
        return res.status(400).json({ error: `Unsupported language: ${language}. Must be one of: ${SUPPORTED.join(', ')}` });
    }
    if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'code is required' });
    }
    const MAX_CODE_SIZE = 64 * 1024; // 64 KB
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE) {
        return res.status(400).json({ error: 'Code exceeds maximum allowed size (64 KB)' });
    }

    // Broadcast run-started to room so everyone sees "Running…"
    if (roomId) {
        io.to(roomId).emit(ACTIONS.RUN_STARTED, { language });
    }

    try {
        const result = await executeCode({ language, code, stdin });

        // Broadcast result to everyone in the room
        if (roomId) {
            io.to(roomId).emit(ACTIONS.RUN_RESULT, result);
        }

        return res.json(result);
    } catch (err) {
        console.error('[/api/run] Execution error:', err.message);
        const errResult = {
            stdout: '',
            stderr: `Execution service error: ${err.message}`,
            exitCode: 1,
            time: '0.000',
        };

        if (roomId) {
            io.to(roomId).emit(ACTIONS.RUN_RESULT, errResult);
        }

        return res.status(500).json(errResult);
    }
});

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('socket connected:', socket.id);

    // Join room
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);

        // Initialize room state if first joiner
        if (!roomState[roomId]) {
            roomState[roomId] = { code: '', language: 'javascript' };
        }

        const clients = getAllConnectedClients(roomId);

        // Notify all members (including the new joiner) of updated client list
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    // Broadcast code changes to the rest of the room
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        if (roomState[roomId]) roomState[roomId].code = code;
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // Sync current code + language to a newly joined socket
    socket.on(ACTIONS.SYNC_CODE, ({ socketId, roomId }) => {
        const state = roomState[roomId] || { code: '', language: 'javascript' };
        // Send current code
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code: state.code });
        // Send current language
        io.to(socketId).emit(ACTIONS.SYNC_LANGUAGE, { language: state.language });
    });

    // Language change: broadcast to others, update room state
    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
        if (roomState[roomId]) roomState[roomId].language = language;
        // Broadcast to everyone ELSE in the room (not back to emitter)
        socket.to(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });

    // Disconnect
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });

        delete userSocketMap[socket.id];
        socket.leave();
    });

    // Clean up room state when room becomes empty
    socket.on('disconnect', () => {
        // Check all rooms; remove state when last user leaves
        Object.keys(roomState).forEach((roomId) => {
            const room = io.sockets.adapter.rooms.get(roomId);
            if (!room || room.size === 0) {
                delete roomState[roomId];
            }
        });
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`CodeSync server listening on port ${PORT}`));
