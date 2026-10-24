import React, { useEffect, useRef } from 'react';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';

// Language modes (CodeMirror 5)
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/python/python.js';
import 'codemirror/mode/clike/clike.js';   // handles C++ and Java via mime types

// Editor addons
import 'codemirror/addon/edit/closetag.js';
import 'codemirror/addon/edit/closebrackets.js';

import ACTIONS from '../Actions';
import { LANGUAGE_MAP, DEFAULT_LANGUAGE } from '../languages';

/**
 * Editor — CodeMirror 5 collaborative editor.
 *
 * Props:
 *   socketRef      {React.MutableRefObject}  socket.io client ref
 *   roomId         {string}
 *   onCodeChange   {fn(code)}  called on every local keystroke to keep parent in sync
 *   language       {string}    language id (e.g. 'javascript')
 *   onLanguageChangeRemote {fn(language)} callback when a remote LANGUAGE_CHANGE arrives
 *                             (parent drives state; editor just applies the mode)
 */
function Editor({ socketRef, roomId, onCodeChange, language, onLanguageChangeRemote }) {
    const editorRef = useRef(null);

    // Track the last template we inserted so we can detect "untouched template" content
    const lastTemplateRef = useRef(DEFAULT_LANGUAGE.template);

    // ── Initialize CodeMirror once ───────────────────────────────────────────
    useEffect(() => {
        editorRef.current = CodeMirror.fromTextArea(
            document.getElementById('realTimeEditor'),
            {
                mode:             DEFAULT_LANGUAGE.cmMode,
                theme:            'dracula',
                lineNumbers:      true,
                autoCloseTags:    true,
                autoCloseBrackets: true,
                indentUnit:       4,
                tabSize:          4,
                indentWithTabs:   false,
                lineWrapping:     false,
            }
        );

        // Insert the default Hello World template on init
        editorRef.current.setValue(DEFAULT_LANGUAGE.template);
        lastTemplateRef.current = DEFAULT_LANGUAGE.template;

        // Broadcast every local change to server (skip setValue-driven changes)
        editorRef.current.on('change', (instance, changes) => {
            const { origin } = changes;
            const code = instance.getValue();
            onCodeChange(code);

            if (origin !== 'setValue') {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code });
            }
        });

        return () => {
            // Clean up CodeMirror instance on unmount
            if (editorRef.current) {
                editorRef.current.toTextArea();
                editorRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Apply remote language mode when `language` prop changes ─────────────
    useEffect(() => {
        if (!editorRef.current) return;

        const langCfg = LANGUAGE_MAP[language] || DEFAULT_LANGUAGE;

        // Switch CodeMirror mode without recreating the editor
        editorRef.current.setOption('mode', langCfg.cmMode);

        // Decide whether to insert the new language's template:
        // Only if the editor is empty OR still contains the PREVIOUS language's untouched template.
        const currentCode = editorRef.current.getValue();
        const isEmpty    = currentCode.trim() === '';
        const wasTemplate = currentCode === lastTemplateRef.current;

        if (isEmpty || wasTemplate) {
            editorRef.current.setValue(langCfg.template);
            lastTemplateRef.current = langCfg.template;
        }
    }, [language]);

    // ── Listen for remote CODE_CHANGE ────────────────────────────────────────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on(ACTIONS.CODE_CHANGE, ({ code }) => {
            if (code !== null && editorRef.current) {
                editorRef.current.setValue(code);
            }
        });

        return () => { socket.off(ACTIONS.CODE_CHANGE); };
    }, [socketRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Listen for remote LANGUAGE_CHANGE (avoid re-emit loop) ──────────────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on(ACTIONS.LANGUAGE_CHANGE, ({ language: remoteLang }) => {
            // Notify parent; parent updates its state, which flows back as the
            // `language` prop — we guard against re-emitting by only emitting
            // on user-initiated changes (done in EditorPage.handleLanguageChange).
            if (onLanguageChangeRemote) onLanguageChangeRemote(remoteLang);
        });

        return () => { socket.off(ACTIONS.LANGUAGE_CHANGE); };
    }, [socketRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Listen for SYNC_LANGUAGE (initial join) ───────────────────────────────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on(ACTIONS.SYNC_LANGUAGE, ({ language: syncLang }) => {
            if (onLanguageChangeRemote) onLanguageChangeRemote(syncLang);
        });

        return () => { socket.off(ACTIONS.SYNC_LANGUAGE); };
    }, [socketRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="editorContainer">
            <textarea id="realTimeEditor" />
        </div>
    );
}

export default Editor;