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
import { Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CodeBlockFrame } from '@/components/ai-elements/code-block'
import { CopyButton } from '@/components/copy-button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const API_DEMOS = [
  {
    id: 'chat',
    label: 'Chat',
    endpoint: '/v1/chat/completions',
    headers: ['Authorization: Bearer API_KEY'],
    body: {
      model: 'your-model',
      messages: [{ role: 'user', content: 'Hello' }],
    },
  },
  {
    id: 'responses',
    label: 'Responses',
    endpoint: '/v1/responses',
    headers: ['Authorization: Bearer API_KEY'],
    body: { model: 'your-model', input: 'Hello' },
  },
  {
    id: 'claude',
    label: 'Claude',
    endpoint: '/v1/messages',
    headers: ['x-api-key: API_KEY', 'anthropic-version: 2023-06-01'],
    body: {
      model: 'your-model',
      max_tokens: 1024,
      messages: [{ role: 'user', content: 'Hello' }],
    },
  },
  {
    id: 'gemini',
    label: 'Gemini',
    endpoint: '/v1beta/models/your-model:generateContent',
    headers: ['x-goog-api-key: API_KEY'],
    body: { contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] },
  },
] as const

interface HeroTerminalDemoProps {
  className?: string
}

export function HeroTerminalDemo(props: HeroTerminalDemoProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'home-terminal min-w-0 overflow-hidden rounded-2xl border',
        props.className
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4'>
        <div className='flex items-center gap-2.5'>
          <Terminal aria-hidden='true' className='home-accent-text size-4' />
          <span className='text-sm font-medium'>
            {t('One gateway. Native protocols.')}
          </span>
        </div>
        <Badge
          variant='outline'
          className='text-muted-foreground font-mono text-[10px]'
        >
          {t('Example')}
        </Badge>
      </div>
      <Tabs defaultValue='chat' className='gap-0'>
        <TabsList
          variant='line'
          aria-label={t('API protocol examples')}
          className='w-full justify-start gap-0 border-b px-3 group-data-horizontal/tabs:h-auto'
        >
          {API_DEMOS.map((demo) => (
            <TabsTrigger
              key={demo.id}
              value={demo.id}
              className='min-h-12 min-w-0 flex-1 px-2 text-xs after:bottom-0'
            >
              {demo.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {API_DEMOS.map((demo) => {
          const command = [
            `curl "BASE_URL${demo.endpoint}" \\`,
            ...demo.headers.map((value) => `  -H "${value}" \\`),
            '  -H "Content-Type: application/json" \\',
            `  -d '${JSON.stringify(demo.body, null, 2)}'`,
          ].join('\n')

          return (
            <TabsContent
              key={demo.id}
              value={demo.id}
              className='home-code-panel min-w-0'
            >
              <div className='flex min-h-14 items-center gap-2 border-b px-5'>
                <Badge
                  variant='secondary'
                  className='home-method shrink-0 rounded-md font-mono text-[10px]'
                >
                  POST
                </Badge>
                <code className='text-muted-foreground min-w-0 flex-1 text-[11px] break-all'>
                  {demo.endpoint}
                </code>
                <CopyButton
                  value={command}
                  aria-label={t('Copy request example')}
                  className='size-11 rounded-lg'
                />
              </div>
              <CodeBlockFrame
                className='m-0 rounded-none border-0 bg-transparent shadow-none'
                bodyClassName='home-code-scroll'
              >
                <pre className='home-code min-h-80 p-5 font-mono text-xs leading-6 break-all whitespace-pre-wrap'>
                  <code>{command}</code>
                </pre>
              </CodeBlockFrame>
            </TabsContent>
          )
        })}
      </Tabs>
      <p className='text-muted-foreground border-t px-5 py-4 text-xs leading-6'>
        {t('Replace BASE_URL, API_KEY and your-model with your values.')}
      </p>
    </div>
  )
}
