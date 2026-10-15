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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  if (props.isAuthenticated) return null

  return (
    <section className={cn('home-cta-section', props.className)}>
      <AnimateInView className='home-cta home-container'>
        <div className='relative'>
          <p className='home-section-label'>New API</p>
          <h2 className='home-cta-title max-w-4xl text-balance'>
            {t('Your next great idea starts here.')}
          </h2>
          <p className='text-muted-foreground mt-7 max-w-xl text-base leading-8'>
            {t(
              'Deploy your own gateway and start routing requests through your configured upstream services.'
            )}
          </p>
          <div className='mt-9 flex flex-wrap items-center gap-3'>
            <Button
              role='link'
              className='home-primary group h-13 gap-6 rounded-full px-6'
              render={<Link to='/sign-up' />}
            >
              {t('Get Started')}
              <ArrowRight
                aria-hidden='true'
                className='ml-2 size-4 transition-transform group-hover:translate-x-1 motion-reduce:transform-none'
              />
            </Button>
            <Button
              role='link'
              variant='outline'
              className='h-13 rounded-full px-6'
              render={<Link to='/pricing' />}
            >
              {t('View Pricing')}
            </Button>
          </div>
        </div>
      </AnimateInView>
    </section>
  )
}
