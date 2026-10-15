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
import {
  Code2,
  ArrowRight,
  Gauge,
  Globe2,
  HeartHandshake,
  Layers3,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Badge } from '@/components/ui/badge'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

interface FeaturesProps {
  className?: string
}

export function Features(props: FeaturesProps) {
  const { t } = useTranslation()
  const capabilities = [
    { icon: Code2, label: t('Developer Friendly') },
    { icon: Globe2, label: t('Global Coverage') },
    { icon: Users, label: t('Team Collaboration') },
    { icon: HeartHandshake, label: t('Open Source') },
  ]

  return (
    <section
      id='home-features'
      aria-labelledby='home-feature-heading'
      className={cn('home-features scroll-mt-24', props.className)}
    >
      <div className='home-feature-grid home-container'>
        <AnimateInView className='home-feature-intro'>
          <h2 id='home-feature-heading' className='home-feature-heading'>
            {t('Powerful by nature.')}{' '}
            <span className='text-muted-foreground'>
              {t('Simple by design.')}
            </span>
          </h2>
          <p className='text-muted-foreground mt-5 max-w-lg text-sm leading-7'>
            {t(
              'Everything between your idea and your next AI application, thoughtfully connected.'
            )}
          </p>
          <ul className='home-capabilities text-muted-foreground'>
            {capabilities.map((capability) => (
              <li key={capability.label} className='flex items-center gap-2.5'>
                <capability.icon
                  aria-hidden='true'
                  className='size-4 shrink-0'
                  strokeWidth={1.5}
                />
                {capability.label}
              </li>
            ))}
          </ul>
        </AnimateInView>
        <AnimateInView className='home-feature-models'>
          <article className='home-feature-card'>
            <div className='home-card-heading'>
              <Layers3 aria-hidden='true' className='home-accent-text size-5' />
              <h3>{t('One API. A world of models.')}</h3>
            </div>
            <p className='home-card-description'>
              {t(
                'Bring OpenAI, Claude, Gemini and more into one consistent workflow.'
              )}
            </p>
            <div className='home-model-map' aria-hidden='true'>
              <div className='home-map-source'>
                <code>/v1/chat/completions</code>
                <code>/v1/responses</code>
                <code>/v1/messages</code>
              </div>
              <div className='home-map-hub'>
                <Layers3 strokeWidth={1.2} />
                <span>New API</span>
              </div>
              <div className='home-map-models'>
                {[
                  'OpenAI',
                  'Claude',
                  'Gemini',
                  'DeepSeek',
                  'Qwen',
                  'Mistral',
                ].map((name) => (
                  <div key={name}>{getLobeIcon(name, 26)}</div>
                ))}
              </div>
            </div>
            <div className='home-card-tags'>
              <Badge variant='outline'>{t('Model Access')}</Badge>
              <Badge variant='outline'>{t('Pass-Through')}</Badge>
            </div>
          </article>
        </AnimateInView>
        <AnimateInView className='home-feature-performance'>
          <article className='home-feature-card'>
            <div className='home-card-heading'>
              <Gauge aria-hidden='true' className='home-accent-text size-5' />
              <h3>{t('High Performance')}</h3>
            </div>
            <p className='home-card-description'>
              {t('Support for high concurrency with automatic load balancing')}
            </p>
            <div className='home-route-art' aria-hidden='true'>
              {['OpenAI', 'Claude', 'Gemini'].map((name) => (
                <div key={name} className='home-route-lane'>
                  <span className='home-route-track'>
                    <ArrowRight />
                  </span>
                  <span>{name}</span>
                </div>
              ))}
            </div>
            <div className='home-card-tags'>
              <Badge variant='outline'>{t('Load Balancing')}</Badge>
              <Badge variant='outline'>{t('Rate Limiting')}</Badge>
            </div>
          </article>
        </AnimateInView>
        <AnimateInView className='home-feature-security'>
          <article className='home-feature-card'>
            <div className='home-card-heading'>
              <ShieldCheck
                aria-hidden='true'
                className='home-accent-text size-5'
              />
              <h3>{t('Secure & Reliable')}</h3>
            </div>
            <p className='home-card-description'>
              {t(
                'Enterprise-grade security with comprehensive permission management'
              )}
            </p>
            <div className='home-security-image' aria-hidden='true'>
              {/* Unsplash photo-1486406146926-c627a92ad1ab, served locally. */}
              <img
                src='/images/home/architecture.webp'
                alt=''
                width={960}
                height={640}
                loading='lazy'
                decoding='async'
              />
            </div>
            <div className='home-card-tags'>
              <Badge variant='outline'>{t('Guardrails')}</Badge>
              <Badge variant='outline'>{t('Token Mgmt')}</Badge>
            </div>
          </article>
        </AnimateInView>
        <AnimateInView className='home-feature-billing'>
          <article className='home-feature-card'>
            <div className='home-card-heading'>
              <Wallet aria-hidden='true' className='home-accent-text size-5' />
              <h3>{t('Transparent Billing')}</h3>
            </div>
            <p className='home-card-description'>
              {t('Pay-as-you-go with real-time usage monitoring')}
            </p>
            <div className='home-billing-art' aria-hidden='true'>
              <Wallet strokeWidth={0.8} />
            </div>
            <div className='home-card-tags'>
              <Badge variant='outline'>{t('Cost Tracking')}</Badge>
              <Badge variant='outline'>{t('Observability')}</Badge>
            </div>
          </article>
        </AnimateInView>
      </div>
    </section>
  )
}
