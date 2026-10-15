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

import { useMotionValue, useSpring } from 'motion/react'
import { memo, useEffect, useRef } from 'react'

import { useTheme } from '@/context/theme-provider'

// A folded ribbon surface, separated into strands that share the same aperture.
// Prepare geometry once; the render loop only projects and shades it.
const STRANDS = 32
const SEGMENTS = 88
const SURFACE = Array.from({ length: STRANDS * SEGMENTS }, (_, index) => {
  const strand = Math.floor(index / SEGMENTS)
  const segment = index % SEGMENTS
  const points = [
    [0, 0],
    [1, 0],
    [1, 0.8],
    [0, 0.8],
  ].map(([du, dv]) => {
    const u = ((segment + du) / SEGMENTS) * Math.PI * 2
    const v = ((strand + dv) / STRANDS) * Math.PI * 2 + u * 2
    const radius = 1.58 + 0.64 * Math.cos(v)
    return [
      radius * Math.cos(u),
      radius * Math.sin(u),
      0.42 * Math.sin(v) + 0.12 * Math.sin(u * 3),
    ] as const
  })
  const u = ((segment + 0.5) / SEGMENTS) * Math.PI * 2
  const v = ((strand + 0.4) / STRANDS) * Math.PI * 2 + u * 2
  return {
    points,
    normal: [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)],
    strand,
    segment,
  }
})

const POINTER_SPRING = { stiffness: 70, damping: 24 }

export const SignalSculpture = memo(function SignalSculpture(props: {
  paused: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phaseRef = useRef(0)
  const { resolvedTheme } = useTheme()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const turnOffset = useSpring(pointerX, POINTER_SPRING)
  const tiltOffset = useSpring(pointerY, POINTER_SPRING)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const dark = resolvedTheme === 'dark'
    const shades = Array.from({ length: 48 }, (_, index) => {
      const lightness = (dark ? 29 : 18) + (index / 47) * (dark ? 54 : 62)
      return `hsl(163 32% ${lightness}%)`
    })
    const projected = SURFACE.map((face) => ({
      face,
      points: new Float32Array(8),
      depth: 0,
      shade: 0,
    }))
    let frame = 0
    let previousTime = 0
    let width = 0
    let height = 0
    let visible = true

    const draw = () => {
      context.clearRect(0, 0, width, height)
      const phase = phaseRef.current
      const tilt = 0.72 + Math.sin(phase * 0.42) * 0.2 + tiltOffset.get()
      const turn = -0.5 + Math.sin(phase * 0.28) * 0.18 + turnOffset.get()
      const scale = Math.min(width, height) * 0.21
      const cosTilt = Math.cos(tilt)
      const sinTilt = Math.sin(tilt)
      const cosTurn = Math.cos(turn)
      const sinTurn = Math.sin(turn)
      for (const item of projected) {
        let depthSum = 0
        for (let point = 0; point < 4; point++) {
          const [x, y, z] = item.face.points[point]
          const tiltedY = y * cosTilt - z * sinTilt
          const depth = y * sinTilt + z * cosTilt
          const perspective = 7 / (7 - depth)
          item.points[point * 2] =
            (x * cosTurn - tiltedY * sinTurn) * scale * perspective + width / 2
          item.points[point * 2 + 1] =
            (x * sinTurn + tiltedY * cosTurn) * scale * perspective + height / 2
          depthSum += depth
        }
        item.depth = depthSum / 4
        const [nx, ny, nz] = item.face.normal
        const normalY = ny * cosTilt - nz * sinTilt
        const normalZ = ny * sinTilt + nz * cosTilt
        const light = Math.abs(nx * -0.3 + normalY * -0.5 + normalZ * 0.8)
        const signal =
          Math.max(
            0,
            Math.cos((item.face.segment / SEGMENTS) * Math.PI * 2 - phase * 0.7)
          ) ** 16
        item.shade = Math.min(47, Math.round(8 + light * 33 + signal * 6))
      }
      projected.sort((a, b) => a.depth - b.depth)
      context.lineWidth = 0.45
      for (const item of projected) {
        const points = item.points
        context.beginPath()
        context.moveTo(points[0], points[1])
        context.lineTo(points[2], points[3])
        context.lineTo(points[4], points[5])
        context.lineTo(points[6], points[7])
        context.closePath()
        context.fillStyle = shades[item.shade]
        context.strokeStyle = shades[item.shade]
        context.fill()
        context.stroke()
      }
    }

    const tick = (time: number) => {
      if (time - previousTime >= 32) {
        phaseRef.current += Math.min((time - previousTime) / 1000, 0.05)
        previousTime = time
        draw()
      }
      frame = requestAnimationFrame(tick)
    }

    const syncMotion = () => {
      cancelAnimationFrame(frame)
      const animated =
        !props.paused && !motion.matches && visible && !document.hidden
      canvas.dataset.motion = animated ? 'running' : 'paused'
      draw()
      if (animated) {
        previousTime = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = bounds.width
      height = bounds.height
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      draw()
    }

    const resizeObserver = new ResizeObserver(resize)
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      syncMotion()
    })
    resizeObserver.observe(canvas)
    observer.observe(canvas)
    motion.addEventListener('change', syncMotion)
    document.addEventListener('visibilitychange', syncMotion)
    resize()
    syncMotion()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      resizeObserver.disconnect()
      motion.removeEventListener('change', syncMotion)
      document.removeEventListener('visibilitychange', syncMotion)
    }
  }, [props.paused, resolvedTheme, tiltOffset, turnOffset])

  return (
    <canvas
      ref={canvasRef}
      className='home-sculpture'
      aria-hidden='true'
      onPointerMove={(event) => {
        if (
          props.paused ||
          event.pointerType !== 'mouse' ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          return
        }
        const bounds = event.currentTarget.getBoundingClientRect()
        pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 0.5)
        pointerY.set(
          ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.45
        )
      }}
      onPointerLeave={() => {
        pointerX.set(0)
        pointerY.set(0)
      }}
    />
  )
})
