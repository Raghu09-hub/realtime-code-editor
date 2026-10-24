const ACTIONS = {
    JOIN: 'join',
    JOINED: 'joined',
    SYNC_CODE: 'sync-code',
    CODE_CHANGE: 'code-change',
    LEAVE: 'leave',
    DISCONNECTED: 'disconnected',

    // Language sync
    LANGUAGE_CHANGE: 'language-change',
    SYNC_LANGUAGE: 'sync-language',

    // Code execution
    RUN_STARTED: 'run-started',
    RUN_RESULT: 'run-result',
};

module.exports = ACTIONS;
