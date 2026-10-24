import React, { useRef, useState, useCallback } from 'react';

const MIN_HEIGHT = 120;  // px
const DEFAULT_HEIGHT = 240; // px

/**
 * OutputPanel — Resizable panel below the editor showing run results.
 *
 * Props:
 *   result     {{ stdout, stderr, exitCode, time } | null}
 *   isRunning  {boolean}
 *   stdin      {string}
 *   onStdinChange {fn}
 *   onClear    {fn}
 */
function OutputPanel({ result, isRunning, stdin, onStdinChange, onClear }) {
    const [height, setHeight] = useState(DEFAULT_HEIGHT);
    const dragRef = useRef(null);

    // ── Resize drag ─────────────────────────────────────────────────────────
    const onMouseDown = useCallback((e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = height;

        function onMouseMove(ev) {
            // Dragging the top handle upward increases height
            const delta = startY - ev.clientY;
            setHeight(Math.max(MIN_HEIGHT, startH + delta));
        }
        function onMouseUp() {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, [height]);

    // ── Render output lines ──────────────────────────────────────────────────
    function renderOutput() {
        if (isRunning) {
            return (
                <div className="outputRunning">
                    <span className="runSpinner" />
                    <span>Running…</span>
                </div>
            );
        }
        if (!result) {
            return <span className="outputPlaceholder">Output will appear here after you press Run ▶</span>;
        }

        return (
            <>
                {/* stdout */}
                {result.stdout && (
                    <pre className="outputText">{result.stdout}</pre>
                )}

                {/* stderr / compile errors */}
                {result.stderr && (
                    <pre className="outputText outputError">{result.stderr}</pre>
                )}

                {/* nothing at all */}
                {!result.stdout && !result.stderr && (
                    <span className="outputPlaceholder">(no output)</span>
                )}

                {/* meta */}
                <div className="outputMeta">
                    <span className={`exitBadge${result.exitCode === 0 ? ' exitOk' : ' exitErr'}`}>
                        exit {result.exitCode}
                    </span>
                    <span className="timeBadge">⏱ {result.time}s</span>
                </div>
            </>
        );
    }

    return (
        <div className="outputPanel" style={{ height }}>
            {/* Drag handle */}
            <div
                ref={dragRef}
                className="outputResizeHandle"
                onMouseDown={onMouseDown}
                title="Drag to resize"
            />

            {/* Header */}
            <div className="outputHeader">
                <span className="outputTitle">Output</span>

                <div className="outputActions">
                    {/* stdin toggle / input */}
                    <div className="stdinWrapper">
                        <label htmlFor="stdinInput" className="stdinLabel">stdin</label>
                        <textarea
                            id="stdinInput"
                            className="stdinInput"
                            value={stdin}
                            onChange={(e) => onStdinChange(e.target.value)}
                            placeholder="Optional stdin…"
                            rows={1}
                            spellCheck={false}
                        />
                    </div>
                    <button
                        id="clearOutputBtn"
                        className="btn clearBtn"
                        onClick={onClear}
                        disabled={!result && !stdin}
                        aria-label="Clear output"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="outputBody" id="outputBody">
                {renderOutput()}
            </div>
        </div>
    );
}

export default OutputPanel;
