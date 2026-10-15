/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { Home } from '..'
import { GatewayIllustration } from '../components/gateway-illustration'
import { HeroBanner } from '../components/hero-banner'
import { HeroTerminalDemo } from '../components/hero-terminal-demo'

let client: QueryClient
const originalConfig = useSystemConfigStore.getState()

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(
    function (this: HTMLMediaElement) {
      Object.defineProperty(this, 'paused', {
        configurable: true,
        value: false,
      })
      this.dispatchEvent(new Event('play'))
      this.dispatchEvent(new Event('playing'))
      return Promise.resolve()
    }
  )
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(
    function (this: HTMLMediaElement) {
      if (this.paused) return
      Object.defineProperty(this, 'paused', { configurable: true, value: true })
      this.dispatchEvent(new Event('pause'))
    }
  )
  localStorage.clear()
  useAuthStore.getState().auth.reset()
  useSystemConfigStore.setState({ ...originalConfig, loading: false })
  client = new QueryClient({
    defaultOptions: {
      queries: { enabled: false, retry: false },
      mutations: { retry: false },
    },
  })
  client.setQueryData(STATUS_QUERY_KEY, {})
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().auth.reset()
  useSystemConfigStore.setState(originalConfig)
  localStorage.clear()
})

async function renderHome(content: string | Promise<string> = '') {
  vi.spyOn(api, 'get').mockImplementation(async () => ({
    data: { success: true, data: await content },
  }))
  const root = createRootRoute()
  const route = createRoute({
    getParentRoute: () => root,
    path: '/',
    component: Home,
  })
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await act(() => router.load())
}

