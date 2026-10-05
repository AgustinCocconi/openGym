import { useEffect, useRef } from 'react'

export function useComposerLayout(text) {
  const composerRef = useRef(null), textRef = useRef(null)
  useEffect(() => {
    const composer = composerRef.current, chat = composer?.closest('.chat')
    if (!composer || !chat) return
    const measure = () => {
      const height = composer.getBoundingClientRect?.().height
      if (height) chat.style.setProperty('--composer-height', height + 'px')
    }
    measure()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    observer?.observe(composer)
    window.addEventListener('resize', measure)
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  useEffect(() => {
    const field = textRef.current
    if (!field) return
    field.style.height = 'auto'
    field.style.height = Math.min(120, field.scrollHeight) + 'px'
  }, [text])
  return { composerRef, textRef }
}
