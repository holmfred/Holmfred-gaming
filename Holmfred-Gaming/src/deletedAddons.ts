import { useLibrary } from './library.tsx'

export function useDeletedAddons() {
  const { isDeleted, deleteAddon } = useLibrary()
  return { isDeleted, deleteAddon }
}
