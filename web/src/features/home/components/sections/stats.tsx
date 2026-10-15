import { ArrowUpRight } from 'lucide-react'
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
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { getDefaultStats } from '../../constants'

interface StatsProps {
  className?: string
}

export function Stats(props: StatsProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('Platform capabilities')}
      className={cn('home-stats-section', props.className)}
    >
      <div className='home-container'>
        <div className='home-provider-strip'>
          <Button
            role='link'
            variant='link'
            className='home-provider-link h-auto min-h-11 justify-start p-0 text-xs'
            render={<a href='#home-features' />}
          >
            {t('Explore the possibilities')}
            <ArrowUpRight aria-hidden='true' className='ml-2 size-3.5' />
          </Button>
          <ul className='home-provider-logos' aria-label={t('Model Access')}>
            {['OpenAI', 'Claude', 'Gemini', 'DeepSeek', 'Qwen', 'Mistral'].map(
              (name) => (
                <li key={name} aria-label={name}>
                  <span aria-hidden='true'>
                    {getLobeIcon(`${name}.Text`, 24)}
                  </span>
                </li>
              )
            )}
          </ul>
        </div>
        <AnimateInView className='home-stats'>
          <dl className='home-stat-grid'>
            {getDefaultStats(t).map((stat) => (
              <div key={stat.description} className='home-stat'>
                <dt className='text-muted-foreground text-xs sm:text-sm'>
                  {stat.description}
                </dt>
                <dd className='home-stat-value font-medium tracking-tight tabular-nums'>
                  {stat.value}
                  <span className='home-accent-text ml-1 font-light'>
                    {stat.suffix}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </AnimateInView>
      </div>
    </section>
  )
}
