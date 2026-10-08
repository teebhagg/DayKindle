import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type RevealState = 'static' | 'pending' | 'visible'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export default function ScrollReveal({
  children,
  delay = 0,
}: {
  children: ReactNode
  delay?: number
}) {
  const elementRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const scrollListenerRef = useRef<(() => void) | null>(null)
  const [state, setState] = useState<RevealState>('static')

  function reveal() {
    setState('visible')
    observerRef.current?.disconnect()
    observerRef.current = null
    if (scrollListenerRef.current) {
      window.removeEventListener('scroll', scrollListenerRef.current)
      scrollListenerRef.current = null
    }
  }

  useIsomorphicLayoutEffect(() => {
    const element = elementRef.current
    if (!element) return

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      setState('visible')
      return
    }

    const bounds = element.getBoundingClientRect()
    if (bounds.top < window.innerHeight + 120) {
      setState('visible')
      return
    }

    setState('pending')
    const revealIfPassed = () => {
      if (element.getBoundingClientRect().top < window.innerHeight + 120) reveal()
    }
    scrollListenerRef.current = revealIfPassed
    window.addEventListener('scroll', revealIfPassed, { passive: true })

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) reveal()
      },
      { threshold: 0.12, rootMargin: '120px 0px' },
    )
    observerRef.current = observer
    observer.observe(element)

    return () => {
      observer.disconnect()
      observerRef.current = null
      if (scrollListenerRef.current) {
        window.removeEventListener('scroll', scrollListenerRef.current)
        scrollListenerRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={elementRef}
      data-scroll-reveal={state}
      onFocusCapture={reveal}
      style={{ '--scroll-reveal-delay': `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
