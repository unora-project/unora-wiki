# Unora Wiki

A community-editable game wiki for Unora, built with React + Vite and powered by [Sveltia CMS](https://sveltiacms.app/) for contributor-friendly editing.

**Live site:** https://nismosan.github.io/unora-wiki/
**CMS Admin:** https://nismosan.github.io/unora-wiki/admin/

---

## For Contributors

You don't need to know code or Git to contribute. All content can be edited through the CMS admin panel.

### Editing Content

1. Go to https://nismosan.github.io/unora-wiki/admin/
2. Sign in with your GitHub account
3. Pick a collection from the sidebar (Lore, Patch Notes, Classes, Hunting Areas, etc.)
4. Click an entry to edit it, or click "New" to create one
5. Make your changes and click **Save** - the site will rebuild automatically

### What You Can Edit

| Collection | What It Is |
|---|---|
| **Lore** | Story and world lore pages (Markdown) |
| **Patch Notes** | Game update notes (Markdown) |
| **Classes** | Class descriptions, mastering requirements, stat caps |
| **Professions** | Profession descriptions, info cards, tips |
| **Goddesses** | Goddess descriptions, locations, blessing bonuses |
| **Hunting Areas** | Area descriptions, leaders, shops, sub-areas |
| **Hunting Grounds Config** | Area list, tier settings, chart data |
| **Bosses** | Boss names, levels, locations, drops |
| **Blessings** | Divine blessings with costs and effects |
| **NPCs** | Town NPCs with roles and coordinates |
| **Mounts / Cloaks** | Mount and cloak entries |
| **Skills / Spells** | Class skills and spells |
| **Lookup Tables** | Town names, area names, map variants |

> **Note:** Equipment data (4,695+ items) is managed separately via a CSV conversion script and isn't currently editable through the CMS.

---

## For Developers

### Tech Stack

- **React 19** + **TypeScript** — UI framework
- **Vite 8** — Build tool and dev server
- **React Router 7** — Hash-based routing (works on GitHub Pages)
- **Tailwind CSS 4** — Styling
- **TanStack Table** — Data tables
- **react-markdown** + **remark-gfm** — Markdown rendering
- **Sveltia CMS** — Git-backed CMS for content editing
- **Cloudflare Worker** — OAuth proxy for GitHub authentication
- **GitHub Pages** + **GitHub Actions** — Hosting and auto-deploy

### Project Structure

```
unora-wiki/
├── public/
│   └── admin/              # Sveltia CMS admin panel
│       ├── index.html
│       └── config.yml      # CMS collection definitions
├── src/
│   ├── content/            # Editable content (source of truth)
│   │   ├── lore/           # Markdown lore pages
│   │   ├── patch-notes/    # Markdown patch notes
│   │   ├── quests/         # Markdown quest pages
│   │   ├── metadata/       # YAML metadata (classes, professions, gods, hunting)
│   │   └── data/           # Per-item YAML files (bosses, skills, spells, etc.)
│   ├── data/               # Generated JSON consumed by the app
│   │   ├── metadata/       # Built from src/content/metadata/ (gitignored)
│   │   └── equipment/      # Equipment JSON (from CSV conversion)
│   ├── pages/              # React route components
│   ├── components/         # Shared UI components
│   └── lib/                # Utilities (markdown preprocessing, search)
├── scripts/
│   ├── build-content.ts    # Converts YAML → JSON at build time
│   └── convert-csv.ts      # Converts equipment CSVs from external repo
└── .github/workflows/
    └── deploy.yml          # Auto-deploys to GitHub Pages on push to master
```

### Content Pipeline

Content lives in `src/content/` as YAML/Markdown. At build time, [scripts/build-content.ts](scripts/build-content.ts) converts it to JSON in `src/data/`, which the React app imports directly via Vite.

- **YAML metadata** (classes, professions, gods, hunting areas) → merged into object-keyed JSON
- **Per-item YAML data** (bosses, skills, spells, NPCs, etc.) → merged into JSON arrays
- **Markdown content** (lore, patch notes) → loaded via `import.meta.glob` at build time
- **Equipment CSVs** → converted to JSON via `scripts/convert-csv.ts` (separate pipeline)

### Running Locally

```bash
# Install dependencies
npm install

# Run dev server (runs build-content first, then Vite)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Rebuild content JSON only (without starting the dev server)
npm run build-content
```

The dev server runs at http://localhost:5173/unora-wiki/.

### Deployment

Pushes to `master` trigger [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which:

1. Installs dependencies
2. Runs `build-content.ts` to generate JSON from YAML
3. Runs `vite build` to produce the static site
4. Deploys `dist/` to GitHub Pages

---

## CMS Setup (One-Time)

The CMS authenticates contributors via GitHub OAuth, proxied through a free Cloudflare Worker. If you fork this repo, you'll need to set up your own OAuth proxy:

### 1. Deploy the Cloudflare Worker

```bash
git clone https://github.com/sveltia/sveltia-cms-auth.git
cd sveltia-cms-auth
npm install
npx wrangler login
npx wrangler deploy
```

Note the worker URL (e.g., `https://sveltia-cms-auth.<your-subdomain>.workers.dev`).

### 2. Create a GitHub OAuth App

Go to https://github.com/settings/applications/new and fill in:
- **Application name:** `<your wiki> CMS`
- **Homepage URL:** your GitHub repo URL
- **Authorization callback URL:** `https://sveltia-cms-auth.<your-subdomain>.workers.dev/callback`

Save the **Client ID** and generate a **Client Secret**.

### 3. Set Worker Secrets

```bash
cd sveltia-cms-auth
echo "YOUR_CLIENT_ID" | npx wrangler secret put GITHUB_CLIENT_ID
echo "YOUR_CLIENT_SECRET" | npx wrangler secret put GITHUB_CLIENT_SECRET
```

### 4. Update CMS Config

Edit [public/admin/config.yml](public/admin/config.yml) and set:

```yaml
backend:
  name: github
  repo: your-user/your-repo
  branch: master
  base_url: https://sveltia-cms-auth.<your-subdomain>.workers.dev
```

---

## License

MIT
