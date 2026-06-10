import { useEffect } from 'react'

export function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    return () => {
      document.body.style.overflow = prev
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [])
}
