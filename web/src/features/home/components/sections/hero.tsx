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
import { Link } from '@tanstack/react-router'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { HeroBanner } from '../hero-banner'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://docs.newapi.pro'
  const isExternalDocs = docsUrl.startsWith('http')

  return (
    <section className={cn('home-hero', props.className)}>
      <div className='home-hero-layout home-container'>
        <div className='home-hero-copy home-enter'>
          <p className='home-eyebrow'>
            New API / {t('AI Application Infrastructure Foundation')}
          </p>
          <h1 className='home-headline'>{t('One gateway for every model.')}</h1>
          <p className='home-hero-description text-muted-foreground text-pretty'>
            {t(
              'One gateway for your AI models. Less complexity, more possibility.'
            )}
          </p>

          <div className='home-hero-actions flex flex-wrap items-center gap-3'>
            <Button
              role='link'
              className='home-primary group h-12 gap-6 rounded-full px-6'
              render={
                <Link to={props.isAuthenticated ? '/dashboard' : '/sign-up'} />
              }
            >
              {props.isAuthenticated ? t('Go to Dashboard') : t('Get Started')}
              <ArrowRight
                aria-hidden='true'
                className='ml-2 size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none'
              />
            </Button>
            <Button
              role='link'
              variant='ghost'
              className='home-docs h-12 gap-4 rounded-full px-5'
              render={
                isExternalDocs ? (
                  <a href={docsUrl} target='_blank' rel='noopener noreferrer' />
                ) : (
                  <Link to={docsUrl} />
                )
              }
            >
              {t('Docs')}
              <ArrowUpRight aria-hidden='true' className='ml-1 size-4' />
            </Button>
          </div>
        </div>
      </div>
      <HeroBanner />
    </section>
  )
}