describe('default home page', () => {
  it('omits the footer promotional block while preserving attribution and configured legal links', async () => {
    client.setQueryData(STATUS_QUERY_KEY, {
      user_agreement_enabled: true,
      privacy_policy_enabled: true,
    })
    await renderHome()
    const footer = await screen.findByRole('contentinfo')
    expect(
      within(footer).queryByText('Powerful API Management Platform')
    ).not.toBeInTheDocument()
    expect(within(footer).queryByRole('img')).not.toBeInTheDocument()
    expect(footer).toHaveTextContent('footer.defaultCopyright')
    expect(
      within(footer).getByRole('link', { name: /^New API$/ })
    ).toHaveAttribute('href', 'https://github.com/QuantumNous/new-api')
    expect(
      within(footer).getByRole('link', { name: 'User Agreement' })
    ).toHaveAttribute('href', '/user-agreement')
    expect(
      within(footer).getByRole('link', { name: 'Privacy Policy' })
    ).toHaveAttribute('href', '/privacy-policy')
  })

  it('preserves configured footer HTML when the default footer promotion is omitted', async () => {
    useSystemConfigStore.setState({
      config: {
        ...originalConfig.config,
        footerHtml: '<a href="/about">Configured footer link</a>',
      },
    })
    await renderHome()
    const footer = await screen.findByRole('contentinfo')
    expect(
      within(footer).getByRole('link', { name: 'Configured footer link' })
    ).toHaveAttribute('href', '/about')
    expect(
      within(footer).getByRole('link', { name: /^New API$/ })
    ).toHaveAttribute('href', 'https://github.com/QuantumNous/new-api')
  })

  it('keeps demo-site footer resource links when the promotional block is omitted', async () => {
    useSystemConfigStore.setState({
      config: {
        ...originalConfig.config,
        demoSiteEnabled: true,
      },
    })
    await renderHome()
    const footer = await screen.findByRole('contentinfo')
    expect(
      within(footer).getByRole('link', {
        name: 'footer.columns.docs.links.quickStart',
      })
    ).toHaveAttribute('href', 'https://docs.newapi.pro/getting-started/')
    expect(
      within(footer).queryByText('Powerful API Management Platform')
    ).not.toBeInTheDocument()
  })

  it('keeps the loading state until custom content is resolved without flashing the default home', async () => {
    let resolveContent: (content: string) => void = () => undefined
    const pending = new Promise<string>((resolve) => {
      resolveContent = resolve
    })
    await renderHome(pending)
    expect(await screen.findByText('Loading...')).toBeVisible()
    expect(document.querySelector('.home-landing')).toBeNull()
    await act(async () => resolveContent(''))
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'One gateway for every model.'
    )
  })

  it('keeps registration, pricing, documentation and the feature anchor available for visitors', async () => {
    await renderHome()
    const heading = await screen.findByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('One gateway for every model.')
    const main = screen.getByRole('main')
    expect(
      within(main).getAllByRole('link', { name: 'Get Started' })
    ).toHaveLength(1)
    expect(
      screen.getByRole('banner').querySelector('a[href="/pricing"]')
    ).toBeVisible()
    expect(
      within(main).queryByRole('heading', {
        name: 'Your next great idea starts here.',
      })
    ).not.toBeInTheDocument()
    expect(
      within(main).getAllByRole('link', { name: 'Get Started' })[0]
    ).toHaveAttribute('href', '/sign-up')
    expect(within(main).getByRole('link', { name: 'Docs' })).toHaveAttribute(
      'href',
      'https://docs.newapi.pro'
    )
    const anchor = within(main).getByRole('link', {
      name: 'Explore the possibilities',
    })
    expect(anchor).toHaveAttribute('href', '#home-features')
    const features = within(main).getByRole('region', {
      name: /Powerful by nature\./,
    })
    expect(features).toHaveAttribute('id', 'home-features')
    expect(within(features).getAllByRole('article')).toHaveLength(4)
    expect(
      within(main).getByRole('link', { name: 'Cherry Studio' })
    ).toHaveAttribute('href', 'https://cherry-ai.com')
    expect(
      within(main).getByRole('link', { name: 'CC Switch' })
    ).toHaveAttribute('href', 'https://ccswitch.io')
  })

  it('keeps the primary actions usable when the decorative banner fails to load', async () => {
    await renderHome()
    const main = await screen.findByRole('main')
    const banner = main.querySelector<HTMLImageElement>('.home-hero-image')
    expect(banner).not.toBeNull()
    if (!banner) throw new Error('Missing home banner')
    expect(banner).toHaveAttribute('alt', '')
    expect(banner.parentElement).toHaveAttribute('aria-hidden', 'true')
    fireEvent.error(banner)
    expect(within(main).getByRole('heading', { level: 1 })).toBeVisible()
    const start = within(main).getAllByRole('link', { name: 'Get Started' })[0]
    act(() => start.focus())
    expect(start).toHaveFocus()
    expect(start).toHaveAttribute('href', '/sign-up')
    expect(within(main).getByRole('link', { name: 'Docs' })).toBeVisible()
  })

  it('shows the existing dashboard destination instead of registration CTAs for signed-in users', async () => {
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'home-test', role: 1 })
    await renderHome()
    await screen.findByRole('heading', { level: 1 })
    const main = screen.getByRole('main')
    expect(
      within(main).getByRole('link', { name: 'Go to Dashboard' })
    ).toHaveAttribute('href', '/dashboard')
    expect(
      within(main).queryByRole('link', { name: 'Get Started' })
    ).not.toBeInTheDocument()
  })

  it.each([
    ['https://docs.example.test/guide', '_blank'],
    ['/about', null],
  ])(
    'preserves the configured documentation destination %s',
    async (href, target) => {
      client.setQueryData(STATUS_QUERY_KEY, { docs_link: href })
      await renderHome()
      const link = await within(await screen.findByRole('main')).findByRole(
        'link',
        { name: 'Docs' }
      )
      expect(link).toHaveAttribute('href', href)
      expect(link.getAttribute('target')).toBe(target)
      if (target) expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  )
})

describe('custom home content', () => {
  it('retains the cached custom page when refreshing its content fails', async () => {
    let rejectContent: (reason: Error) => void = () => undefined
    const pending = new Promise<string>((_resolve, reject) => {
      rejectContent = reject
    })
    localStorage.setItem('home_page_content', '# Cached welcome')
    await renderHome(pending)
    await act(async () => rejectContent(new Error('Network unavailable')))
    expect(
      await screen.findByRole('heading', { name: 'Cached welcome' })
    ).toBeVisible()
    expect(document.querySelector('.home-landing')).toBeNull()
  })

  it('renders configured Markdown instead of the redesigned default home', async () => {
    await renderHome('# Custom welcome\n\n[Guide](/about)')
    expect(
      await screen.findByRole('heading', { name: 'Custom welcome' })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Guide' })).toHaveAttribute(
      'href',
      '/about'
    )
    expect(document.querySelector('.home-landing')).toBeNull()
  })

  it('keeps configured HTML isolated from the landing-page styles', async () => {
    await renderHome('<html><body><h1>Custom HTML home</h1></body></html>')
    await waitFor(() =>
      expect(
        document.querySelector('.custom-home-content')?.shadowRoot?.textContent
      ).toContain('Custom HTML home')
    )
    expect(document.querySelector('.home-landing')).toBeNull()
  })

  it('preserves the custom URL sandbox and sends theme and language on load', async () => {
    await renderHome('https://home.example.test/')
    const frame = await screen.findByTitle('Custom Home Page')
    expect(frame).toHaveAttribute('src', 'https://home.example.test/')
    expect(frame).toHaveAttribute(
      'sandbox',
      'allow-forms allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation-by-user-activation'
    )
    expect(document.querySelector('.home-landing')).toBeNull()
    const frameWindow = (frame as HTMLIFrameElement).contentWindow
    expect(frameWindow).not.toBeNull()
    if (!frameWindow) throw new Error('Missing iframe window')
    const postMessage = vi.spyOn(frameWindow, 'postMessage')
    fireEvent.load(frame)
    expect(postMessage).toHaveBeenCalledWith({ themeMode: 'light' }, '*')
    expect(postMessage).toHaveBeenCalledWith({ lang: 'en' }, '*')
  })
})

