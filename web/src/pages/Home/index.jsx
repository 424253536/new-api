/*
Copyright (C) 2025 QuantumNous

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

import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  API,
  copy,
  getLogo,
  getSystemName,
  showError,
  showSuccess,
} from '../../helpers';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import { IconCopy, IconGithubLogo, IconPlay } from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import { animate, createScope, createTimeline, stagger, utils } from 'animejs';
import './home.css';

const PROVIDER_PILLS = [
  'OpenAI',
  'Claude',
  'Gemini',
  'DeepSeek',
  'Anthropic',
  'Azure',
  'Bedrock',
  'Moonshot',
  'Qwen',
  'Cohere',
  'Vertex AI',
  'Groq',
];

const BAR_LEVELS = [28, 46, 58, 74, 52, 82, 64, 88];

const QUICK_COMMANDS = [
  {
    key: 'route.request',
    hint: 'Ctrl K',
    desc: '智能选择最优上游与 fallback',
  },
  {
    key: 'copy.base_url',
    hint: 'SDK',
    desc: '复制统一基址，直接替换现有接入',
  },
  {
    key: 'inspect.billing',
    hint: 'Live',
    desc: '查看额度、账单与实时用量状态',
  },
  {
    key: 'tail.logs',
    hint: 'Logs',
    desc: '审计日志与路由轨迹统一可追溯',
  },
];

const renderAnimatedTitle = (text, className) => (
  <span className={`nh-title-line ${className}`} data-text={text}>
    {text}
  </span>
);

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [endpointIndex, setEndpointIndex] = useState(0);
  const isMobile = useIsMobile();
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const systemName = getSystemName();
  const logo = getLogo();

  const heroRef = useRef(null);
  const scopeRef = useRef(null);
  const glowRef = useRef(null);
  const panelRef = useRef(null);

  const endpointPreview = Array.from({ length: 4 }, (_, offset) => {
    const nextIndex = (endpointIndex + offset) % API_ENDPOINTS.length;
    return API_ENDPOINTS[nextIndex];
  });
  const activeProviderIndex = endpointIndex % PROVIDER_PILLS.length;
  const activeCommandIndex = endpointIndex % QUICK_COMMANDS.length;

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    if (homePageContent !== '') {
      return undefined;
    }

    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % API_ENDPOINTS.length);
    }, 2800);

    return () => clearInterval(timer);
  }, [homePageContent]);

  useEffect(() => {
    if (!homePageContentLoaded || homePageContent !== '') return;
    if (!heroRef.current || scopeRef.current) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      heroRef.current.classList.add('nh-entrance-done');
      return;
    }

    scopeRef.current = createScope({ root: heroRef }).add(() => {
      createTimeline({
        defaults: { ease: 'out(3)', duration: 860 },
        onComplete: (self) => {
          heroRef.current?.classList.add('nh-entrance-done');
          utils.cleanInlineStyles(self);
        },
      })
        .add('.nh-anim-badge', {
          opacity: [0, 1],
          translateY: [24, 0],
        })
        .add(
          '.nh-anim-title',
          {
            opacity: [0, 1],
            translateY: [36, 0],
            duration: 1040,
          },
          120,
        )
        .add(
          '.nh-anim-desc',
          {
            opacity: [0, 1],
            translateY: [24, 0],
          },
          260,
        )
        .add(
          '.nh-anim-note',
          {
            opacity: [0, 1],
            translateY: [18, 0],
          },
          360,
        )
        .add(
          '.nh-anim-action',
          {
            opacity: [0, 1],
            translateY: [18, 0],
          },
          stagger(120, { start: 460 }),
        )
        .add(
          '.nh-anim-strip',
          {
            opacity: [0, 1],
            translateY: [18, 0],
          },
          620,
        )
        .add(
          '.nh-anim-panel',
          {
            opacity: [0, 1],
            translateX: [40, 0],
            translateY: [28, 0],
            scale: [0.96, 1],
            duration: 1120,
          },
          260,
        )
        .add(
          '.nh-endpoint-item',
          {
            opacity: [0, 1],
            translateX: [24, 0],
          },
          stagger(90, { start: 760 }),
        )
        .add(
          '.nh-bar',
          {
            opacity: [0, 1],
            scaleY: [0.65, 1],
            transformOrigin: ['50% 100%', '50% 100%'],
          },
          stagger(70, { start: 860 }),
        );
    });

    return () => {
      scopeRef.current?.revert();
      scopeRef.current = null;
    };
  }, [homePageContentLoaded, homePageContent]);

  useEffect(() => {
    if (!homePageContentLoaded || homePageContent !== '' || isMobile) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const heroEl = heroRef.current;
    const panelEl = panelRef.current;
    if (!heroEl || !panelEl) return;

    const handleMouseMove = (event) => {
      const rect = heroEl.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const rotateY = (x / rect.width - 0.5) * 10;
      const rotateX = (0.5 - y / rect.height) * 10;

      panelEl.style.setProperty(
        '--nh-panel-rotate-x',
        `${rotateX.toFixed(2)}deg`,
      );
      panelEl.style.setProperty(
        '--nh-panel-rotate-y',
        `${rotateY.toFixed(2)}deg`,
      );

      if (glowRef.current) {
        animate(glowRef.current, {
          left: `${x}px`,
          top: `${y}px`,
          opacity: 1,
          duration: 260,
          ease: 'out(3)',
        });
      }
    };

    const handleMouseLeave = () => {
      panelEl.style.setProperty('--nh-panel-rotate-x', '0deg');
      panelEl.style.setProperty('--nh-panel-rotate-y', '0deg');

      if (glowRef.current) {
        animate(glowRef.current, {
          opacity: 0,
          duration: 220,
          ease: 'out(2)',
        });
      }
    };

    heroEl.addEventListener('mousemove', handleMouseMove);
    heroEl.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      heroEl.removeEventListener('mousemove', handleMouseMove);
      heroEl.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [homePageContentLoaded, homePageContent, isMobile]);

  const secondaryAction =
    isDemoSiteMode && statusState?.status?.version
      ? {
          icon: <IconGithubLogo />,
          label: statusState.status.version,
          onClick: () =>
            window.open('https://github.com/QuantumNous/new-api', '_blank'),
        }
      : null;

  return (
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <section className='nh-home' data-theme={actualTheme} ref={heroRef}>
          <div className='nh-grid' aria-hidden='true'></div>
          <div className='nh-noise' aria-hidden='true'></div>
          <div className='nh-aurora nh-aurora-one' aria-hidden='true'></div>
          <div className='nh-aurora nh-aurora-two' aria-hidden='true'></div>
          <div className='nh-aurora nh-aurora-three' aria-hidden='true'></div>
          <div className='nh-glow' ref={glowRef} aria-hidden='true'></div>

          <div className='nh-shell'>
            <div className='nh-copy-column'>
              <div className='nh-badge nh-anim-el nh-anim-badge'>
                <span className='nh-badge-dot'></span>
                <span>{systemName}</span>
                <span className='nh-badge-separator'></span>
                <span>AI COMMAND SURFACE</span>
              </div>

              <h1 className='nh-title nh-anim-el nh-anim-title'>
                {renderAnimatedTitle(
                  'Your shortcut to every model.',
                  'nh-title-muted',
                )}
                {renderAnimatedTitle(
                  'Fast, keyboard-first, reliable.',
                  'nh-title-strong',
                )}
              </h1>

              <p className='nh-desc nh-anim-el nh-anim-desc'>
                {t('统一的')}
                <strong>{t('大模型接口网关')}</strong>，
                {t('聚合 40+ AI 供应商，提供更优惠的价格与更稳定的服务')}
              </p>

              <p className='nh-footnote nh-anim-el nh-anim-note'>
                把模型路由、额度、账单和日志都当作命令来操作，保留 OpenAI
                兼容接入方式，但体验更像一个统一启动器。
              </p>

              <div className='nh-actions'>
                <Link
                  to='/console'
                  className='nh-btn nh-btn-primary nh-anim-el nh-anim-action'
                >
                  <IconPlay />
                  <span>{t('获取密钥')}</span>
                </Link>

                {secondaryAction && (
                  <button
                    type='button'
                    className='nh-btn nh-btn-secondary nh-anim-el nh-anim-action'
                    onClick={secondaryAction.onClick}
                  >
                    {secondaryAction.icon}
                    <span>{secondaryAction.label}</span>
                  </button>
                )}
              </div>

              <div className='nh-metric-strip nh-anim-el nh-anim-strip'>
                <div className='nh-metric-item'>
                  <strong>40+</strong>
                  <span>Providers</span>
                </div>
                <div className='nh-metric-item'>
                  <strong>{API_ENDPOINTS.length}</strong>
                  <span>Endpoints</span>
                </div>
                <div className='nh-metric-item'>
                  <strong>Unified</strong>
                  <span>Auth / Billing / Logs</span>
                </div>
              </div>
            </div>

            <div className='nh-showcase-grid'>
              <div className='nh-launcher-board nh-anim-el nh-anim-strip'>
                <div className='nh-card-topline'>
                  <span>QUICK COMMANDS</span>
                  <span>Raycast style launcher</span>
                </div>

                <div className='nh-launcher-prompt'>
                  <div className='nh-launcher-prompt-main'>
                    <span className='nh-launcher-prompt-dot'></span>
                    <span>{QUICK_COMMANDS[activeCommandIndex].key}</span>
                  </div>
                  <span className='nh-launcher-prompt-shortcut'>
                    {QUICK_COMMANDS[activeCommandIndex].hint}
                  </span>
                </div>

                <div className='nh-launcher-list'>
                  {QUICK_COMMANDS.map((command, index) => (
                    <div
                      className={`nh-launcher-item ${index === activeCommandIndex ? 'is-active' : ''}`}
                      key={command.key}
                    >
                      <div className='nh-launcher-copy'>
                        <strong>{command.key}</strong>
                        <span>{command.desc}</span>
                      </div>
                      <span className='nh-launcher-shortcut'>
                        {command.hint}
                      </span>
                    </div>
                  ))}
                </div>

                <div className='nh-provider-strip'>
                  <span className='nh-provider-label'>Connected providers</span>
                  <div className='nh-provider-grid'>
                    {PROVIDER_PILLS.map((provider, index) => (
                      <span
                        className={`nh-provider-pill ${index === activeProviderIndex ? 'is-active' : ''}`}
                        key={provider}
                      >
                        {provider}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className='nh-panel-wrap nh-anim-el nh-anim-panel'>
                <div className='nh-panel' ref={panelRef}>
                  <div className='nh-panel-shine' aria-hidden='true'></div>
                  <div className='nh-panel-grid' aria-hidden='true'></div>

                  <div className='nh-card-topline'>
                    <span>COMMAND PALETTE</span>
                    <span>Keyboard-first control center</span>
                  </div>

                  <div className='nh-panel-head'>
                    <div className='nh-panel-brand'>
                      <img
                        src={logo}
                        alt={systemName}
                        className='nh-panel-logo'
                      />
                      <div>
                        <div className='nh-panel-name'>{systemName}</div>
                        <div className='nh-panel-subcopy'>
                          Unified AI gateway
                        </div>
                      </div>
                    </div>

                    <div className='nh-status-pill'>
                      <span className='nh-status-dot'></span>
                      Ready to route
                    </div>
                  </div>

                  <div className='nh-command-card'>
                    <div className='nh-command-content'>
                      <span className='nh-command-method'>CMD</span>
                      <div className='nh-command-url'>
                        <span>Quick launch</span>
                        <code>{`route.request --endpoint ${endpointPreview[0]}`}</code>
                      </div>
                    </div>

                    <button
                      type='button'
                      className='nh-command-copy'
                      onClick={handleCopyBaseURL}
                      aria-label='复制基址'
                      title='复制基址'
                    >
                      <IconCopy />
                    </button>
                  </div>

                  <div className='nh-command-hint'>
                    <span>Base URL</span>
                    <code>{serverAddress}</code>
                  </div>

                  <div className='nh-stat-grid'>
                    <div className='nh-stat-card'>
                      <span>Routing</span>
                      <strong>Adaptive</strong>
                    </div>
                    <div className='nh-stat-card'>
                      <span>Billing</span>
                      <strong>Realtime</strong>
                    </div>
                    <div className='nh-stat-card'>
                      <span>Audit</span>
                      <strong>Always on</strong>
                    </div>
                  </div>

                  <div className='nh-panel-layout'>
                    <div className='nh-route-card'>
                      <div className='nh-section-head'>
                        <span className='nh-section-label'>
                          Command results
                        </span>
                        <span className='nh-section-tag'>CTRL K</span>
                      </div>

                      <div className='nh-flow-row'>
                        <span className='nh-flow-chip'>request.input</span>
                        <span className='nh-flow-arrow'></span>
                        <span className='nh-flow-chip'>{systemName}.route</span>
                        <span className='nh-flow-arrow'></span>
                        <span className='nh-flow-chip'>
                          provider.auto.select
                        </span>
                      </div>

                      <div className='nh-endpoint-list'>
                        {endpointPreview.map((endpoint, index) => (
                          <div
                            className={`nh-endpoint-item ${index === 0 ? 'is-active' : ''}`}
                            key={endpoint}
                          >
                            <code>{endpoint}</code>
                            <span>{index === 0 ? 'Active' : 'Ready'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className='nh-health-card'>
                      <div className='nh-section-head'>
                        <span className='nh-section-label'>Live modules</span>
                        <span className='nh-section-tag'>ONLINE</span>
                      </div>

                      <div className='nh-health-list'>
                        <div className='nh-health-row'>
                          <span>Fallback</span>
                          <strong>Enabled</strong>
                        </div>
                        <div className='nh-health-row'>
                          <span>Quota sync</span>
                          <strong>Instant</strong>
                        </div>
                        <div className='nh-health-row'>
                          <span>Logs</span>
                          <strong>Structured</strong>
                        </div>
                      </div>

                      <div className='nh-bars'>
                        {BAR_LEVELS.map((level, index) => (
                          <span
                            className='nh-bar'
                            key={`${level}-${index}`}
                            style={{
                              '--nh-bar-height': `${level}%`,
                              animationDelay: `${index * 120}ms`,
                            }}
                          ></span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className='nh-panel-footer'>
                    <span>{API_ENDPOINTS.length} compatible endpoints</span>
                    <span>Auth · Billing · Logs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent && homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-screen border-none'
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
