# dsh-notepad

> A global notepad behind a tag icon in the DeepSeek Harness composer toolbar — multiline notes, built-in checklists, workspace attribution, double-click to add, and one-click insert into the prompt.

[![DSH](https://img.shields.io/badge/DSH-web-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)
[![license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

English · [中文](README.md)

---

## Why

Long agent sessions produce fragments you want to keep: a decision, a snippet, a follow-up task for another project. Opening a separate app breaks the flow. `dsh-notepad` keeps one pale-yellow scratchpad inside the composer, shared by every conversation in the browser.

## Features

- **Global singleton** — one notepad for the whole Web host, not one per session. Close the panel; everything is still there when you reopen it.
- **Composer-native entry** — a tag icon in the composer tool row (`conversation.input.left`). Idle state has no background or border; the icon highlights only while the panel is open.
- **Draggable and resizable** — drag the header to move; drag the **right edge** for width, the **bottom edge** for height, or the corner for both. Geometry is remembered per browser.
- **Multiline by default** — every note is an auto-growing editor: long paragraphs wrap and the box grows with the real line count instead of truncating to one line.
- **Built-in checklists** — click the circle on any note to turn it into a todo; click again to toggle done/undone. The plugin stores the state, so there is **no `- [ ]` prefix to type**; only insertion writes `- [ ]` / `- [x]`.
- **Double-click to add** — double-clicking empty paper adds a note and focuses it; the header `+` does the same.
- **Workspace attribution** — each row keeps the **workspace title** its session belonged to (shown as a tag); a session with no workspace falls back to “当前对话”.
- **Insert one / insert all** — push the last note, or every note, into the current draft through the host input actions (`insertText`, revision-guarded), without sending.
- **In-page confirm dialog** — Clear opens a centered “确定清空所有笔记吗？” with 取消 / 确定 inside the notepad; no browser `confirm()`.
- **No host half** — all state lives in the browser (`localStorage`); the plugin never writes to the session log.

## Install

Local development checkout:

```bash
dsh plugin --profile web add link:/path/to/dsh-notepad
```

From GitHub (pin a commit so the profile stays reproducible):

```bash
dsh plugin --profile web add "github:HYLZJU/dsh-notepad#<commit>"
```

Restart the Web host and refresh the page.

## Usage

1. Click the tag icon in the composer toolbar.
2. `+` adds a row, or **double-click empty paper** to add and focus one; `×` closes the panel.
3. Type. The editor grows line by line; long paragraphs wrap.
4. Click the circle to turn a note into a todo, then click again to toggle it.
5. **插入** inserts the last note; **插入全部** inserts every note, newline-separated.
6. **清空** opens the centered confirmation; only **确定** clears.
7. Drag the header to move; drag the right edge, bottom edge or corner to resize.

### Checklists

| Action | Result |
| --- | --- |
| Click a plain note's circle | becomes a pending todo |
| Click again | marked done |
| Click again | back to pending |

Insertion writes todos as `- [ ] text` / `- [x] text`; plain notes are inserted verbatim.

## Structure

```
dsh-notepad/
├── package.json       # dsh.bundle.patch + dsh.client (platform: web)
├── cordis.patch.yml   # inserts the host row (empty host half)
├── lib/
│   ├── index.js       # host half: apply() {}
│   └── client.js      # browser half: store, panel, slots
├── README.md          # 中文
├── README_EN.md       # English
└── LICENSE
```

The browser half registers as `window.__ModuleLoader__.load({ id: 'dsh-notepad', … })` and requires only `react` / `react-dom` from the host module table. Its stylesheet is injected once in `apply()`, so the toolbar button and the panel share one theme.

## Known limitations

- **Storage is per browser origin** — two browsers or two machines do not share the notepad.
- **No sync with the agent** — the notepad is user-facing only; the model never sees it unless you insert the text.
- **Fixed overlay** — the panel is a `position: fixed` portal, so it floats above the composer.
- **Legacy migration** — notes that were stored with a `- [ ]` prefix are split into state and have the prefix removed on read.
- **Link installs are development installs** — `link:` points at the checkout.

## Development

No build step. Edit `lib/client.js`, restart or reinstall, then refresh. `node --check lib/client.js` catches syntax errors first.

## License

MIT
