import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ message: '', type: 'error' })

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type })
  }, [])

  const hideToast = useCallback(() => {
    setToast({ message: '', type: 'error' })
  }, [])

  return { toast, showToast, hideToast }
}