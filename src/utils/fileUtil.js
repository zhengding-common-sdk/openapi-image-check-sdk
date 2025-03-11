export function isFile(file) {
  return file instanceof File
}

export function isBlob(file) {
  return file instanceof Blob
}

export function getFileSuffix(path = '') {
  path = path || ''
  const chaLastIndex = path.lastIndexOf('.')
  const name = path.slice(chaLastIndex + 1)
  return name
}
