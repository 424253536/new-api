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
'use client'

import { useEffect, useRef, useState } from 'react'

import { useTheme } from '@/context/theme-provider'
import { useMediaQuery } from '@/hooks/use-media-query'

export function HeroBanner() {
  const { resolvedTheme } = useTheme()
  const bannerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const smallScreen = useMediaQuery('(max-width: 767px)')
  const source = `/videos/home/gateway-neural-${resolvedTheme}${smallScreen ? '-small' : ''}.mp4`
  const poster = `/images/home/gateway-neural-${resolvedTheme}.webp`
  const [inView, setInView] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => !document.hidden)
  const [readySource, setReadySource] = useState<string | null>(null)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const failed = failedSource === source
  const shouldPlay = !reducedMotion && inView && pageVisible && !failed

  useEffect(() => {
    const updateVisibility = () => setPageVisible(!document.hidden)
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
    if (bannerRef.current) observer?.observe(bannerRef.current)

    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let cancelled = false
    if (shouldPlay) {
      video.muted = true
      void video.play().catch(() => {
        // Keep the poster if autoplay is blocked; stale requests cannot hide a new source.
        if (!cancelled) setReadySource(null)
      })
    } else {
      video.pause()
    }
    return () => {
      cancelled = true
      video.pause()
    }
  }, [shouldPlay, source])

  return (
    <div ref={bannerRef} className='home-banner'>
      <div className='home-hero-media' aria-hidden='true'>
        <img
          src={poster}
          srcSet={`/images/home/gateway-neural-${resolvedTheme}-small.webp 800w, ${poster} 1600w`}
          sizes='100vw'
          alt=''
          width={1600}
          height={600}
          fetchPriority='high'
          className='home-hero-image'
        />
        <video
          key={source}
          ref={videoRef}
          src={source}
          poster={
            smallScreen
              ? `/images/home/gateway-neural-${resolvedTheme}-small.webp`
              : poster
          }
          width={1600}
          height={600}
          muted
          loop
          autoPlay={shouldPlay}
          playsInline
          disablePictureInPicture
          preload='none'
          tabIndex={-1}
          className='home-hero-video'
          data-ready={!failed && readySource === source}
          onPlaying={() => setReadySource(source)}
          onError={() => setFailedSource(source)}
        />
      </div>
    </div>
  )
}
