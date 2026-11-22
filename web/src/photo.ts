export type PhotoSelection = { file: File | null; error: string; ready: boolean }
export const emptyPhoto: PhotoSelection = { file: null, error: '', ready: true }
export const maxPhotoBytes = 10 * 1024 * 1024
export const imageTypes = ['image/jpeg', 'image/png', 'image/webp']

export function selectPhoto(file: File): PhotoSelection {
  if (!imageTypes.includes(file.type)) return { file: null, error: 'Choose a JPEG, PNG or WebP image.', ready: true }
  if (file.size === 0 || file.size > maxPhotoBytes) return { file: null, error: 'Choose an image between 1 byte and 10 MB.', ready: true }
  return { file, error: '', ready: false }
}

export function readPhoto(file: File | null): Promise<string | null> {
  if (!file) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The image could not be read.'))
    reader.onerror = () => reject(new Error('The image could not be read. Please choose it again.'))
    reader.onabort = () => reject(new Error('Reading the image was interrupted. Please choose it again.'))
    reader.readAsDataURL(file)
  })
}
