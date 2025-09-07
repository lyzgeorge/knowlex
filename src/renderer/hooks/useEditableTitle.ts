import { useCallback, useState } from 'react'

/**
 * Lightweight wrapper around inline-edit behaviour for a single titled item.
 * Provides: editing, value, onStart, onCancel, onConfirm, validate, setValue
 */
export function useEditableTitle(
  id: string,
  currentValue: string,
  onSave: (id: string, value: string) => Promise<void> | void
) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentValue)

  const onStart = useCallback(() => {
    setValue(currentValue)
    setEditing(true)
  }, [currentValue])

  const onCancel = useCallback(() => {
    setValue(currentValue)
    setEditing(false)
  }, [currentValue])

  const validate = useCallback((v: string) => {
    const trimmed = v?.trim?.() ?? ''
    if (trimmed.length === 0) return 'Title cannot be empty'
    if (trimmed.length > 240) return 'Title is too long'
    return null
  }, [])

  const onConfirm = useCallback(async () => {
    const err = validate(value)
    if (err) return err
    try {
      await onSave(id, value.trim())
    } catch (e) {
      // let caller handle notifications; return a generic error
      return (e instanceof Error && e.message) || 'Failed to save'
    } finally {
      setEditing(false)
    }
    return null
  }, [id, value, onSave, validate])

  return {
    editing,
    value,
    setValue,
    onStart,
    onCancel,
    onConfirm,
    validate
  }
}

export default useEditableTitle
