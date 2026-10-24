import React, { useState, useRef, useEffect, useCallback } from 'react';
import Client from '../components/Client';
import Editor from '../components/Editor';
import LanguageSelect from '../components/LanguageSelect';
import OutputPanel from '../components/OutputPanel';
import toast from 'react-hot-toast';
import { initSocket } from '../socket';
import { useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import ACTIONS from '../Actions.js';
import { DEFAULT_LANGUAGE } from '../languages';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const EditorPage = () => {
    const socketRef   = useRef(null);
    const codeRef     = useRef(null);

    const location    = useLocation();
    const { roomId }  = useParams();
    const reactNavigator = useNavigate();

    const [clients,   setClients]   = useState([]);

    // Language state — drives Editor mode and LanguageSelect display
    const [language,  setLanguage]  = useState(DEFAULT_LANGUAGE.id);
    // Guard flag: true while we're applying a REMOTE language change so we
    // don't re-emit the LANGUAGE_CHANGE event back to the server.
    const applyingRemoteLanguageRef = useRef(false);

    // Output panel state
    const [runResult,  setRunResult]  = useState(null);
    const [isRunning,  setIsRunning]  = useState(false);
    const [stdin,      setStdin]      = useState('');

    // ── Socket setup ─────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();

            socketRef.current.on('connect_error', (err) => {
                console.error('socket error', err);
                toast.error('Socket connection failed, try again');
                reactNavigator('/');
            });

            // Join room
            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Someone joined → update client list and sync current state to them
            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} joined the room`);
                }
                setClients(clients);

                // Send the new joiner our current code + language
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    socketId,
                    roomId,
                    code: codeRef.current,
                });
            });

            // Someone left
            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left the room`);
                setClients((prev) => prev.filter((c) => c.socketId !== socketId));
            });

            // Run-started broadcast (someone else hit Run)
            socketRef.current.on(ACTIONS.RUN_STARTED, () => {
                setIsRunning(true);
                setRunResult(null);
            });

            // Run-result broadcast
            socketRef.current.on(ACTIONS.RUN_RESULT, (result) => {
                setIsRunning(false);
                setRunResult(result);
            });
        };

        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.RUN_STARTED);
                socketRef.current.off(ACTIONS.RUN_RESULT);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Language change (initiated by THIS user) ─────────────────────────────
    const handleLanguageChange = useCallback((newLang) => {
        setLanguage(newLang);
        // Emit to server so others receive LANGUAGE_CHANGE
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, { roomId, language: newLang });
        }
    }, [roomId]);

    // ── Language change (received from a REMOTE user) ────────────────────────
    // Called by Editor when it receives LANGUAGE_CHANGE or SYNC_LANGUAGE from socket.
    // We set a guard flag so our setLanguage → language prop change doesn't re-emit.
    const handleRemoteLanguageChange = useCallback((remoteLang) => {
        applyingRemoteLanguageRef.current = true;
        setLanguage(remoteLang);
        // Reset guard after state update propagates
        setTimeout(() => { applyingRemoteLanguageRef.current = false; }, 0);
    }, []);

    // ── Run code ─────────────────────────────────────────────────────────────
    const handleRun = useCallback(async () => {
        const code = codeRef.current;
        if (!code || code.trim() === '') {
            toast.error('Please write some code before running');
            return;
        }
        setIsRunning(true);
        setRunResult(null);

        try {
            const res = await fetch(`${BACKEND_URL}/api/run`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ language, code, stdin, roomId }),
            });
            const data = await res.json();
            // The server already broadcasts RUN_RESULT via socket, but we set
            // state here too in case our own socket event arrives slightly late.
            setRunResult(data);
        } catch (err) {
            console.error('[handleRun] Fetch failed:', err);
            const errResult = {
                stdout:   '',
                stderr:   `Network error: ${err.message}`,
                exitCode: 1,
                time:     '0.000',
            };
            setRunResult(errResult);
        } finally {
            setIsRunning(false);
        }
    }, [language, stdin, roomId]);

    // ── Sidebar actions ──────────────────────────────────────────────────────
    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied to clipboard');
        } catch {
            toast.error('Unable to copy room ID');
        }
    }

    function leaveRoom() {
        toast.success('You left the room');
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <div className="brandHeader">
                            <div className="brandLogo">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                    fill="none" stroke="currentColor" strokeWidth="2.2"
                                    strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="16 18 22 12 16 6" />
                                    <polyline points="8 6 2 12 8 18" />
                                </svg>
                            </div>
                            <div className="brandMeta">
                                <h2 className="brandTitle">CodeSync</h2>
                                <span className="brandBadge">Realtime Editor</span>
                            </div>
                        </div>
                    </div>

                    {/* Connected clients */}
                    <div className="clientList">
                        {clients.map((client) => (
                            <Client key={client.socketId} username={client.username} />
                        ))}
                    </div>
                </div>

                <div className="buttonWrap">
                    <button className="btn copyBtn" onClick={copyRoomId}>Copy Room ID</button>
                    <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
                </div>
            </div>

            {/* ── Main area: toolbar + editor + output ────────────────── */}
            <div className="editorWrap">
                <LanguageSelect
                    language={language}
                    onChange={handleLanguageChange}
                    onRun={handleRun}
                    isRunning={isRunning}
                />

                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    onCodeChange={(code) => { codeRef.current = code; }}
                    language={language}
                    onLanguageChangeRemote={handleRemoteLanguageChange}
                />

                <OutputPanel
                    result={runResult}
                    isRunning={isRunning}
                    stdin={stdin}
                    onStdinChange={setStdin}
                    onClear={() => { setRunResult(null); setStdin(''); }}
                />
            </div>
        </div>
    );
};

export default EditorPage;