#  Apple Notes — Self-Hosted

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20WAL-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)

A lightweight, private, and distraction-free self-hosted web app inspired by **Apple Notes** and **iCloud Notes**. Designed with the authentic macOS dark/light aesthetic, buttery-smooth rich text editing, and zero-maintenance architecture.

Runs effortlessly in a single lightweight Docker container (~50MB RAM) on your **Synology NAS**, **Unraid**, **TrueNAS**, **Raspberry Pi**, or any VPS.

---

## ✨ Features

- ** Authentic Apple Notes Design**: Familiar 3-column layout (Folders, Note Cards, Full Writing Canvas) with Apple's iconic warm yellow/gold accent (`#e5a93c`).
- **🌙 Dark & Light Themes**: Default slate dark mode (`#1c1c1e`) and clean Apple light mode with 1-click toggle.
- **⚡️ Rich Text Editing (TipTap)**:
  - **Checklists / To-Dos**: Interactive round checkboxes with smooth completion strike-through.
  - **Tables**: Insert tables, add/delete rows and columns.
  - **Typography (Aa)**: Title (H1), Heading (H2), Subheading (H3), Body, and Monospaced code blocks.
  - **Styles**: Bold, Italic, Underline, Strikethrough, Blockquotes, Ordered and Bullet lists.
- **🖼️ Images & Attachments**: Paste images directly from your clipboard (`Cmd+V`) or drag & drop files right onto the editor.
- **💾 Instant Auto-Save**: Debounced background persistence with visual save indicator (`All changes saved`).
- **📌 Pinned Notes**: Keep your most important notes pinned to the top of the list.
- **📁 Folder Organization**: Organize notes into custom folders, browse "All Notes", or restore from "Recently Deleted" (Trash).
- **🔍 Fast Search**: Instant search matching both note titles and full body content.
- **📤 Export & Sharing**:
  - Export individual notes to **Markdown (`.md`)**, **HTML**, **Plain Text (`.txt`)**, or **Print / Save as PDF**.
  - One-click full database backup export and restore via JSON.
- **📱 Responsive & Mobile-Ready**: Sliding panes inspired by iOS / iPadOS for phones and tablets.
- **⌨️ Keyboard Shortcuts**: `Cmd+N` (new note), `Cmd+F` (search), `Cmd+\` (toggle sidebar), `Cmd+B` / `Cmd+I` / `Cmd+U` formatting shortcuts.
- **🔒 Private & Self-Hosted**: 100% your data. Stored locally in a single SQLite database with WAL mode enabled. No telemetry, no external accounts, no cloud dependencies.

---

## 🚀 Quick Start with Docker

### Using Docker Compose (Recommended)

1. Create a `docker-compose.yml` file:

```yaml
services:
  apple-notes:
    image: ghcr.io/username/apple-notes:latest # or build: .
    container_name: apple-notes
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
```

2. Start the container:

```bash
docker compose up -d
```

3. Open your browser and navigate to:
```
http://localhost:3000
```
*(or your NAS/server IP, e.g. `http://192.168.1.100:3000`)*

---

### Building from Source with Docker

```bash
# Clone the repository
git clone https://github.com/your-username/apple-notes-self-hosted.git
cd apple-notes-self-hosted

# Build and run with Docker Compose
docker compose up --build -d
```

---

## 🖥️ NAS Setup Guides

### Synology NAS (Container Manager)
1. Open **Container Manager** on DSM.
2. Go to **Project** → click **Create**.
3. Name the project `apple-notes`, set path to `/docker/apple-notes`.
4. Paste the `docker-compose.yml` content.
5. Create a `data` folder inside `/docker/apple-notes/data`.
6. Click **Next** and **Done**. Access via `http://<SYNOLOGY-IP>:3000`.

### Unraid
1. In the Unraid Docker tab, select **Add Container**.
2. Set Name: `apple-notes`
3. Repository: `apple-notes:latest` (or built image)
4. Host Port: `3000` → Container Port: `3000`
5. Host Path: `/mnt/user/appdata/apple-notes` → Container Path: `/app/data`
6. Click **Apply**.

---

## 🛠️ Local Development (Without Docker)

### Prerequisites
- Node.js 20+ or 22+
- npm

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Run in Development Mode
```bash
npm run dev
```
- Frontend dev server (Vite): `http://localhost:5173`
- Backend API server (Express): `http://localhost:3000`

### 3. Production Build & Run
```bash
npm run build
npm start
```
Serves the unified app on `http://localhost:3000`.

---

## 📦 Data Storage & Backup

All your data is stored in a clean, self-contained directory:

```
./data/
├── notes.db        # SQLite database (tables: folders, notes, indices)
├── notes.db-wal    # Write-Ahead Log for high-performance transactions
└── uploads/        # Pasted images and file attachments
```

### Backups
- **Automatic**: Simply back up the `./data` directory or include it in your NAS backup schedule (Hyper Backup, Restic, Borg, etc.).
- **In-App JSON Backup**: Click the database icon in the top right header to export a `.json` backup file or restore one at any time.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Description |
| :--- | :--- |
| `Cmd / Ctrl + N` | Create a new note |
| `Cmd / Ctrl + F` | Focus search bar |
| `Cmd / Ctrl + \` | Toggle folders sidebar |
| `Cmd / Ctrl + /` | Open keyboard shortcuts help |
| `Cmd / Ctrl + B` | Bold selected text |
| `Cmd / Ctrl + I` | Italic selected text |
| `Cmd / Ctrl + U` | Underline selected text |
| `Cmd / Ctrl + Shift + 9` | Toggle Checklist / To-Do item |
| `Cmd / Ctrl + P` | Print / Save as PDF |
| `Esc` | Clear search / Close modals |

---

## ⚙️ Configuration & Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port the web server listens on |
| `HOST` | `0.0.0.0` | Bind address (`0.0.0.0` for all interfaces) |
| `DATA_DIR` | `./data` (or `/app/data`) | Directory where SQLite DB & uploads are stored |
| `NODE_ENV` | `production` | Environment mode (`development` or `production`) |

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE). You are free to use it personally, modify it, host it, and share it with others.
