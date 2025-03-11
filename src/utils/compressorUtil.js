import { isString, get } from 'lodash'
import exifr from 'exifr/dist/full.esm.mjs'

/**
 * 校验图片是不是广域色值
 * @param file
 * @returns {Promise<boolean>}
 */
export async function validICCProfile(file) {
  const tags = await getExifTags(file)
  if (!tags) return true
  let value = get(tags, 'ICCProfile', null)
  if (value) return !!matchSRGB(value)
  const profileName = get(tags, 'ProfileName', '') || get(tags, 'profileName', '')
  if (!value && !profileName) return true
  value = await useExifReaderParse(file)
  if (!value) return true
  if (matchSRGB(value)) return true
  return false
  // const bool = /^Display\s*P3$/ig.test(value)
  // return !bool

  function matchSRGB(str) {
    const whiteReg = /^sRGB/ig
    if (!isString(str)) return true
    return whiteReg.test(str)
  }

  async function useExifReaderParse(file) {
    const { default: ExifReader } = await import('exifreader')
    const tags = await ExifReader.load(file, { async: true })
    return get(tags, 'ICC Description.value', '')
  }
}

export async function getExifTags(file) {
  return exifr.parse(file, {
    xmp: true,
    mergeOutput: true,
    chunked: true,
    firstChunkSize: 512,
    firstChunkSizeNode: 512,
    firstChunkSizeBrowser: 65536, // 64kb
    chunkSize: 65536, // 64kb
    chunkLimit: 5,
    httpHeaders: {}
  })
}
