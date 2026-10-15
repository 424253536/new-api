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
import { Pause, Play } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useSystemConfig } from '@/hooks/use-system-config'

import { SignalSculpture } from './signal-sculpture'

export function GatewayIllustration() {
  const { t } = useTranslation()
  const { logo, systemName } = useSystemConfig()
  const [paused, setPaused] = useState(false)

  return (
    <figure
      className='home-network home-enter'
      aria-label={t('AI gateway routing illustration')}
      data-paused={paused}
    >
      <div className='home-network-stage' aria-hidden='true'>
        <SignalSculpture paused={paused} />
        <div className='home-network-core'>
          <img
            src={logo || '/logo.png'}
            alt=''
            width={48}
            height={48}
            className='size-9 object-contain sm:size-11'
          />
          <span className='home-core-name'>{systemName || 'New API'}</span>
        </div>
      </div>
      <figcaption className='home-network-caption text-muted-foreground'>
        <span>{t('Your applications. Your models. One connection.')}</span>
        <Button
          variant='ghost'
          size='icon'
          className='home-motion-control size-11 rounded-full'
          aria-label={t('Pause animation')}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? (
            <Play aria-hidden='true' className='size-3.5' />
          ) : (
            <Pause aria-hidden='true' className='size-3.5' />
          )}
        </Button>
      </figcaption>
    </figure>
  )
}
