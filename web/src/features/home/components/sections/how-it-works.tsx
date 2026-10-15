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
import { ArrowUpRight } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getLobeIcon } from '@/lib/lobe-icon'

const HeroTerminalDemo = lazy(() =>
  import('../hero-terminal-demo').then((module) => ({
    default: module.HeroTerminalDemo,
  }))
)

export function HowItWorks() {
  const { t } = useTranslation()
  const terminalRef = useRef<HTMLDivElement>(null)
  const [showExamples, setShowExamples] = useState(false)

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return
    if (typeof IntersectionObserver === 'undefined') {
      setShowExamples(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShowExamples(true)
        observer.disconnect()
      },
      { rootMargin: '400px' }
    )
    observer.observe(terminal)
    return () => observer.disconnect()
  }, [])

  const placeholder = (
    <div
      className='home-terminal min-h-128 space-y-7 rounded-2xl border p-6'
      role='status'
      aria-label={t('Loading...')}
    >
      <Skeleton className='h-5 w-1/2 motion-reduce:animate-none' />
      <Skeleton className='h-10 w-full motion-reduce:animate-none' />
      <Skeleton className='h-64 w-4/5 motion-reduce:animate-none' />
    </div>
  )
  const steps = [
    {
      title: t('Configure'),
      description: t(
        'Add your API keys, set up channels and configure access permissions'
      ),
    },
    {
      title: t('Connect'),
      description: t(
        'Connect through OpenAI, Claude, Gemini, and other compatible API routes'
      ),
    },
    {
      title: t('Monitor'),
      description: t(
        'Track usage, costs and performance with real-time analytics'
      ),
    },
  ]

  return (
    <section className='home-integration'>
      <div className='home-container home-integration-grid'>
        <AnimateInView className='home-integration-copy'>
          <h2 className='home-section-title text-balance'>
            {t('From idea to your first request.')}
          </h2>
          <p className='text-muted-foreground mt-5 text-base leading-7'>
            {t('Three steps to get started')}
          </p>
          <ol className='home-steps'>
            {steps.map((step, index) => (
              <li
                key={step.title}
                className='home-step flex gap-5 py-8 first:pt-2'
              >
                <span
                  aria-hidden='true'
                  className='home-step-number shrink-0 font-mono text-sm'
                >
                  0{index + 1}
                </span>
                <div>
                  <h3 className='text-lg font-medium'>{step.title}</h3>
                  <p className='text-muted-foreground mt-2 text-sm leading-7'>
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </AnimateInView>
        <AnimateInView className='home-integration-example min-w-0' delay={100}>
          <div ref={terminalRef}>
            {showExamples ? (
              <Suspense fallback={placeholder}>
                <HeroTerminalDemo />
              </Suspense>
            ) : (
              placeholder
            )}
          </div>
        </AnimateInView>
      </div>

      <AnimateInView className='home-container home-apps'>
        <div>
          <h3 className='text-sm font-medium'>
            {t('Fits right into your workflow.')}
          </h3>
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('Supported Applications')}
          </p>
          <p className='text-muted-foreground mt-2 max-w-lg text-xs leading-6'>
            {t(
              'Supports one-click configuration and perfectly adapts to NewAPI multi-protocol configuration.'
            )}
          </p>
        </div>
        <div className='home-app-links'>
          <Button
            role='link'
            variant='outline'
            className='h-12 gap-3 rounded-full px-4'
            render={
              <a
                href='https://cherry-ai.com'
                target='_blank'
                rel='noopener noreferrer'
              />
            }
          >
            <span aria-hidden='true'>{getLobeIcon('CherryStudio', 20)}</span>
            Cherry Studio
            <ArrowUpRight
              aria-hidden='true'
              className='text-muted-foreground size-3.5'
            />
          </Button>
          <Button
            role='link'
            variant='outline'
            className='h-12 gap-3 rounded-full px-4'
            render={
              <a
                href='https://ccswitch.io'
                target='_blank'
                rel='noopener noreferrer'
              />
            }
          >
            <Avatar className='size-5 rounded-md' aria-hidden='true'>
              <AvatarImage src='https://ccswitch.io/favicon.png' alt='' />
              <AvatarFallback className='rounded-md text-[9px]'>
                CC
              </AvatarFallback>
            </Avatar>
            CC Switch
            <ArrowUpRight
              aria-hidden='true'
              className='text-muted-foreground size-3.5'
            />
          </Button>
        </div>
      </AnimateInView>
    </section>
  )
}
