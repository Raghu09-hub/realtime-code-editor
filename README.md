# CodeSync — Realtime Collaborative Code Editor

A browser-based collaborative code editor where multiple users can join a room, write code together in real-time, choose a programming language, run it, and see the output — all synced live via Socket.io.

---

## Features

| Feature | Details |
|---|---|
| 🔄 Real-time collaboration | Code changes sync instantly to all users in the room via Socket.io |
| 🌐 Language switcher | C++, Java, Python, JavaScript — synced across the room |
| ▶ Code execution | Sandboxed via Judge0 CE (RapidAPI) with 5s timeout, 128 MB memory limit, 100 KB output cap |
| 📤 Output panel | Shows stdout, stderr/compile errors, exit code, execution time; resizable |
| 📥 stdin support | Optional stdin textarea sent with each run |
| 🚦 Rate limiting | 10 run requests per minute per IP |
| 👥 Live presence | Avatars of everyone in the room; join/leave toasts |

---

## Tech Stack

- **Frontend**: React 19, CodeMirror 5, Socket.io-client
- **Backend**: Node.js, Express 5, Socket.io 4
- **Execution sandbox**: [Judge0 CE](https://github.com/judge0/judge0) via RapidAPI (or self-hosted)

---

## Project Structure

```
realtime-editor/
├── server.js                      # Express + Socket.io server
├── server/
│   └── services/
│       └── executor.js            # Judge0 code execution service
├── src/
│   ├── Actions.js                 # Socket event name constants
│   ├── languages.js               # Language configs + Hello World templates
│   ├── socket.js                  # Socket.io client factory
│   ├── components/
│   │   ├── Client.jsx             # Avatar + username sidebar item
│   │   ├── Editor.jsx             # CodeMirror 5 editor with language switching
│   │   ├── LanguageSelect.jsx     # Dropdown + Run button toolbar
│   │   └── OutputPanel.jsx        # Resizable output panel
│   └── pages/
│       ├── Home.js                # Landing / join-room page
│       └── Editorpage.js          # Main editor page (wires everything)
├── .env                           # Local environment variables (git-ignored)
└── .env.example                   # Template — copy to .env and fill in values
```

---

## Setup

### 1. Install dependencies

```bash
cd realtime-editor
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Description |
|---|---|
| `REACT_APP_BACKEND_URL` | URL of the backend (default: `http://localhost:5000`) |
| `JUDGE0_RAPIDAPI_KEY` | RapidAPI key for Judge0 CE (**required for code execution**) |
| `JUDGE0_URL` | Judge0 base URL (leave default for RapidAPI; change for self-hosted) |
| `EXEC_TIMEOUT_SEC` | Execution timeout in seconds (default: `5`) |
| `EXEC_MEMORY_KB` | Memory limit in KB (default: `131072` = 128 MB) |
| `EXEC_MAX_OUTPUT_BYTES` | Max stdout/stderr size before truncation (default: `102400` = 100 KB) |

#### Getting a Judge0 RapidAPI key (free tier)

1. Go to <https://rapidapi.com/judge0-official/api/judge0-ce>
2. Sign up / log in → click **Subscribe to Test** → choose the **Basic** (free) plan
3. Copy your `X-RapidAPI-Key` into `.env` as `JUDGE0_RAPIDAPI_KEY`

#### Self-hosting Judge0 (optional)

```bash
# Requires Docker & docker-compose
git clone https://github.com/judge0/judge0.git
cd judge0
cp judge0.conf.example judge0.conf
docker-compose up -d
```

Then set in `.env`:
```
JUDGE0_URL=http://localhost:2358
JUDGE0_RAPIDAPI_KEY=   # leave blank for self-hosted
```

### 3. Run the development servers

**Terminal 1 — Backend (Socket.io + API):**
```bash
cd realtime-editor
npm run server:dev     # uses nodemon; auto-restarts on changes
```

**Terminal 2 — Frontend (React):**
```bash
cd realtime-editor
npm start
```

The app opens at <http://localhost:3000>.

---

## Testing with Two Browser Tabs

This is the recommended way to verify all features end-to-end.

### Language sync

1. Open <http://localhost:3000> in **Tab A**. Enter a username and click **New Room** → **Join**.
2. Copy the Room ID → open <http://localhost:3000> in **Tab B**. Paste the Room ID, enter a different username → **Join**.
3. In Tab A, pick **Python** from the language dropdown.
4. ✅ Tab B should immediately switch to Python, and the Hello World Python template should appear (if the editor was showing the previous template or was empty).

### Code sync

1. Type code in Tab A → watch it appear live in Tab B and vice versa.

### Run + Output sync

1. Make sure `JUDGE0_RAPIDAPI_KEY` is set in `.env` and the server is restarted.
2. In Tab A, click **▶ Run**.
3. ✅ Both Tab A and Tab B show **"Running…"** immediately.
4. ✅ Both tabs show the same output (stdout, stderr, exit code, time) when execution finishes.

### stdin

1. Type `Alice` in the stdin field in Tab A.
2. Write a Python script that reads stdin: `print("Hello", input())`
3. Click **Run** → output should read `Hello Alice`.

### Rate limit

1. Click **Run** more than 10 times within a minute → you'll see a rate-limit error in the output.

---

## Socket Events Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join` | client → server | `{ roomId, username }` | Join a room |
| `joined` | server → client | `{ clients, username, socketId }` | Someone joined |
| `disconnected` | server → client | `{ socketId, username }` | Someone left |
| `code-change` | both | `{ roomId?, code }` | Code edit |
| `sync-code` | client → server | `{ socketId, roomId, code }` | Sync code to new joiner |
| `language-change` | both | `{ roomId?, language }` | Language pick |
| `sync-language` | server → client | `{ language }` | Initial language for new joiner |
| `run-started` | server → client | `{ language }` | Execution began |
| `run-result` | server → client | `{ stdout, stderr, exitCode, time }` | Execution finished |

---

## Supported Languages

| Language | Runner | CodeMirror Mode |
|---|---|---|
| JavaScript | Node.js 12 | `javascript` |
| Python | Python 3.8 | `python` |
| Java | OpenJDK 13 (class must be `Main`) | `text/x-java` |
| C++ | GCC 9.2 | `text/x-c++src` |
