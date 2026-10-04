import { useLibrary } from './library.tsx'

export function useDeletedAddons() {
  const { isDeleted, deleteAddon, deleted } = useLibrary()
  return { isDeleted, deleteAddon, deleted }
}
