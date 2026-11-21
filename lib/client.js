/**
 * dsh-notepad — browser half.
 *
 * One global notepad behind a tag icon in the composer tool row. Notes are
 * auto-growing multiline editors, `- [ ]` / `- [x]` lines are checklists, every
 * row remembers the workspace it was captured in, and one click inserts a note
 * (or all of them) into the draft.
 */
window.__ModuleLoader__.load({
  id: 'dsh-notepad',
  factory(require) {
    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement
    const { useSyncExternalStore, useRef, useEffect, useState } = React

    const STORAGE_KEY = 'dsh-notepad.v1'
    const CSS_ID = 'dsh-notepad-css'

    // ---------------------------------------------------------------- store
    const DEFAULT_STATE = { open: false, x: null, y: null, w: 392, h: 470, items: [] }

    let state = readState()
    const listeners = new Set()

    function readState() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...DEFAULT_STATE, items: [] }
        const parsed = JSON.parse(raw)
        return { ...DEFAULT_STATE, ...parsed, items: Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : [] }
      } catch {
        return { ...DEFAULT_STATE, items: [] }
      }
    }

    /** Legacy items stored their checklist state in a `- [ ]` text prefix. */
    function normalizeItem(raw) {
      const item = raw && typeof raw === 'object' ? { ...raw } : {}
      let text = typeof item.text === 'string' ? item.text : ''
      const legacy = /^- \[([ xX])\]\s?/.exec(text)
      if (legacy) {
        item.todo = true
        item.done = legacy[1].toLowerCase() === 'x'
        text = text.slice(legacy[0].length)
      }
      item.text = text
      if (item.todo !== true) item.todo = false
      if (item.done !== true) item.done = false
      return item
    }

    function persist() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        /* storage full or blocked: the in-memory copy still works */
      }
    }

    function setState(patch) {
      state = { ...state, ...patch }
      listeners.forEach((listener) => listener())
      persist()
    }

    function subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }

    function snapshot() {
      return state
    }

    function useStore() {
      return useSyncExternalStore(subscribe, snapshot, snapshot)
    }

    // ------------------------------------------------------------- helpers
    let counter = 0
    function newId() {
      counter += 1
      return `${Date.now().toString(36)}-${counter}`
    }

    function baseName(path) {
      if (!path) return ''
      const parts = String(path).split(/[\\/]+/).filter(Boolean)
      return parts[parts.length - 1] || ''
    }

    /** Resolve the workspace a conversation belongs to (title, else folder name). */
    function resolveWorkspaceName(snapshot, sessionId) {
      const list = (snapshot && (snapshot.items || snapshot.workspaces || snapshot.list)) || []
      if (!sessionId) return ''
      for (const workspace of list) {
        const ids = workspace && workspace.sessionIds
        if (!ids || !Array.isArray(ids) || !ids.includes(sessionId)) continue
        const path = workspace.path || workspace.root || workspace.directory
        return workspace.title || workspace.displayTitle || workspace.name || baseName(path) || ''
      }
      return ''
    }

    function insertValue(item) {
      if (!item || !item.text.trim()) return ''
      return item.todo ? `- [${item.done ? 'x' : ' '}] ${item.text}` : item.text
    }

    function insertText(inputActions, text) {
      if (!inputActions || !text) return false
      try {
        const span = inputActions.captureInsertion()
        return inputActions.insertText(text, span)
      } catch {
        return false
      }
    }

    // -------------------------------------------------------------- styles
    const CSS = `
.dsh-np-btn{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:26px;height:26px;padding:0 4px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-tertiary,var(--dsw-alias-label-secondary));cursor:pointer;line-height:1;transition:background .12s ease,color .12s ease}
.dsh-np-btn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary)}
.dsh-np-btn:focus-visible{outline:2px solid var(--dsw-alias-accent,#4d6bfe);outline-offset:1px}
.dsh-np-btn[data-active="true"]{background:#FFF1BF;color:#7A5A00}
.dsh-np-panel{position:fixed;z-index:60;display:flex;flex-direction:column;min-width:280px;min-height:220px;background:#FFFCF1;color:#43371F;border:1px solid #E7D9AE;border-radius:14px;box-shadow:0 18px 44px rgba(90,70,20,.22);overflow:hidden;font-size:13px}
.dsh-np-head{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#FFF3C6;border-bottom:1px solid #EADCAF;cursor:grab;user-select:none;touch-action:none}
.dsh-np-head[data-dragging="true"]{cursor:grabbing}
.dsh-np-title{font-size:13px;font-weight:650;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#5A4300}
.dsh-np-sub{font-size:10px;font-weight:500;color:#9A7C24;background:#FFF9DE;border:1px solid #EADCAF;border-radius:999px;padding:1px 7px;margin-left:6px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-np-tools{display:flex;align-items:center;gap:2px}
.dsh-np-tool{width:24px;height:24px;border:0;border-radius:7px;background:transparent;color:#8A6A10;cursor:pointer;font-size:14px;line-height:1}
.dsh-np-tool:hover{background:#FFE9A3;color:#5A4300}
.dsh-np-tool[data-close="true"]:hover{background:#FFD9D2;color:#A33118}
.dsh-np-body{flex:1;overflow:auto;padding:10px 12px 14px;display:flex;flex-direction:column;gap:6px;background-image:linear-gradient(#F3E9C8 1px,transparent 1px);background-size:100% 26px;background-position:0 6px}
.dsh-np-empty{color:#A08B4E;font-size:12px;line-height:1.8;padding:10px 2px}
.dsh-np-row{display:flex;align-items:flex-start;gap:6px;border-radius:9px;padding:1px 2px;background:rgba(255,255,255,.62)}
.dsh-np-row:hover{background:rgba(255,255,255,.92)}
.dsh-np-box{flex:none;width:16px;height:16px;margin-top:5px;border:1.5px solid #C9AE62;border-radius:50%;background:#FFFDF5;cursor:pointer;padding:0;display:inline-flex;align-items:center;justify-content:center;color:transparent}
.dsh-np-box[data-done="true"]{border-color:#C58A00;color:#fff;background:#C58A00}
.dsh-np-note{flex:1;min-width:0;width:100%;resize:none;overflow:hidden;border:1px solid transparent;border-radius:7px;padding:3px 6px;background:transparent;color:#43371F;font:inherit;font-size:13px;line-height:1.6;outline:none;white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-np-note:focus{border-color:#E2CB8C;background:#FFFEF8}
.dsh-np-note[data-done="true"]{color:#A5946A;text-decoration:line-through}
.dsh-np-meta{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:none;padding-top:4px}
.dsh-np-tag{font-size:10px;line-height:1.4;color:#A08B4E;white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;background:rgba(255,243,198,.7);border-radius:999px;padding:0 6px}
.dsh-np-del{opacity:0;border:0;background:transparent;color:#B9A363;cursor:pointer;padding:0 2px;font-size:12px;line-height:1}
.dsh-np-row:hover .dsh-np-del{opacity:1}
.dsh-np-foot{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#FFF8DE;border-top:1px solid #EADCAF;flex-wrap:wrap}
.dsh-np-foot button{border:1px solid #E2CB8C;background:#FFFDF5;color:#6B5314;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer}
.dsh-np-foot button:hover{background:#FFF1BF}
.dsh-np-foot .dsh-np-primary{background:#E8A93B;border-color:#D89A2C;color:#fff}
.dsh-np-foot .dsh-np-danger[data-confirm="true"]{background:#D9534F;border-color:#C74440;color:#fff}
.dsh-np-grip{position:absolute;z-index:9;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;touch-action:none;background:linear-gradient(135deg,transparent 50%,#DCC288 50%)}
.dsh-np-edge-x{position:absolute;z-index:8;top:6px;right:0;bottom:16px;width:10px;cursor:ew-resize;touch-action:none}
.dsh-np-edge-y{position:absolute;z-index:8;left:6px;right:16px;bottom:0;height:10px;cursor:ns-resize;touch-action:none}
.dsh-np-modal{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(90,70,20,.26)}
.dsh-np-modal-card{width:min(290px,86%);background:#FFFDF5;border:1px solid #E2CB8C;border-radius:12px;padding:16px 16px 14px;box-shadow:0 16px 36px rgba(90,70,20,.28);text-align:center}
.dsh-np-modal-title{font-size:14px;font-weight:650;color:#5A4300}
.dsh-np-modal-desc{font-size:12px;line-height:1.6;color:#9A7C24;margin:6px 0 14px}
.dsh-np-modal-actions{display:flex;justify-content:center;gap:8px}
.dsh-np-modal-actions button{border:1px solid #E2CB8C;background:#FFFDF5;color:#6B5314;border-radius:8px;padding:5px 16px;font-size:12px;cursor:pointer}
.dsh-np-modal-actions button:hover{background:#FFF1BF}
.dsh-np-modal-actions .dsh-np-danger-solid{background:#D9534F;border-color:#C74440;color:#fff}
.dsh-np-modal-actions .dsh-np-danger-solid:hover{background:#C74440}
`

    // ------------------------------------------------------------- textarea
    function AutoTextarea({ value, onChange, done, placeholder }) {
      const ref = useRef(null)

      const fit = () => {
        const node = ref.current
        if (!node) return
        node.style.height = 'auto'
        node.style.height = `${node.scrollHeight}px`
      }

      useEffect(fit, [value])

      return h('textarea', {
        ref,
        className: 'dsh-np-note',
        value,
        'data-done': done ? 'true' : 'false',
        rows: 1,
        spellCheck: false,
        placeholder,
        onChange: (event) => {
          onChange(event.target.value)
          requestAnimationFrame(fit)
        },
        onInput: fit,
      })
    }

    // ---------------------------------------------------------------- panel
    function NotepadPanel(props) {
      const { inputActions } = props
      const data = useStore()
      const sessionId = props.useSession ? props.useSession((s) => (s ? s.sessionId : '')) : ''
      const workspaces = props.useWorkspaces ? props.useWorkspaces((s) => s) : null
      const drag = useRef(null)
      const [clearAsk, setClearAsk] = useState(false)

      useEffect(() => {
        if (!data.open) setClearAsk(false)
      }, [data.open])

      if (!data.open) return null

      const project = resolveWorkspaceName(workspaces, sessionId) || '当前对话'
      const pos = {
        x: data.x == null ? Math.max(16, Math.round(window.innerWidth - data.w - 40)) : data.x,
        y: data.y == null ? Math.max(64, Math.round((window.innerHeight - data.h) / 2)) : data.y,
      }

      const onPointerMove = (event) => {
        const current = drag.current
        if (!current) return
        if (current.kind === 'move') {
          setState({
            x: Math.min(Math.max(0, current.ox + event.clientX - current.sx), window.innerWidth - 140),
            y: Math.min(Math.max(0, current.oy + event.clientY - current.sy), window.innerHeight - 60),
          })
          return
        }
        const width = current.ow + event.clientX - current.sx
        const height = current.oh + event.clientY - current.sy
        if (current.kind === 'resizeX') setState({ w: Math.max(280, width) })
        else if (current.kind === 'resizeY') setState({ h: Math.max(220, height) })
        else setState({ w: Math.max(280, width), h: Math.max(220, height) })
      }

      const endDrag = () => {
        drag.current = null
      }

      const beginDrag = (kind) => (event) => {
        if (event.button !== 0) return
        if (kind === 'move' && event.target.closest('button, textarea, input, select, a')) return
        event.preventDefault()
        // Pin a default-placed panel before resizing, so growing the width or
        // height never re-centers it and moves both edges.
        if (kind !== 'move' && (data.x == null || data.y == null)) {
          setState({ x: pos.x, y: pos.y })
        }
        drag.current = {
          kind,
          sx: event.clientX,
          sy: event.clientY,
          ox: pos.x,
          oy: pos.y,
          ow: data.w,
          oh: data.h,
        }
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }

      const updateItem = (id, patch) => {
        setState({ items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) })
      }

      const addItem = () => {
        const item = {
          id: newId(),
          text: '',
          todo: false,
          done: false,
          project,
          createdAt: Date.now(),
        }
        setState({ items: [...state.items, item] })
        requestAnimationFrame(() => {
          const nodes = document.querySelectorAll('.dsh-np-panel .dsh-np-note')
          const last = nodes[nodes.length - 1]
          if (last && typeof last.focus === 'function') last.focus()
        })
        return item
      }

      /** Double-clicking empty paper (not a row/control) starts a new note. */
      const onBodyDoubleClick = (event) => {
        if (event.target.closest('.dsh-np-row, button, textarea, input, select, a')) return
        event.preventDefault()
        addItem()
      }

      const removeItem = (id) => {
        setState({ items: state.items.filter((item) => item.id !== id) })
      }

      const toggleTodo = (item) => {
        if (item.todo) updateItem(item.id, { done: !item.done })
        else updateItem(item.id, { todo: true, done: false })
      }

      const rows = data.items.map((item) => {
        const isTodo = item.todo === true
        return h(
          'div',
          { className: 'dsh-np-row', key: item.id },
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-np-box',
              'data-done': isTodo && item.done ? 'true' : 'false',
              title: isTodo ? (item.done ? '标记为未完成' : '标记为已完成') : '转为待办',
              'aria-label': isTodo ? (item.done ? '标记为未完成' : '标记为已完成') : '转为待办',
              onClick: () => toggleTodo(item),
            },
            isTodo && item.done
              ? h('svg', { width: 10, height: 10, viewBox: '0 0 12 12', 'aria-hidden': true },
                h('path', { d: 'M2 6.5 4.7 9 10 3.5', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }))
              : null,
          ),
          h(AutoTextarea, {
            value: item.text,
            done: isTodo && item.done === true,
            placeholder: '写点什么…',
            onChange: (next) => {
              updateItem(item.id, { text: next })
            },
          }),
          h(
            'div',
            { className: 'dsh-np-meta' },
            h('span', { className: 'dsh-np-tag', title: item.project || '' }, item.project || ''),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-np-del',
                title: '删除这一条',
                'aria-label': '删除这一条',
                onClick: () => removeItem(item.id),
              },
              '×',
            ),
          ),
        )
      })

      const panel = h(
        'div',
        {
          className: 'dsh-np-panel',
          style: { left: `${pos.x}px`, top: `${pos.y}px`, width: `${data.w}px`, height: `${data.h}px` },
          role: 'dialog',
          'aria-label': '记事本',
        },
        h(
          'div',
          {
            className: 'dsh-np-head',
            onPointerDown: beginDrag('move'),
            onPointerMove,
            onPointerUp: endDrag,
            onPointerCancel: endDrag,
          },
          h('span', { className: 'dsh-np-title' }, '记事本', h('span', { className: 'dsh-np-sub', title: sessionId || '' }, project)),
          h(
            'span',
            { className: 'dsh-np-tools' },
            h('button', { type: 'button', className: 'dsh-np-tool', title: '新建一条', 'aria-label': '新建一条', onClick: () => addItem() }, '+'),
            h('button', { type: 'button', className: 'dsh-np-tool', 'data-close': 'true', title: '关闭', 'aria-label': '关闭', onClick: () => setState({ open: false }) }, '×'),
          ),
        ),
        h(
          'div',
          { className: 'dsh-np-body', onDoubleClick: onBodyDoubleClick },
          data.items.length === 0
            ? h('div', { className: 'dsh-np-empty' }, '全局单例记事本。点「+」新建一条；双击空白处也能新建；点左侧圆圈把它变成待办，再点切换完成。')
            : rows,
        ),
        h(
          'div',
          { className: 'dsh-np-foot' },
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                const last = data.items[data.items.length - 1]
                if (last) insertText(inputActions, `${insertValue(last)}\n`)
              },
            },
            '插入',
          ),
          h(
            'button',
            {
              type: 'button',
              onClick: () => {
                const text = data.items.map((item) => insertValue(item)).filter(Boolean).join('\n')
                insertText(inputActions, text)
              },
            },
            '插入全部',
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-np-danger',
              onClick: () => setClearAsk(true),
            },
            '清空',
          ),
        ),
        h('div', { className: 'dsh-np-edge-x', title: '左右拖动缩放宽度', onPointerDown: beginDrag('resizeX'), onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag }),
        h('div', { className: 'dsh-np-edge-y', title: '上下拖动缩放高度', onPointerDown: beginDrag('resizeY'), onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag }),
        h('div', { className: 'dsh-np-grip', title: '拖动缩放', onPointerDown: beginDrag('resize'), onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag }),
        clearAsk
          ? h(
            'div',
            { className: 'dsh-np-modal', role: 'presentation' },
            h(
              'div',
              { className: 'dsh-np-modal-card', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': '确认清空' },
              h('div', { className: 'dsh-np-modal-title' }, '确定清空所有笔记吗？'),
              h('div', { className: 'dsh-np-modal-desc' }, `共 ${data.items.length} 条，清空后无法恢复。`),
              h(
                'div',
                { className: 'dsh-np-modal-actions' },
                h('button', { type: 'button', onClick: () => setClearAsk(false) }, '取消'),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-np-danger-solid',
                    onClick: () => {
                      setClearAsk(false)
                      setState({ items: [] })
                    },
                  },
                  '确定',
                ),
              ),
            ),
          )
          : null,
      )

      return ReactDOM.createPortal(panel, document.body)
    }

    function NotepadButton() {
      const data = useStore()
      return h(
        'button',
        {
          type: 'button',
          className: 'dsh-np-btn',
          'data-active': data.open ? 'true' : 'false',
          title: '记事本',
          'aria-label': '记事本',
          'aria-expanded': data.open ? 'true' : 'false',
          onClick: () => setState({ open: !state.open }),
        },
        h(
          'svg',
          { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true },
          h('path', {
            d: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H16l4 4v10.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z',
            stroke: 'currentColor',
            strokeWidth: 1.6,
            strokeLinejoin: 'round',
          }),
          h('path', { d: 'M15.5 4v4H20', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' }),
          h('path', { d: 'M8 12h8M8 15.5h5', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' }),
        ),
      )
    }

    return {
      name: 'dsh-notepad',
      inject: ['slots'],
      apply(ctx) {
        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.pluginCss = CSS_ID
          style.textContent = CSS
          document.head.appendChild(style)
          return () => style.remove()
        }, 'dsh-notepad: styles')

        ctx.slots.inject('conversation.input.left', () =>
          ctx.slots.register({ name: 'conversation.input.left', id: 'notepad-button', order: 40 }, NotepadButton),
        )
        ctx.slots.inject('conversation.input.dock', () =>
          ctx.slots.register({ name: 'conversation.input.dock', id: 'notepad-panel', order: 90 }, NotepadPanel),
        )
        console.info('[dsh-notepad] ready')
      },
    }
  },
})
