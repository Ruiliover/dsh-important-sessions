/**
 * Important sessions — browser half.
 *
 * Registers a global sidebar panel ("重要会话") with category filters, its star
 * icon, a star in the Session header utilities, a star in every Session row's
 * hover strip, and one overlay dialog host for assigning categories.
 *
 * Favorites and categories live in this browser's localStorage; no Host state,
 * Session log record, or new service is involved.
 */
window.__ModuleLoader__.load({
  id: 'dsh-important-sessions',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'important-sessions'
    const NS = 'importantSessions'
    const STORAGE_KEY = 'dsh.important-sessions.v1'
    // Five-point star centered in a 24px viewBox (outer radius 10.2, inner 4.3).
    // The box is filled like the host's 16px product icons (about 80% wide) so
    // the star reads at the same size as the neighbouring panel icons.
    const STAR_PATH = 'M12 2.78 L14.53 9.5 L21.7 9.83 L16.09 14.3 L18 21.23 L12 17.28 L6 21.23 L7.91 14.3 L2.3 9.83 L9.47 9.5 Z'
    const MAX_CATEGORY_NAME = 24
    // Store format 3 replaced the virtual "All" filter with a real default
    // category; older stores are migrated on read.
    const STORAGE_VERSION = 3
    const DEFAULT_CATEGORY_ID = 'default'
    const DEFAULT_CATEGORIES = [
      { id: DEFAULT_CATEGORY_ID, name: '默认收藏夹' },
      { id: 'daily', name: '日常答疑' },
      { id: 'work', name: '工作答疑' },
    ]

    const ZH = {
      panel: '重要会话',
      title: '重要会话',
      count: '个会话',
      countOne: '个会话',
      hint: '把常回来看的会话收在这里。点星标收藏时会默认放进「默认收藏夹」，也可以再勾日常答疑、工作答疑等分类（可多选）；会话列表每一行也有星标。',
      emptyTitle: '还没有收藏的会话',
      emptyBody: '打开任意会话，点右上角的星标，勾选分类，它就会出现在这里。',
      emptyFilteredTitle: '「{name}」里还没有会话',
      emptyFilteredBody: '在会话里点星标收藏时，勾选这个分类就会出现在这里。',
      add: '加入重要会话',
      editCategories: '调整分类',
      remove: '移出重要会话',
      favorite: '重要会话',
      archived: '已归档',
      localOnly: '收藏和分类保存在当前浏览器，不会同步到其他设备。',
      untitled: '未命名会话',
      open: '打开会话',
      uncategorized: '未分类',
      categories: '分类',
      categoryPickerTitle: '收藏到分类',
      categoryPickerTitleEdit: '调整分类',
      newCategoryPlaceholder: '新建分类…',
      create: '新建',
      save: '保存',
      cancel: '取消',
      removeFavorite: '移出收藏',
      categoryRequired: '至少勾选一个分类；想移出收藏，用左下角的「移出收藏」。',
      duplicateCategory: '分类名不能为空，也不能和已有分类重名。',
      noCategories: '还没有分类，先新建一个。',
      manageCategories: '管理分类',
      manageTitle: '管理分类',
      manageHint: '改名后按回车保存；删除分类会把会话从该分类移除，收藏本身还在。',
      deleteCategory: '删除',
      confirmDelete: '确认删除',
      done: '完成',
      tag: '分类',
    }
    const EN = {
      panel: 'Important sessions',
      title: 'Important sessions',
      count: 'sessions',
      countOne: 'session',
      hint: 'Keep the sessions you return to close. A starred session lands in the default category, and you can tick more categories such as Daily questions or Work — a session can sit in several. Every session row has a star too.',
      emptyTitle: 'No important sessions yet',
      emptyBody: 'Open a session, press the star at the top right and tick a category — it will show up here.',
      emptyFilteredTitle: 'Nothing in “{name}” yet',
      emptyFilteredBody: 'Star a session and tick this category to collect it here.',
      add: 'Add to important sessions',
      editCategories: 'Edit categories',
      remove: 'Remove from important sessions',
      favorite: 'Important sessions',
      archived: 'Archived',
      localOnly: 'Collected sessions and categories are saved in this browser only.',
      untitled: 'Untitled session',
      open: 'Open session',
      uncategorized: 'Uncategorized',
      categories: 'Categories',
      categoryPickerTitle: 'Collect into categories',
      categoryPickerTitleEdit: 'Edit categories',
      newCategoryPlaceholder: 'New category…',
      create: 'Add',
      save: 'Save',
      cancel: 'Cancel',
      removeFavorite: 'Remove favorite',
      categoryRequired: 'Tick at least one category; use “Remove favorite” to take it out.',
      duplicateCategory: 'A category name cannot be blank or duplicate an existing one.',
      noCategories: 'No categories yet — create one first.',
      manageCategories: 'Manage categories',
      manageTitle: 'Manage categories',
      manageHint: 'Press Enter to rename; deleting a category removes it from every collected session and keeps the favorite.',
      deleteCategory: 'Delete',
      confirmDelete: 'Confirm delete',
      done: 'Done',
      tag: 'Categories',
    }

    // ---------------------------------------------------------------------
    // Favorites and categories store
    // ---------------------------------------------------------------------

    let state = null
    let snapshot = null
    const listeners = new Set()

    function defaultState() {
      return { categories: DEFAULT_CATEGORIES.map(category => ({ ...category })), items: [] }
    }

    function normalize(raw, version) {
      if (raw === null || typeof raw !== 'object') return defaultState()
      const categories = []
      const seen = new Set()
      if (Array.isArray(raw.categories)) {
        for (const candidate of raw.categories) {
          if (candidate === null || typeof candidate !== 'object') continue
          const id = typeof candidate.id === 'string' ? candidate.id.trim() : ''
          const name = typeof candidate.name === 'string' ? candidate.name.trim().slice(0, MAX_CATEGORY_NAME) : ''
          if (id === '' || name === '' || seen.has(id)) continue
          seen.add(id)
          categories.push({ id, name })
        }
      } else {
        for (const category of DEFAULT_CATEGORIES) {
          categories.push({ ...category })
          seen.add(category.id)
        }
      }
      const items = []
      const itemsSeen = new Set()
      if (Array.isArray(raw.items)) {
        for (const candidate of raw.items) {
          if (candidate === null || typeof candidate !== 'object') continue
          const id = typeof candidate.id === 'string' ? candidate.id.trim() : ''
          if (id === '' || itemsSeen.has(id)) continue
          itemsSeen.add(id)
          const assigned = Array.isArray(candidate.categories)
            ? candidate.categories.filter(value => typeof value === 'string' && seen.has(value))
            : []
          items.push({
            id,
            title: typeof candidate.title === 'string' ? candidate.title : '',
            savedAt: typeof candidate.savedAt === 'number' && Number.isFinite(candidate.savedAt) ? candidate.savedAt : 0,
            categories: [...new Set(assigned)],
          })
        }
      }
      // Before format 3 the panel had a virtual "All" filter and favorites
      // could carry no category. Introduce the real default category and put
      // those favorites into it.
      if (version < STORAGE_VERSION) {
        if (!seen.has(DEFAULT_CATEGORY_ID)) {
          categories.unshift({ id: DEFAULT_CATEGORY_ID, name: '默认收藏夹' })
          seen.add(DEFAULT_CATEGORY_ID)
        }
        for (const item of items) {
          if (item.categories.length === 0) item.categories = [DEFAULT_CATEGORY_ID]
        }
      }
      return { categories, items }
    }

    function readStored() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (raw === null || raw === '') return null
        const parsed = JSON.parse(raw)
        const version = parsed !== null && typeof parsed === 'object' && typeof parsed.version === 'number' ? parsed.version : 1
        return normalize(parsed, version)
      } catch (error) {
        console.warn('important-sessions: stored favorites are unreadable', error)
        return null
      }
    }

    function writeStored(next) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          version: STORAGE_VERSION,
          categories: next.categories,
          items: next.items,
        }))
      } catch (error) {
        console.warn('important-sessions: favorites cannot be persisted', error)
      }
    }

    function makeSnapshot(next) {
      const ids = new Set(next.items.map(item => item.id))
      const counts = new Map()
      for (const item of next.items) {
        for (const categoryId of item.categories) {
          counts.set(categoryId, (counts.get(categoryId) || 0) + 1)
        }
      }
      return { categories: next.categories, items: next.items, ids, counts }
    }

    function getState() {
      if (state === null) state = readStored() || defaultState()
      return state
    }

    function getSnapshot() {
      if (snapshot === null) snapshot = makeSnapshot(getState())
      return snapshot
    }

    function commit(next) {
      state = next
      snapshot = makeSnapshot(next)
      writeStored(next)
      for (const listener of [...listeners]) {
        try {
          listener()
        } catch (error) {
          console.error('important-sessions: a listener failed', error)
        }
      }
    }

    function subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    }

    function useFavorites() {
      return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
    }

    function replaceFromStorage() {
      state = readStored() || defaultState()
      snapshot = makeSnapshot(state)
      for (const listener of [...listeners]) {
        try {
          listener()
        } catch (error) {
          console.error('important-sessions: a listener failed', error)
        }
      }
    }

    function validCategoryIds(categoryIds) {
      const current = getSnapshot()
      const valid = []
      for (const id of categoryIds) {
        if (valid.includes(id)) continue
        if (current.categories.some(category => category.id === id)) valid.push(id)
      }
      return valid
    }

    function upsertFavorite(sessionId, title, categoryIds) {
      if (typeof sessionId !== 'string' || sessionId === '') return false
      const valid = validCategoryIds(categoryIds)
      if (valid.length === 0) return false
      const current = getSnapshot()
      const existing = current.items.find(item => item.id === sessionId)
      if (existing !== undefined) {
        const items = current.items.map(item => item.id === sessionId
          ? { ...item, title: item.title || (typeof title === 'string' ? title : ''), categories: valid }
          : item)
        commit({ categories: current.categories, items })
        return true
      }
      commit({
        categories: current.categories,
        items: [{
          id: sessionId,
          title: typeof title === 'string' ? title : '',
          savedAt: Date.now(),
          categories: valid,
        }, ...current.items],
      })
      return true
    }

    function removeFavorite(sessionId) {
      const current = getSnapshot()
      if (!current.ids.has(sessionId)) return
      commit({ categories: current.categories, items: current.items.filter(item => item.id !== sessionId) })
    }

    function addCategory(name) {
      const trimmed = typeof name === 'string' ? name.trim().slice(0, MAX_CATEGORY_NAME) : ''
      if (trimmed === '') return null
      const current = getSnapshot()
      const lowered = trimmed.toLowerCase()
      if (current.categories.some(category => category.name.toLowerCase() === lowered)) return null
      const id = `cat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      commit({ categories: [...current.categories, { id, name: trimmed }], items: current.items })
      return id
    }

    function renameCategory(categoryId, name) {
      const trimmed = typeof name === 'string' ? name.trim().slice(0, MAX_CATEGORY_NAME) : ''
      if (trimmed === '') return false
      const current = getSnapshot()
      const target = current.categories.find(category => category.id === categoryId)
      if (target === undefined) return false
      const lowered = trimmed.toLowerCase()
      if (current.categories.some(category => category.id !== categoryId && category.name.toLowerCase() === lowered)) return false
      if (target.name === trimmed) return true
      commit({
        categories: current.categories.map(category => category.id === categoryId ? { ...category, name: trimmed } : category),
        items: current.items,
      })
      return true
    }

    function deleteCategory(categoryId) {
      const current = getSnapshot()
      if (!current.categories.some(category => category.id === categoryId)) return
      commit({
        categories: current.categories.filter(category => category.id !== categoryId),
        items: current.items.map(item => item.categories.includes(categoryId)
          ? { ...item, categories: item.categories.filter(id => id !== categoryId) }
          : item),
      })
    }

    // ---------------------------------------------------------------------
    // Overlay state: the category dialogs live in `shell.overlay` so the
    // Session row's hover strip can never clip or unmount them.
    // ---------------------------------------------------------------------

    let overlayState = { editor: null, managing: false }
    const overlayListeners = new Set()

    function getOverlay() {
      return overlayState
    }

    function subscribeOverlay(listener) {
      overlayListeners.add(listener)
      return () => { overlayListeners.delete(listener) }
    }

    function setOverlay(next) {
      overlayState = next
      for (const listener of [...overlayListeners]) {
        try {
          listener()
        } catch (error) {
          console.error('important-sessions: an overlay listener failed', error)
        }
      }
    }

    function useOverlay() {
      return React.useSyncExternalStore(subscribeOverlay, getOverlay, getOverlay)
    }

    let editorSeq = 0

    function openEditor(sessionId, title) {
      editorSeq += 1
      setOverlay({ editor: { sessionId, title: typeof title === 'string' ? title : '', token: editorSeq }, managing: false })
    }

    function closeEditor() {
      if (overlayState.editor !== null) setOverlay({ editor: null, managing: overlayState.managing })
    }

    function openManager() {
      setOverlay({ editor: null, managing: true })
    }

    function closeManager() {
      if (overlayState.managing) setOverlay({ editor: overlayState.editor, managing: false })
    }

    // ---------------------------------------------------------------------
    // Presentation helpers
    // ---------------------------------------------------------------------

    function StarGlyph(props) {
      const size = typeof props.size === 'number' && props.size > 0 ? props.size : 16
      const filled = props.filled === true
      // DSH product icons draw regular outlines at one CSS pixel. The star uses
      // a 24-unit box, so scale the stroke down to keep that same 1px weight at
      // the small sizes, and never below 1 unit on large decorative stars.
      const strokeWidth = Math.max(1, 24 / size)
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        className: props.className,
        'aria-hidden': 'true',
        focusable: 'false',
        style: { display: 'block', flex: 'none' },
      }, h('path', {
        d: STAR_PATH,
        fill: filled ? 'currentColor' : 'none',
        stroke: filled ? 'none' : 'currentColor',
        strokeWidth: filled ? 0 : strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }))
    }

    function folderName(cwd) {
      if (typeof cwd !== 'string') return ''
      const parts = cwd.split(/[\\/]/).filter(part => part !== '')
      return parts.length === 0 ? '' : parts[parts.length - 1]
    }

    function formatTime(time) {
      if (typeof time !== 'number' || time <= 0) return ''
      try {
        return new Intl.DateTimeFormat(undefined, {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }).format(new Date(time))
      } catch (error) {
        return ''
      }
    }

    function useModal(dialogRef, onFailure) {
      React.useEffect(() => {
        const dialog = dialogRef.current
        if (dialog === null) return
        if (!dialog.open) {
          try {
            dialog.showModal()
          } catch (error) {
            console.warn('important-sessions: the category dialog cannot open', error)
            onFailure()
            return
          }
        }
        return () => {
          if (dialog.open) dialog.close()
        }
      }, [])
    }

    // ---------------------------------------------------------------------
    // Dialogs
    // ---------------------------------------------------------------------

    function FavoriteDialog({ editor, onClose, t }) {
      const favorites = useFavorites()
      const item = favorites.items.find(entry => entry.id === editor.sessionId)
      const [selected, setSelected] = React.useState(() => {
        if (item) return item.categories.slice()
        // A new favorite lands in the default category unless the user picks
        // another one in this dialog.
        if (favorites.categories.some(category => category.id === DEFAULT_CATEGORY_ID)) return [DEFAULT_CATEGORY_ID]
        return favorites.categories.length > 0 ? [favorites.categories[0].id] : []
      })
      const [draft, setDraft] = React.useState('')
      const [error, setError] = React.useState('')
      const dialogRef = React.useRef(null)
      useModal(dialogRef, onClose)

      // Another window may delete a category while this dialog is open; drop the
      // vanished ids so the checked rows and Save stay truthful.
      React.useEffect(() => {
        setSelected(previous => {
          const next = previous.filter(id => favorites.categories.some(category => category.id === id))
          return next.length === previous.length ? previous : next
        })
      }, [favorites.categories])

      const title = editor.title || (item && item.title) || t('untitled')
      const toggle = (categoryId) => {
        setError('')
        setSelected(previous => previous.includes(categoryId)
          ? previous.filter(id => id !== categoryId)
          : [...previous, categoryId])
      }
      const create = () => {
        const created = addCategory(draft)
        if (created === null) {
          setError(t('duplicateCategory'))
          return
        }
        setError('')
        setDraft('')
        setSelected(previous => previous.includes(created) ? previous : [...previous, created])
      }
      const save = () => {
        if (selected.length === 0) {
          setError(t('categoryRequired'))
          return
        }
        if (upsertFavorite(editor.sessionId, editor.title || (item && item.title) || '', selected)) onClose()
        else setError(t('categoryRequired'))
      }
      const remove = () => {
        removeFavorite(editor.sessionId)
        onClose()
      }

      return h('dialog', {
        ref: dialogRef,
        className: 'dsh-is-dialog',
        'aria-label': item ? t('categoryPickerTitleEdit') : t('categoryPickerTitle'),
        onClose,
        onCancel: event => { event.preventDefault(); onClose() },
        onMouseDown: event => { if (event.target === dialogRef.current) onClose() },
      },
        h('div', { className: 'dsh-is-dialog-body' },
          h('h2', { className: 'dsh-is-dialog-title' }, item ? t('categoryPickerTitleEdit') : t('categoryPickerTitle')),
          h('p', { className: 'dsh-is-dialog-sub', title }, title),
          h('div', { className: 'dsh-is-catlist', role: 'group', 'aria-label': t('categories') },
            favorites.categories.length === 0
              ? h('p', { className: 'dsh-is-hint-small' }, t('noCategories'))
              : favorites.categories.map(category => h('label', { key: category.id, className: 'dsh-is-catrow' },
                  h('input', {
                    type: 'checkbox',
                    checked: selected.includes(category.id),
                    onChange: () => toggle(category.id),
                  }),
                  h('span', { className: 'dsh-is-catname' }, category.name),
                )),
          ),
          h('div', { className: 'dsh-is-newcat' },
            h('input', {
              type: 'text',
              className: 'dsh-is-input',
              value: draft,
              maxLength: MAX_CATEGORY_NAME,
              placeholder: t('newCategoryPlaceholder'),
              'aria-label': t('newCategoryPlaceholder'),
              onChange: event => setDraft(event.target.value),
              onKeyDown: event => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                create()
              },
            }),
            h('button', {
              type: 'button',
              className: 'dsh-is-btn',
              disabled: draft.trim() === '',
              onClick: create,
            }, t('create')),
          ),
          h('p', { className: 'dsh-is-hint-small' }, t('categoryRequired')),
          error !== '' && h('p', { className: 'dsh-is-error', role: 'alert' }, error),
          h('div', { className: 'dsh-is-dialog-actions' },
            item && h('button', { type: 'button', className: 'dsh-is-btn dsh-is-btn-danger', onClick: remove }, t('removeFavorite')),
            h('span', { className: 'dsh-is-spacer' }),
            h('button', { type: 'button', className: 'dsh-is-btn', onClick: onClose }, t('cancel')),
            h('button', {
              type: 'button',
              className: 'dsh-is-btn dsh-is-btn-primary',
              disabled: selected.length === 0,
              onClick: save,
            }, t('save')),
          ),
        ),
      )
    }

    function CategoriesDialog({ onClose, t }) {
      const favorites = useFavorites()
      const [draft, setDraft] = React.useState('')
      const [names, setNames] = React.useState({})
      const [confirmId, setConfirmId] = React.useState(null)
      const [error, setError] = React.useState('')
      const dialogRef = React.useRef(null)
      useModal(dialogRef, onClose)

      const clearName = (categoryId) => {
        setNames(previous => {
          const next = { ...previous }
          delete next[categoryId]
          return next
        })
      }
      const commitName = (category) => {
        const raw = names[category.id]
        if (raw === undefined) return
        const trimmed = raw.trim()
        if (trimmed === '') {
          setError(t('duplicateCategory'))
          return
        }
        if (trimmed === category.name) {
          setError('')
          clearName(category.id)
          return
        }
        if (!renameCategory(category.id, trimmed)) {
          setError(t('duplicateCategory'))
          return
        }
        setError('')
        clearName(category.id)
      }
      const create = () => {
        const created = addCategory(draft)
        if (created === null) {
          setError(t('duplicateCategory'))
          return
        }
        setError('')
        setDraft('')
      }

      return h('dialog', {
        ref: dialogRef,
        className: 'dsh-is-dialog',
        'aria-label': t('manageTitle'),
        onClose,
        onCancel: event => { event.preventDefault(); onClose() },
        onMouseDown: event => { if (event.target === dialogRef.current) onClose() },
      },
        h('div', { className: 'dsh-is-dialog-body' },
          h('h2', { className: 'dsh-is-dialog-title' }, t('manageTitle')),
          h('p', { className: 'dsh-is-hint-small' }, t('manageHint')),
          h('div', { className: 'dsh-is-catmanage' },
            favorites.categories.length === 0 && h('p', { className: 'dsh-is-hint-small' }, t('noCategories')),
            favorites.categories.map(category => h('div', { key: category.id, className: 'dsh-is-catmanage-row' },
              h('input', {
                type: 'text',
                className: 'dsh-is-input',
                value: names[category.id] !== undefined ? names[category.id] : category.name,
                maxLength: MAX_CATEGORY_NAME,
                'aria-label': category.name,
                onChange: event => {
                  const value = event.target.value
                  setError('')
                  setNames(previous => ({ ...previous, [category.id]: value }))
                },
                onBlur: () => { commitName(category) },
                onKeyDown: event => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  event.currentTarget.blur()
                },
              }),
              h('button', {
                type: 'button',
                className: confirmId === category.id ? 'dsh-is-btn dsh-is-btn-small dsh-is-btn-danger' : 'dsh-is-btn dsh-is-btn-small',
                onClick: () => {
                  if (confirmId === category.id) {
                    deleteCategory(category.id)
                    setConfirmId(null)
                    return
                  }
                  setConfirmId(category.id)
                },
              }, confirmId === category.id ? t('confirmDelete') : t('deleteCategory')),
            )),
          ),
          h('div', { className: 'dsh-is-newcat' },
            h('input', {
              type: 'text',
              className: 'dsh-is-input',
              value: draft,
              maxLength: MAX_CATEGORY_NAME,
              placeholder: t('newCategoryPlaceholder'),
              'aria-label': t('newCategoryPlaceholder'),
              onChange: event => setDraft(event.target.value),
              onKeyDown: event => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                create()
              },
            }),
            h('button', {
              type: 'button',
              className: 'dsh-is-btn',
              disabled: draft.trim() === '',
              onClick: create,
            }, t('create')),
          ),
          error !== '' && h('p', { className: 'dsh-is-error', role: 'alert' }, error),
          h('div', { className: 'dsh-is-dialog-actions' },
            h('span', { className: 'dsh-is-spacer' }),
            h('button', { type: 'button', className: 'dsh-is-btn dsh-is-btn-primary', onClick: onClose }, t('done')),
          ),
        ),
      )
    }

    /** Frame-wide host for every category dialog. */
    function DialogHost(props) {
      const t = props.t
      const overlay = useOverlay()
      return h(React.Fragment, null,
        overlay.editor !== null && h(FavoriteDialog, {
          key: overlay.editor.token,
          editor: overlay.editor,
          onClose: closeEditor,
          t,
        }),
        overlay.managing && h(CategoriesDialog, { onClose: closeManager, t }),
      )
    }

    // ---------------------------------------------------------------------
    // Slot components
    // ---------------------------------------------------------------------

    /** The sidebar's global panel icon; filled while the panel is selected. */
    function PanelIcon(props) {
      return h(StarGlyph, { size: props.size || 18, filled: props.active === true })
    }

    /** Star in the Session header's right-hand utilities; opens the category dialog. */
    function HeaderFavorite(props) {
      const sessionId = props.sessionId
      const t = props.t
      const favorites = useFavorites()
      const displayTitle = props.useSessions(state => (state.byId[sessionId] && state.byId[sessionId].displayTitle) || '')
      const active = favorites.ids.has(sessionId)
      return h('button', {
        type: 'button',
        className: 'dsh-is-util',
        'data-active': active ? 'true' : 'false',
        'aria-pressed': active,
        'aria-label': t('favorite'),
        title: active ? t('editCategories') : t('add'),
        onClick: () => openEditor(sessionId, displayTitle),
      }, h(StarGlyph, { size: 16, filled: active }))
    }

    /** Star in one Session row's hover action strip. */
    function RowFavorite(props) {
      const sessionId = props.sessionId
      const t = props.t
      const favorites = useFavorites()
      const active = favorites.ids.has(sessionId)
      return h('button', {
        type: 'button',
        className: 'dsh-is-rowstar',
        'data-active': active ? 'true' : 'false',
        'aria-pressed': active,
        'aria-label': t('favorite'),
        title: active ? t('editCategories') : t('add'),
        onClick: () => openEditor(sessionId, props.displayTitle),
      }, h(StarGlyph, { size: 14, filled: active }))
    }

    /** The Important sessions main panel with its category filter. */
    function FavoritesPage(props) {
      const t = props.t
      const favorites = useFavorites()
      const summaries = props.useSessions(state => state.byId)
      const archivedSessionIds = props.useWorkspaces(state => state.archivedSessionIds)
      const archived = new Set(archivedSessionIds || [])
      const [filter, setFilter] = React.useState(() => (favorites.categories[0] ? favorites.categories[0].id : 'all'))

      React.useEffect(() => {
        if (filter === 'all') return
        if (favorites.categories.some(category => category.id === filter)) return
        setFilter(favorites.categories.length > 0 ? favorites.categories[0].id : 'all')
      }, [filter, favorites.categories])

      const items = favorites.items
      const categoryById = new Map(favorites.categories.map(category => [category.id, category]))
      // A missing category (deleted in another window) falls back to All until
      // the effect above resets the filter.
      const selectedCategory = filter === 'all' ? null : (categoryById.get(filter) || null)
      // The Session the main view currently retains; marking it tells the user
      // which collected session is the one on screen.
      let currentId = ''
      for (const id of Object.keys(summaries)) {
        const row = summaries[id]
        if (row && row.retainedBy && (row.retainedBy.mainView || 0) > 0) { currentId = id; break }
      }
      const visible = selectedCategory === null ? items : items.filter(item => item.categories.includes(selectedCategory.id))

      return h('section', { className: 'dsh-is-page', 'aria-label': t('title') },
        h('div', { className: 'dsh-is-scroll' },
          h('div', { className: 'dsh-is-content' },
            h('header', { className: 'dsh-is-head' },
              h('h1', { className: 'dsh-is-title' }, t('title')),
              items.length > 0 && h('span', { className: 'dsh-is-count' },
                `${items.length} ${t(items.length === 1 ? 'countOne' : 'count')}`),
            ),
            h('p', { className: 'dsh-is-hint' }, t('hint')),
            h('div', { className: 'dsh-is-chips', role: 'group', 'aria-label': t('categories') },
              favorites.categories.map(category => h('button', {
                key: category.id,
                type: 'button',
                className: 'dsh-is-chip',
                'aria-pressed': filter === category.id,
                onClick: () => setFilter(category.id),
              }, category.name, h('span', { className: 'dsh-is-chipcount' }, favorites.counts.get(category.id) || 0))),
              h('button', { type: 'button', className: 'dsh-is-manage', onClick: openManager }, t('manageCategories')),
            ),
            items.length === 0
              ? h('div', { className: 'dsh-is-empty', role: 'status' },
                  h('span', { className: 'dsh-is-empty-star' }, h(StarGlyph, { size: 40 })),
                  h('h2', null, t('emptyTitle')),
                  h('p', null, t('emptyBody')),
                )
              : visible.length === 0
                ? h('div', { className: 'dsh-is-empty', role: 'status' },
                    h('span', { className: 'dsh-is-empty-star' }, h(StarGlyph, { size: 40 })),
                    h('h2', null, t('emptyFilteredTitle', { name: selectedCategory ? selectedCategory.name : '' })),
                    h('p', null, t('emptyFilteredBody')),
                  )
                : h('ul', { className: 'dsh-is-list', 'aria-label': t('title') },
                    visible.map(item => {
                      const summary = summaries[item.id]
                      const title = (summary && summary.displayTitle) || item.title || t('untitled')
                      const meta = [
                        folderName(summary && summary.cwd),
                        formatTime((summary && summary.updatedAt) || item.savedAt),
                      ].filter(part => part !== '')
                      const current = item.id === currentId
                      const isArchived = archived.has(item.id)
                      const classes = [
                        'dsh-is-row',
                        current && !isArchived ? 'dsh-is-row-current' : '',
                        isArchived ? 'dsh-is-row-archived' : '',
                      ].filter(Boolean).join(' ')
                      const tags = item.categories
                        .map(categoryId => categoryById.get(categoryId))
                        .filter(Boolean)
                        .map(category => category.name)
                      if (tags.length === 0) tags.push(t('uncategorized'))
                      return h('li', { key: item.id, className: classes },
                        h('button', {
                          type: 'button',
                          className: 'dsh-is-open',
                          title: isArchived ? t('archived') : title,
                          'aria-label': `${t('open')}: ${title}`,
                          'aria-current': current && !isArchived ? 'true' : undefined,
                          'aria-disabled': isArchived ? 'true' : undefined,
                          disabled: isArchived,
                          onClick: () => { if (!isArchived) props.openSession(item.id) },
                        },
                          h('span', { className: 'dsh-is-text' },
                            h('span', { className: 'dsh-is-name' }, title),
                            h('span', { className: 'dsh-is-meta' },
                              isArchived && h('span', { className: 'dsh-is-tag' }, t('archived')),
                              tags.map((name, index) => h('span', { key: index, className: 'dsh-is-tag' }, name)),
                              meta.length > 0 && h('span', { className: 'dsh-is-metatext' }, meta.join(' · ')),
                            ),
                          ),
                        ),
                        h('button', {
                          type: 'button',
                          className: 'dsh-is-remove',
                          title: t('editCategories'),
                          'aria-label': `${t('editCategories')}: ${title}`,
                          onClick: () => openEditor(item.id, title),
                        }, h(StarGlyph, { size: 16, filled: true })),
                      )
                    }),
                  ),
            h('p', { className: 'dsh-is-note' }, t('localOnly')),
          ),
        ),
      )
    }

    // ---------------------------------------------------------------------
    // Styles and plugin body
    // ---------------------------------------------------------------------

    const STYLES = `
.dsh-is-page{display:flex;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.6}
.dsh-is-scroll{flex:1;min-height:0;overflow:auto;scrollbar-gutter:stable}
.dsh-is-content{max-width:960px;margin:0 auto;padding:0 clamp(24px,4vw,48px) 48px}
.dsh-is-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;margin:0 0 8px;padding-top:28px}
[data-platform='darwin'] .dsh-is-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.dsh-is-title{margin:0;font-size:20px;line-height:28px;font-weight:500}
.dsh-is-count{font-size:12px;color:var(--dsw-alias-label-secondary)}
.dsh-is-hint{margin:0 0 20px;max-width:680px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.dsh-is-chips{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 18px}
.dsh-is-chip{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
@media (hover:hover){.dsh-is-chip:hover{background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-is-chip[aria-pressed="true"]{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.dsh-is-chipcount{font-size:11px;color:var(--dsw-alias-label-tertiary)}
.dsh-is-manage{margin-left:auto;height:28px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}
@media (hover:hover){.dsh-is-manage:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}}
.dsh-is-list{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}
.dsh-is-row{display:flex;align-items:center;gap:4px;border-radius:10px}
.dsh-is-row-current{background:var(--dsw-alias-bg-layer-2)}
@media (hover:hover){.dsh-is-row:hover{background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-is-open{display:flex;flex:1;align-items:center;min-width:0;padding:10px 8px;border:0;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dsh-is-open:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dsh-is-row-archived .dsh-is-open{cursor:default}
.dsh-is-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsh-is-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:20px}
.dsh-is-row-archived .dsh-is-name{color:var(--dsw-alias-label-secondary)}
.dsh-is-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-is-metatext{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-is-tag{flex:none;padding:0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.dsh-is-remove:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}
.dsh-is-remove{display:inline-flex;flex:none;align-items:center;justify-content:center;width:32px;height:32px;margin-right:4px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-brand-primary);cursor:pointer}
@media (hover:hover){.dsh-is-remove:hover{background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-is-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:72px 16px;text-align:center}
.dsh-is-empty-star{display:inline-flex;color:var(--dsw-alias-label-tertiary);opacity:.7}
.dsh-is-empty h2{margin:0;font-size:15px;line-height:22px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dsh-is-empty p{max-width:380px;margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.dsh-is-note{margin:24px 0 0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsh-is-util{display:inline-flex;flex:none;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:28px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dsh-is-util:focus-visible{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}
@media (hover:hover){.dsh-is-util:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-is-util[data-active="true"]{color:var(--dsw-alias-brand-primary)}
.dsh-is-rowstar{display:inline-flex;flex:none;align-items:center;justify-content:center;width:24px;height:24px;margin:-4px;padding:0;border:0;border-radius:var(--dsw-radius-xs);background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
.dsh-is-rowstar:focus-visible{outline-offset:-2px}
@media (hover:hover){.dsh-is-rowstar:hover{color:var(--dsw-alias-label-primary)}}
.dsh-is-rowstar[data-active="true"]{color:var(--dsw-alias-brand-primary)}
.dsh-is-dialog{border:0;padding:0;border-radius:16px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 64px);box-shadow:0 24px 64px rgba(15,20,32,.28);font-size:14px;line-height:1.5;pointer-events:auto}
.dsh-is-dialog::backdrop{background:rgba(15,20,32,.34)}
.dsh-is-dialog-body{display:flex;flex-direction:column;gap:14px;max-height:calc(100vh - 64px);padding:20px;overflow:auto}
.dsh-is-dialog-title{margin:0;font-size:16px;line-height:24px;font-weight:500}
.dsh-is-dialog-sub{margin:-8px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-is-catlist{display:flex;flex-direction:column;gap:2px;max-height:260px;margin:0 -6px;padding:2px 6px;overflow:auto}
.dsh-is-catrow{display:flex;align-items:center;gap:10px;min-height:34px;padding:0 8px;border-radius:8px;cursor:pointer}
@media (hover:hover){.dsh-is-catrow:hover{background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-is-catrow input{flex:none;width:16px;height:16px;margin:0;accent-color:var(--dsw-alias-brand-primary)}
.dsh-is-catname{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-is-catmanage{display:flex;flex-direction:column;gap:6px}
.dsh-is-catmanage-row{display:flex;align-items:center;gap:8px}
.dsh-is-newcat{display:flex;align-items:center;gap:8px}
.dsh-is-input{flex:1;min-width:0;height:32px;padding:0 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.dsh-is-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.dsh-is-btn{height:32px;padding:0 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer}
@media (hover:hover){.dsh-is-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}}
.dsh-is-btn:disabled{opacity:.45;cursor:default}
.dsh-is-btn-primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:var(--dsw-alias-label-primary-foreground)}
.dsh-is-btn-small{height:26px;padding:0 8px;border-radius:6px;font-size:12px}
.dsh-is-btn-danger{color:var(--dsw-alias-state-error-primary);background:transparent;border-color:transparent}
.dsh-is-dialog-actions{display:flex;align-items:center;gap:8px;margin-top:2px}
.dsh-is-spacer{flex:1}
.dsh-is-hint-small{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}
.dsh-is-error{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)}
@media (prefers-reduced-motion:no-preference){.dsh-is-rowstar,.dsh-is-util,.dsh-is-chip,.dsh-is-remove{transition:background-color .12s ease,color .12s ease}}
`

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply(ctx) {
        const locale = ctx.get('locale')
        if (locale === undefined) return
        const t = locale.bind(NS)

        ctx.effect(() => locale.register(NS, { zh: ZH, en: EN }), 'important-sessions: dictionaries')

        ctx.effect(() => {
          const element = document.createElement('style')
          element.setAttribute('data-dsh-plugin', 'important-sessions')
          element.textContent = STYLES
          document.head.appendChild(element)
          return () => { element.remove() }
        }, 'important-sessions: styles')

        ctx.effect(() => () => {
          overlayState = { editor: null, managing: false }
        }, 'important-sessions: overlay reset')

        ctx.effect(() => {
          const onStorage = event => {
            // key === null means another window called localStorage.clear().
            if (event.key !== STORAGE_KEY && event.key !== null) return
            replaceFromStorage()
          }
          window.addEventListener('storage', onStorage)
          return () => { window.removeEventListener('storage', onStorage) }
        }, 'important-sessions: cross-window sync')

        const openSession = (sessionId) => {
          const uiWorkspace = ctx.get('uiWorkspace')
          if (uiWorkspace === undefined) return
          try {
            uiWorkspace.openSession(sessionId)
          } catch (error) {
            console.error('important-sessions: opening the session failed', error)
          }
        }

        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 15,
          label: () => t('panel'),
          locale: NS,
        }, PanelIcon))

        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
          inject: () => ({ openSession }),
        }, FavoritesPage))

        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'important-sessions-star',
          order: -1,
          locale: NS,
        }, HeaderFavorite))

        ctx.slots.inject('sidebar.workspaces.session.row.action', () => ctx.slots.register({
          name: 'sidebar.workspaces.session.row.action',
          id: 'important-sessions-star',
          order: 300,
          locale: NS,
        }, RowFavorite))

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'important-sessions-dialogs',
          locale: NS,
        }, DialogHost))
      },
    }
  },
})