describe('home examples and ambient animation', () => {
  it('autoplays the AI banner without player controls when reduced motion is not requested', () => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: false,
    }))
    const { container } = render(<HeroBanner />)
    const video = container.querySelector('video')
    expect(video).not.toBeNull()
    expect(video?.muted).toBe(true)
    expect(video?.loop).toBe(true)
    expect(video?.playsInline).toBe(true)
    expect(video?.autoplay).toBe(true)
    expect(video?.controls).toBe(false)
    expect(video?.paused).toBe(false)
    expect(video).toHaveAttribute(
      'src',
      '/videos/home/gateway-neural-light.mp4'
    )
    expect(video).toHaveAttribute('preload', 'none')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not add a decorative video or playback controls to the keyboard focus order', async () => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: false,
    }))
    const user = userEvent.setup()
    const { container } = render(
      <>
        <HeroBanner />
        <a href='/sign-up'>Get Started</a>
      </>
    )
    const video = container.querySelector('video')
    await user.tab()
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveFocus()
    expect(video).toHaveAttribute('tabindex', '-1')
    expect(video?.parentElement).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses a static AI poster for reduced motion without exposing player controls', () => {
    const { container } = render(<HeroBanner />)
    const video = container.querySelector('video')
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
    expect(video?.paused).toBe(true)
    expect(video?.autoplay).toBe(false)
    expect(container.querySelector('.home-hero-image')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps the poster without adding controls when the browser blocks autoplay', async () => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: false,
    }))
    const blockedPlayback = Promise.reject(
      new DOMException('Autoplay blocked', 'NotAllowedError')
    )
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(
      blockedPlayback
    )
    const { container } = render(<HeroBanner />)
    await act(async () => {
      await blockedPlayback.catch(() => undefined)
    })
    expect(container.querySelector('video')).toHaveAttribute(
      'data-ready',
      'false'
    )
    expect(container.querySelector('.home-hero-image')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('ignores an old playback rejection after returning to a visible tab', async () => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: false,
    }))
    let rejectPlayback: (reason: Error) => void = () => undefined
    const pendingPlayback = new Promise<void>((_, reject) => {
      rejectPlayback = reject
    })
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementationOnce(
      function (this: HTMLMediaElement) {
        Object.defineProperty(this, 'paused', {
          configurable: true,
          value: false,
        })
        this.dispatchEvent(new Event('play'))
        return pendingPlayback
      }
    )
    const visibility = vi
      .spyOn(document, 'hidden', 'get')
      .mockReturnValue(false)
    const { container } = render(<HeroBanner />)
    visibility.mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    visibility.mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    await act(async () => {
      rejectPlayback(
        new DOMException('Old request cancelled', 'NotAllowedError')
      )
    })
    expect(container.querySelector('video')?.paused).toBe(false)
    expect(container.querySelector('video')).toHaveAttribute(
      'data-ready',
      'true'
    )
  })

  it('keeps the decorative poster when video loading fails', () => {
    const { container } = render(<HeroBanner />)
    const video = container.querySelector('video')
    if (!video) throw new Error('Missing banner video')
    fireEvent.error(video)
    expect(container.querySelector('.home-hero-image')).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('suspends the ambient video in a hidden tab and resumes it automatically on return', () => {
    const matchMedia = window.matchMedia
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: false,
    }))
    const visibility = vi
      .spyOn(document, 'hidden', 'get')
      .mockReturnValue(false)
    const { container } = render(<HeroBanner />)
    const video = container.querySelector('video')
    expect(video?.paused).toBe(false)
    visibility.mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(video?.paused).toBe(true)
    visibility.mockReturnValue(false)
    fireEvent(document, new Event('visibilitychange'))
    expect(video?.paused).toBe(false)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps the configured brand and explanatory caption when canvas rendering is unavailable', () => {
    useSystemConfigStore.setState({
      config: {
        ...originalConfig.config,
        systemName: 'Gateway test',
        logo: '/custom-logo.png',
      },
    })
    render(
      <QueryClientProvider client={client}>
        <GatewayIllustration />
      </QueryClientProvider>
    )
    const figure = screen.getByRole('figure', {
      name: 'AI gateway routing illustration',
    })
    expect(figure).toHaveTextContent('Gateway test')
    expect(figure).toHaveTextContent(
      'Your applications. Your models. One connection.'
    )
    expect(figure.querySelector('img')).toHaveAttribute(
      'src',
      '/custom-logo.png'
    )
  })

  it('switches protocol examples with the keyboard and copies the selected request, not a stale example', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<HeroTerminalDemo />)
    const chat = screen.getByRole('tab', { name: 'Chat' })
    expect(chat).toHaveAttribute('aria-selected', 'true')
    act(() => chat.focus())
    await user.keyboard('{ArrowRight}{Enter}')
    expect(screen.getByRole('tab', { name: 'Responses' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent('/v1/responses')
    await user.click(
      screen.getByRole('button', { name: 'Copy request example' })
    )
    expect(writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('BASE_URL/v1/responses')
    )
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Gemini' }))
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveTextContent('/v1beta/models/your-model:generateContent')
    expect(
      within(panel).getByRole('button', { name: 'Copy request example' })
    ).toBeVisible()
    await user.click(
      within(panel).getByRole('button', { name: 'Copy request example' })
    )
    expect(writeText).toHaveBeenLastCalledWith(
      expect.stringContaining('x-goog-api-key: API_KEY')
    )
    expect(writeText).toHaveBeenLastCalledWith(
      expect.not.stringContaining('/v1/responses')
    )
  })

  it.each([
    ['Chat', '/v1/chat/completions', 'Authorization: Bearer API_KEY'],
    ['Responses', '/v1/responses', 'Authorization: Bearer API_KEY'],
    ['Claude', '/v1/messages', 'x-api-key: API_KEY'],
    [
      'Gemini',
      '/v1beta/models/your-model:generateContent',
      'x-goog-api-key: API_KEY',
    ],
  ])(
    'displays and copies the same simple placeholders for %s',
    async (protocol, endpoint, header) => {
      const user = userEvent.setup()
      const writeText = vi.spyOn(navigator.clipboard, 'writeText')
      render(<HeroTerminalDemo />)
      await user.click(screen.getByRole('tab', { name: protocol }))
      const panel = screen.getByRole('tabpanel')
      const command = panel.querySelector('pre')?.textContent
      expect(command).toContain(`curl "BASE_URL${endpoint}"`)
      expect(command).toContain(header)
      expect(command).not.toMatch(/\$|NEW_API_URL|NEW_API_KEY/)
      await user.click(
        within(panel).getByRole('button', { name: 'Copy request example' })
      )
      expect(writeText).toHaveBeenLastCalledWith(command)
      expect(
        screen.getByText(
          'Replace BASE_URL, API_KEY and your-model with your values.'
        )
      ).toBeVisible()
    }
  )

  it('shows a complete Claude request and wraps long code instead of clipping it on narrow screens', async () => {
    const user = userEvent.setup()
    render(<HeroTerminalDemo />)
    await user.click(screen.getByRole('tab', { name: 'Claude' }))
    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveTextContent('/v1/messages')
    expect(panel).toHaveTextContent('anthropic-version: 2023-06-01')
    expect(panel).toHaveTextContent('"max_tokens": 1024')
    expect(panel.querySelector('pre')).toHaveClass(
      'whitespace-pre-wrap',
      'break-all'
    )
    expect(panel.querySelector('pre')).not.toHaveClass('truncate')
  })

  it('allows keyboard users to pause and resume the decorative routing animation without affecting content', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={client}>
        <GatewayIllustration />
      </QueryClientProvider>
    )
    const toggle = screen.getByRole('button', { name: 'Pause animation' })
    const figure = screen.getByRole('figure', {
      name: 'AI gateway routing illustration',
    })
    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(figure).toHaveAttribute('data-paused', 'true')
    expect(figure).toHaveTextContent(
      'Your applications. Your models. One connection.'
    )
    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(figure).toHaveAttribute('data-paused', 'false')
  })
})
