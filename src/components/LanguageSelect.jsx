import React from 'react';
import { LANGUAGES } from '../languages';

/**
 * LanguageSelect — Dropdown + Run button toolbar above the editor.
 *
 * Props:
 *   language   {string}   currently selected language id
 *   onChange   {fn}       called with new language id when user picks
 *   onRun      {fn}       called when Run button clicked
 *   isRunning  {boolean}  disables Run button while code executes
 */
function LanguageSelect({ language, onChange, onRun, isRunning }) {
    return (
        <div className="editorToolbar">
            <div className="toolbarLeft">
                <span className="toolbarLabel">Language</span>
                <div className="selectWrapper">
                    <select
                        id="languageSelect"
                        className="langSelect"
                        value={language}
                        onChange={(e) => onChange(e.target.value)}
                        disabled={isRunning}
                        aria-label="Select programming language"
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.id} value={lang.id}>
                                {lang.label}
                            </option>
                        ))}
                    </select>
                    {/* custom chevron icon */}
                    <svg className="selectChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>

            <button
                id="runCodeBtn"
                className={`btn runBtn${isRunning ? ' running' : ''}`}
                onClick={onRun}
                disabled={isRunning}
                aria-label="Run code"
            >
                {isRunning ? (
                    <>
                        <span className="runSpinner" />
                        Running…
                    </>
                ) : (
                    <>
                        <svg className="runIcon" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Run
                    </>
                )}
            </button>
        </div>
    );
}

export default LanguageSelect;
