import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { Activity, BarChart3, GitCompare, MessageSquare, FolderOpen, DollarSign, CreditCard, Sun, Moon, RefreshCw, AlertTriangle, Github, Terminal, Users, Plug, Copy, Check, Settings as SettingsIcon, Package, Menu, PanelLeftClose } from 'lucide-react'
import { fetchOverview, refetchAgents, fetchMode, fetchRelayConfig, getAuthToken, setOnAuthFailure } from './lib/api'
import { useTheme } from './lib/theme'
import { useLive } from './hooks/useLive'
import AnimatedLogo from './components/AnimatedLogo'
import AnimatedLoader from './components/AnimatedLoader'
import LoginScreen from './components/LoginScreen'
import Dashboard from './pages/Dashboard'
import Sessions from './pages/Sessions'
import DeepAnalysis from './pages/DeepAnalysis'
import Compare from './pages/Compare'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import CostAnalysis from './pages/CostAnalysis'
import Artifacts from './pages/Artifacts'
import Settings from './pages/Settings'
import Subscriptions from './pages/Subscriptions'
import MCPs from './pages/MCPs'
import RelayDashboard from './pages/RelayDashboard'
import RelayUserDetail from './pages/RelayUserDetail'

function SidebarLink({ to, icon: Icon, label, end, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `sidebar-link flex items-center gap-2.5 px-2.5 py-1.5 text-[12px] transition ${
          isActive
            ? 'bg-[var(--c-bg3)] text-[var(--c-white)]'
            : 'text-[var(--c-text2)] hover:text-[var(--c-white)] hover:bg-[var(--c-bg3)]'
        } ${collapsed ? 'justify-center px-0' : ''}`
      }
    >
      <Icon size={14} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

function SidebarGroup({ label, items, collapsed, onNavigate }) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <div className="px-2.5 mb-1.5 text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--c-text3)' }}>
          {label}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.to === '/'}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [overview, setOverview] = useState(null)
  const [refetchState, setRefetchState] = useState(null)
  const { live, toggle: toggleLive } = useLive()
  const [mode, setMode] = useState(null)
  const [needsAuth, setNeedsAuth] = useState(false)
  const [authed, setAuthed] = useState(!!getAuthToken())
  const liveRef = useRef(null)
  const { dark, toggle } = useTheme()
  const [mcpOpen, setMcpOpen] = useState(false)
  const [mcpCopied, setMcpCopied] = useState(false)
  const [relayPassword, setRelayPassword] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    setOnAuthFailure(() => setAuthed(false))
  }, [])

  useEffect(() => {
    fetchMode().then(data => {
      setMode(data.mode || 'local')
      setNeedsAuth(!!data.auth)
    })
  }, [])

  useEffect(() => {
    if (mode === 'relay' && authed) {
      fetchRelayConfig().then(c => setRelayPassword(c.relayPassword || '')).catch(() => {})
    }
  }, [mode, authed])

  const refreshOverview = useCallback(() => {
    fetchOverview().then(setOverview).catch(() => {})
  }, [])

  useEffect(() => {
    if (mode === 'local') refreshOverview()
  }, [mode])

  const rescanAndRefresh = useCallback(async (onProgress) => {
    await refetchAgents(onProgress)
    const data = await fetchOverview()
    setOverview(data)
  }, [])

  useEffect(() => {
    if (live && mode === 'local') {
      liveRef.current = setInterval(() => {
        rescanAndRefresh().catch(() => {})
      }, 60000)
    } else {
      if (liveRef.current) clearInterval(liveRef.current)
      liveRef.current = null
    }
    return () => { if (liveRef.current) clearInterval(liveRef.current) }
  }, [live, rescanAndRefresh])

  const location = useLocation()
  const isFullWidth = location.pathname === '/artifacts'

  // Close mobile nav on route change or resize to desktop
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileNavOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleRefetch = async () => {
    setRefetchState({ scanned: 0, total: 0 })
    try {
      await rescanAndRefresh((p) => setRefetchState({ scanned: p.scanned, total: p.total }))
    } catch (e) { console.error(e) }
    setRefetchState(null)
  }

  const isRelay = mode === 'relay'
  const showLogin = isRelay && needsAuth && !authed

  const navGroups = isRelay
    ? [{ label: 'Team', items: [{ to: '/', icon: Users, label: 'Team' }] }]
    : [
        { label: 'Overview', items: [{ to: '/', icon: Activity, label: 'Dashboard' }] },
        {
          label: 'Explore',
          items: [
            { to: '/sessions', icon: MessageSquare, label: 'Sessions' },
            { to: '/projects', icon: FolderOpen, label: 'Projects' },
            { to: '/artifacts', icon: Package, label: 'Artifacts' },
          ],
        },
        {
          label: 'Analyze',
          items: [
            { to: '/costs', icon: DollarSign, label: 'Cost Analysis' },
            { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
            { to: '/analysis', icon: BarChart3, label: 'Deep Analysis' },
            { to: '/compare', icon: GitCompare, label: 'Compare' },
            { to: '/mcps', icon: Plug, label: 'MCPs' },
          ],
        },
      ]

  const closeMobile = () => setMobileNavOpen(false)
  const sidebarWidth = sidebarCollapsed ? 56 : 200

  if (showLogin) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />
  }

  const sidebarContent = (collapsed, onNavigate) => (
    <>
      <div className={`flex items-center gap-2 px-3 h-12 border-b flex-shrink-0 ${collapsed ? 'justify-center px-0' : ''}`} style={{ borderColor: 'var(--c-border)' }}>
        <AnimatedLogo size={18} />
        {!collapsed && (
          <span className="text-xs font-bold tracking-tight truncate" style={{ color: 'var(--c-white)' }}>
            Agentlytics
            {isRelay && (
              <span className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                relay
              </span>
            )}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3">
        {navGroups.map((group) => (
          <SidebarGroup
            key={group.label}
            label={group.label}
            items={group.items}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="px-2 py-3 border-t flex-shrink-0" style={{ borderColor: 'var(--c-border)' }}>
        <SidebarLink
          to="/settings"
          icon={SettingsIcon}
          label="Settings"
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <button
          onClick={() => setSidebarCollapsed(c => !c)}
          className={`hidden md:flex items-center gap-2.5 px-2.5 py-1.5 text-[12px] w-full mt-0.5 transition text-[var(--c-text2)] hover:text-[var(--c-white)] hover:bg-[var(--c-bg3)] ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeftClose size={14} className={`flex-shrink-0 transition ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside
        className="app-sidebar hidden md:flex flex-col fixed top-0 left-0 h-screen z-40 border-r"
        style={{
          width: sidebarWidth,
          background: 'var(--c-bg2)',
          borderColor: 'var(--c-border)',
          transition: 'width 0.15s ease',
        }}
      >
        {sidebarContent(sidebarCollapsed)}
      </aside>

      {/* Mobile overlay sidebar */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeMobile} />
          <aside
            className="app-sidebar flex md:hidden flex-col fixed top-0 left-0 h-screen z-50 border-r sidebar-slide-left"
            style={{ width: 220, background: 'var(--c-bg2)', borderColor: 'var(--c-border)' }}
          >
            {sidebarContent(false, closeMobile)}
          </aside>
        </>
      )}

      {/* Main column */}
      <div className={`app-main flex-1 flex flex-col min-w-0 min-h-screen ${sidebarCollapsed ? 'app-main--collapsed' : ''}`}>
          <header
            className="border-b px-4 h-12 flex items-center gap-3 sticky top-0 z-30 backdrop-blur-xl flex-shrink-0"
            style={{ borderColor: 'var(--c-border)', background: 'var(--c-header)' }}
          >
            <button
              className="md:hidden p-1.5 transition hover:bg-[var(--c-card)]"
              style={{ color: 'var(--c-text2)' }}
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={16} />
            </button>

            <span className="md:hidden flex items-center gap-1.5 text-xs font-bold tracking-tight" style={{ color: 'var(--c-white)' }}>
              <AnimatedLogo size={16} />
              Agentlytics
            </span>

            <div className="ml-auto flex items-center gap-3">
              {!isRelay && (
                <>
                  <button
                    onClick={toggleLive}
                    className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] transition"
                    style={{
                      color: live ? '#22c55e' : 'var(--c-text3)',
                      border: live ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--c-border)',
                      background: live ? 'rgba(34,197,94,0.08)' : 'transparent',
                    }}
                    title={live ? 'Disable live refresh' : 'Enable live refresh (every 60s)'}
                  >
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${live ? 'pulse-dot' : ''}`}
                      style={{ background: live ? '#22c55e' : 'var(--c-text3)' }}
                    />
                    Live
                  </button>
                  <button
                    onClick={handleRefetch}
                    disabled={!!refetchState}
                    className="flex items-center gap-1 px-2 py-0.5 text-[11px] transition hover:bg-[var(--c-card)]"
                    style={{ color: 'var(--c-text2)', border: '1px solid var(--c-border)' }}
                    title="Clear cache and rescan all editors"
                  >
                    <RefreshCw size={10} className={refetchState ? 'animate-spin' : ''} />
                    {refetchState
                      ? `Refetching (${refetchState.scanned}/${refetchState.total})...`
                      : 'Refetch'}
                  </button>
                  <span className="hidden sm:inline text-[11px]" style={{ color: 'var(--c-text2)' }}>
                    {overview ? `${overview.totalChats} sessions` : '...'}
                  </span>
                </>
              )}
              {isRelay && (
                <button
                  onClick={() => { setMcpOpen(true); setMcpCopied(false) }}
                  className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] transition hover:bg-[var(--c-card)]"
                  style={{ color: '#818cf8', border: '1px solid var(--c-border)' }}
                  title="MCP Connection"
                >
                  <Plug size={10} />
                  Connect
                </button>
              )}
              <button
                onClick={toggle}
                className="p-1 transition hover:bg-[var(--c-card)]"
                style={{ color: 'var(--c-text2)' }}
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? <Sun size={13} /> : <Moon size={13} />}
              </button>
            </div>
          </header>

          {refetchState && (
            <div className="flex items-center gap-2 px-4 py-1.5 text-[12px] flex-shrink-0" style={{ background: 'rgba(234,179,8,0.08)', borderBottom: '1px solid rgba(234,179,8,0.15)', color: '#ca8a04' }}>
              <AlertTriangle size={12} />
              <span>Devin, Devin Next, and Antigravity require their app to be running during refetch — otherwise their sessions won't be detected.</span>
            </div>
          )}

          <main className={
            isRelay
              ? 'flex-1 px-0'
              : isFullWidth
                ? 'flex-1 p-0 overflow-hidden min-h-0'
                : 'flex-1 p-4 max-w-[1400px] w-full mx-auto'
          }>
            {mode === null ? (
              <AnimatedLoader label="Loading..." />
            ) : isRelay ? (
              <Routes>
                <Route path="/" element={<RelayDashboard />} />
                <Route path="/relay" element={<RelayDashboard />} />
                <Route path="/relay/user/:username" element={<RelayUserDetail />} />
              </Routes>
            ) : (
              <Routes>
                <Route path="/" element={<Dashboard overview={overview} />} />
                <Route path="/projects" element={<Projects overview={overview} />} />
                <Route path="/projects/detail" element={<ProjectDetail />} />
                <Route path="/sessions" element={<Sessions overview={overview} />} />
                <Route path="/costs" element={<CostAnalysis overview={overview} />} />
                <Route path="/analysis" element={<DeepAnalysis overview={overview} />} />
                <Route path="/compare" element={<Compare overview={overview} />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/artifacts" element={<Artifacts />} />
                <Route path="/mcps" element={<MCPs />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            )}
          </main>

          <footer
            className={`border-t mt-auto px-4 py-3 flex items-center justify-between text-[11px]${isFullWidth ? ' hidden' : ''}`}
            style={{ borderColor: 'var(--c-border)', color: 'var(--c-text3)' }}
          >
            <div className="flex items-center gap-3">
              <a href="https://github.com/f/agentlytics" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[var(--c-text)] transition">
                <Github size={11} />
                <span>GitHub</span>
              </a>
              <span className="flex items-center gap-1">
                <Terminal size={11} />
                <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>npx agentlytics</code>
              </span>
            </div>
            <span>
              built by <a href="https://github.com/f" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--c-text)] transition" style={{ color: 'var(--c-text2)' }}>fkadev</a>
            </span>
          </footer>
      </div>

      {/* MCP Config Modal */}
      {mcpOpen && (
        <>
          <div className="fixed inset-0 z-[60]" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMcpOpen(false)} />
          <div
            className="fixed z-[70] w-[440px] max-w-[90vw] p-5 shadow-2xl"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13px] font-bold" style={{ color: 'var(--c-white)' }}>
                <Plug size={13} className="inline mr-1.5" style={{ color: '#818cf8' }} />
                Connection Config
              </div>
              <button onClick={() => setMcpOpen(false)} className="text-[18px] leading-none px-1 hover:opacity-70 transition" style={{ color: 'var(--c-text3)' }}>&times;</button>
            </div>

            <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-white)' }}>MCP Config</div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px]" style={{ color: 'var(--c-text3)' }}>Add to your AI client's MCP settings</div>
              <button
                onClick={() => {
                  const json = JSON.stringify({ "mcpServers": { "agentlytics": { "url": `${window.location.origin}/mcp` } } }, null, 2)
                  navigator.clipboard.writeText(json)
                  setMcpCopied(true)
                  setTimeout(() => setMcpCopied(false), 2000)
                }}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] transition hover:bg-[var(--c-bg3)]"
                style={{ border: '1px solid var(--c-border)', color: mcpCopied ? '#22c55e' : 'var(--c-text2)' }}
              >
                {mcpCopied ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
              </button>
            </div>
            <pre
              className="text-[11px] px-3 py-2 overflow-x-auto mb-4"
              style={{ background: 'var(--c-bg3)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}
            >{`{\n  "mcpServers": {\n    "agentlytics": {\n      "url": "${window.location.origin}/mcp"\n    }\n  }\n}`}</pre>

            <div className="text-[12px] font-medium mb-1.5" style={{ color: 'var(--c-white)' }}>Join Command</div>
            <div className="text-[10px] mb-1" style={{ color: 'var(--c-text3)' }}>Share with your team to start syncing sessions</div>
            <pre
              className="text-[11px] px-3 py-2 overflow-x-auto"
              style={{ background: 'var(--c-bg3)', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6 }}
            >{`cd /path/to/your-project\nRELAY_PASSWORD=${relayPassword || '<pass>'} npx agentlytics --join ${window.location.host}`}</pre>
          </div>
        </>
      )}
    </div>
  )
}
