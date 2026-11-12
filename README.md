# 📝 Notes — Lightweight Self-Hosted Notes App

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fhuseinm%2Fnotes-2496ED?logo=docker&logoColor=white)](https://github.com/huseinm/notes/pkgs/container/notes)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20WAL-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)

A lightweight, private, and distraction-free self-hosted notes web application inspired by **Apple Notes** and **iCloud Notes**. Built with a clean dark/light aesthetic, buttery-smooth rich text editing, and a zero-maintenance single-container architecture.

Runs effortlessly in a single lightweight Docker container (~50MB RAM) on your **QNAP NAS**, **Synology NAS**, **Unraid**, **TrueNAS**, **Raspberry Pi**, or any Linux server / VPS.

---

## ✨ Features

- **🎨 Clean 3-Pane Interface**: Familiar 3-column layout (Collapsible Folders Sidebar, Note Cards List, and Full Writing Canvas) with warm gold/amber accents (`#e5a93c`) and tabular right-aligned folder counts.
- **🌙 Dark & Light Themes**: Crisp slate dark mode (`#1c1c1e`) by default and high-contrast light mode with instant 1-click toggle and persistent preference.
- **🧠 Smart Dynamic Note Titles**:
  - Write with an explicit title, or leave the title blank and start writing right away—the sidebar automatically uses the first line of your note as the title without forcing annoying `"Untitled Note"` text into your editor.
  - Press `Enter` or `↓` inside the title field to jump directly into the note body.
- **⚡️ Rich Text Editing (TipTap)**:
  - **Checklists / To-Dos**: Interactive circular checkboxes with inline text and smooth completion strike-through.
  - **Tables**: Insert dynamic tables, add/delete rows and columns, or remove tables via an intuitive toolbar popover.
  - **Typography (`Aa`)**: Title (`H1`), Heading (`H2`), Subheading (`H3`), Body (`P`), and Monospaced code blocks.
  - **Formatting**: Bold, Italic, Underline, Strikethrough, Blockquotes, Inline Code, Horizontal Dividers, Ordered and Bullet lists.
  - **Live Metadata**: Centered timestamp and automatic word count displayed at the top of every note.
- **🖼️ Images & Attachments**: Paste images directly from your clipboard (`Cmd/Ctrl + V`), drag & drop images into the editor, or upload via the toolbar (up to 20MB per image).
- **💾 Zero-Loss Instant Auto-Save**: Debounced background persistence with immediate flush when switching notes or closing the browser tab, paired with a live save status indicator (`Saved` / `Saving...`).
- **📌 Pinned Notes & Sorting**: Pin important notes to the top of any folder, and sort notes by **Date Modified**, **Date Created**, or **Title**.
- **📁 Folder Organization & Trash**: Organize notes into custom folders, browse **All Notes**, move notes between folders instantaneously, or recover deleted notes from **Recently Deleted** (Trash).
- **🔍 Instant Full-Text Search**: Real-time search (`Cmd/Ctrl + F`) matching both note titles and full body content.
- **📤 Rich Export & Full Database Backups**:
  - Export individual notes to **Markdown (`.md`)** (preserving headings, formatting, checklists `- [x]`, code blocks, and images), **HTML (`.html`)**, **Plain Text (`.txt`)**, or **Print / Save as PDF**.
  - One-click full database **JSON Backup Export & Transactional Restore** directly from the Settings modal.
- **📱 Responsive & Mobile-Ready**: Adaptive pane navigation for phones and tablets.
- **🔒 100% Private & Self-Hosted**: All data is stored locally in a single SQLite database (`WAL` mode enabled for high concurrency) and a local `uploads/` folder. Zero telemetry, zero cloud dependencies, and graceful `SIGTERM`/`SIGINT` container shutdown.

---

## 🚀 Quick Start with Docker

### Option 1: Pull Pre-Built Image from GitHub Container Registry (`ghcr.io`)

Create a `docker-compose.yml` file anywhere on your machine or NAS:

```yaml
services:
  notes:
    image: ghcr.io/huseinm/notes:latest
    container_name: notes
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - DATA_DIR=/app/data
```

Start the container:

```bash
docker compose up -d
```

Open your browser at:
```text
http://localhost:3000
```

### Option 2: Build from Source with Docker Compose

```bash
git clone https://github.com/huseinm/notes.git
cd notes
docker compose up --build -d
```

---

## 🖥️ NAS & Homelab Setup Guides

### QNAP NAS (Container Station)
1. Open **Container Station** on QTS / QuTS hero.
2. Go to **Applications** → click **Create**.
3. Set **Application name** to `notes` and paste the following YAML:
   ```yaml
   services:
     notes:
       image: ghcr.io/huseinm/notes:latest
       container_name: notes
       restart: unless-stopped
       ports:
         - "3000:3000"
       volumes:
         - /share/Container/notes/data:/app/data
       environment:
         - NODE_ENV=production
         - PORT=3000
   ```
4. Click **Validate** and **Create**. Access your notes at `http://<QNAP-IP>:3000`.

### Synology NAS (Container Manager)
1. Open **Container Manager** on DSM.
2. Go to **Project** → click **Create**.
3. Set Project Name to `notes`, select a path (e.g., `/docker/notes`), and paste the `docker-compose.yml` above using `image: ghcr.io/huseinm/notes:latest`.
4. Ensure `/docker/notes/data` is mapped to `/app/data`.
5. Click **Next** and **Done**. Access via `http://<SYNOLOGY-IP>:3000`.

### Unraid
1. In the Unraid **Docker** tab, click **Add Container**.
2. **Name**: `notes`
3. **Repository**: `ghcr.io/huseinm/notes:latest`
4. **Port**: Host `3000` → Container `3000`
5. **Path**: Host `/mnt/user/appdata/notes` → Container `/app/data`
6. Click **Apply**.

### TrueNAS Scale
1. Go to **Apps** → **Discover Apps** → **Custom App**.
2. Set the image repository and tag (`ghcr.io/huseinm/notes:latest`).
3. Forward port `3000` → `3000`.
4. Add a Host Path Volume mounting your dataset path to `/app/data`.

### Health Check Endpoint (Reverse Proxies & Uptime Monitors)
A built-in health check endpoint is available for Docker healthchecks, Nginx Proxy Manager, Traefik, Homepage, or Uptime Kuma:
```http
GET /api/health
```
Returns `200 OK` with `{ "status": "ok", "app": "Notes Self-Hosted", "version": "1.0.0", "timestamp": "..." }`.

---

## 🛠️ Local Development (Without Docker)

### Prerequisites
- **Node.js**: v20+ or v22+
- **npm**: v9+

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Run in Development Mode
Starts both the Express API server (`http://localhost:3000`) and Vite hot-reload server (`http://localhost:5173`):
```bash
npm run dev
```

### 3. Production Build & Start
Compiles the TypeScript + React frontend into `client/dist` and serves both the API and SPA from Express on port `3000`:
```bash
npm run build
npm start
```

---

## 🗂️ Project Architecture

```text
.
├── client/                     # React 18 + TypeScript + Tailwind CSS + TipTap frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Editor/         # TipTapEditor & EditorToolbar (formatting, tables, export)
│   │   │   ├── Modals/         # FolderModal, SettingsModal (JSON backup), ShortcutsModal
│   │   │   ├── Header.tsx      # Top bar (sidebar toggle, save status, theme toggle)
│   │   │   ├── Sidebar.tsx     # Folders navigation, inline creation, tabular counts
│   │   │   └── NotesList.tsx   # Search, sorting, Pinned & Notes cards
│   │   ├── utils/date.ts       # Relative & full timestamp formatters
│   │   ├── api.ts              # Typed REST client
│   │   ├── App.tsx             # 3-pane layout & global keyboard shortcuts
│   │   └── index.css           # ProseMirror typography, circular checklists, scrollbars
├── server/                     # Node.js + Express + better-sqlite3 backend
│   └── src/
│       ├── routes/
│       │   ├── folders.js      # Folder CRUD & note count aggregation
│       │   ├── notes.js        # Note CRUD, search, sorting, pin, trash & restore
│       │   ├── upload.js       # Image upload via Multer (20MB limit, MIME validation)
│       │   └── export.js       # Full JSON database backup & transactional restore
│       ├── db.js               # SQLite WAL initialization, schema & sample note seed
│       └── index.js            # Express server, static asset serving & graceful shutdown
├── data/                       # Persistent volume directory (SQLite DB + uploaded images)
├── Dockerfile                  # Multi-stage Node 22 Alpine production build
└── docker-compose.yml          # One-command container orchestration
```

---

## 📦 Data Storage & Backups

All application state lives inside `./data` (mapped to `/app/data` in Docker):

```text
./data/
├── notes.db        # Primary SQLite database (folders, notes, indices)
├── notes.db-wal    # SQLite Write-Ahead Log
└── uploads/        # Uploaded & pasted note images
```

### How to Back Up
1. **Filesystem / NAS Backup**: Include `./data` in your automated NAS backup jobs (QNAP Hybrid Backup Sync, Synology Hyper Backup, Restic, Borg, Kopia, etc.).
2. **In-App JSON Backup**: Click the **Settings (gear icon)** in the top-right header → **Export Backup**. You can restore from any `.json` backup file using **Restore Backup**.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd / Ctrl + N` | Create a new note |
| `Cmd / Ctrl + F` | Focus & select the search bar |
| `Cmd / Ctrl + \` | Show / hide the left folders sidebar |
| `Cmd / Ctrl + /` | Open keyboard shortcuts reference modal |
| `Enter` or `↓` *(in Title)* | Move cursor from Title input to start of note body |
| `Cmd / Ctrl + B` | Bold selected text |
| `Cmd / Ctrl + I` | Italic selected text |
| `Cmd / Ctrl + U` | Underline selected text |
| `Cmd / Ctrl + Shift + X` | Strikethrough selected text |
| `Cmd / Ctrl + E` | Inline monospace code |
| `Cmd / Ctrl + P` | Print note / Save as PDF |
| `Esc` | Close active dropdown menu or modal |

---

## ⚙️ Configuration & Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port the HTTP server listens on |
| `HOST` | `0.0.0.0` | Network interface bind address |
| `DATA_DIR` | `./data` (`/app/data` in Docker) | Path where `notes.db` and `uploads/` are stored |
| `NODE_ENV` | `production` | Runtime environment (`development` or `production`) |

---

## 📄 License

Licensed under the [MIT License](LICENSE). Free for personal and commercial use, self-hosting, modification, and distribution.
