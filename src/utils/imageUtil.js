import { $t } from '@/i18n'
import { getFileSuffix } from '@/utils/fileUtil'

export function getPicName(path = '') {
  path = path || ''
  const pointLastIndex = path.lastIndexOf('.')
  const chaLastIndex = path.lastIndexOf('/')
  return path.slice(chaLastIndex + 1, pointLastIndex)
}

export function file2Uint8Array(file) {
  return new Promise((resolve) => {
    const fileReader = new FileReader()
    fileReader.onloadend = function (e) {
      const result = e.target.result
      resolve(new Uint8Array(result))
    }
    fileReader.onerror = function (e) {
      resolve(false)
    }
    fileReader.readAsArrayBuffer(file)
  })
}

/**
 *
 * @param arr
 * @returns {Promise<core.FileTypeResult>}
 */
export async function getImageType(arr) {
  const FileType = await import('file-type/browser')
  return await FileType.fromBuffer(arr)
}

//根据 Uint8Array 判断是否是png图片
export function isPng(array) {
  //png 开头8个字节的的标识符
  const pngStr = '89504E470D0A1A0A'
  let checkPngStr = ''
  ;[...array.slice(0, 8)].map((s) => (checkPngStr += s.toString(16).padStart(2, '0')))
  return checkPngStr.toLocaleUpperCase() === pngStr.toLocaleUpperCase()
}

//判断是图片通道 png 不存在cmyk通道, 第27位表示色彩类型
//colorType（色彩类型）PNG 图片一共有 5 种色彩类型，0 代表灰度颜色，2 代表用 RGB 表示颜色，即 (R, G, B)，3 代表用色板表示颜色，4 代表灰度和透明度来表示颜色，6 代表用 RGB 和透明度表示颜色，即 (R, G, B, A)。色板的色彩类型里，每个像素是由 1 个色彩通道表示的。
// 1 Bytes | 颜色分量数，JFIF中使用 YCbCr 所以为固定值 3 （1：灰度图 3：YCbCr /rgb  4：CMYK）
export async function checkColorType(file) {
  const array = file.length ? file : await file2Uint8Array(file)
  if (file.type === 'image/png' || !file.type && isPng(array)) {
    const colorType = array[25]
    if (colorType === 0 || colorType === 4) return 'gray'
    return false
  }
  const fIndexArr = []
  array.map((item, index) => {
    const nextItem = array[index + 1]
    //标记名 SOFX => 0xFFCX
    //https://blog.csdn.net/ymlbright/article/details/44179891?ops_request_misc=%257B%2522request%255Fid%2522%253A%2522163583372316780255232064%2522%252C%2522scm%2522%253A%252220140713.130102334.pc%255Fall.%2522%257D&request_id=163583372316780255232064&biz_id=0&utm_medium=distribute.pc_search_result.none-task-blog-2~all~first_rank_ecpm_v1~rank_v31_ecpm-4-44179891.pc_search_result_cache&utm_term=jpeg%E8%A7%A3%E7%A0%81&spm=1018.2226.3001.4187
    const ffcArr = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xc10, 0xca, 0xcb, 0xcd, 0xce, 0xcf]
    if (item == 0xff && ffcArr.includes(nextItem)) {
      const tmpArr = [...array.slice(index, index + 10)].map((s) => s.toString(16).padStart(2, '0'))
      fIndexArr.push(tmpArr)
      return true
    }
  })
  if (!fIndexArr.length) return false
  const type = fIndexArr.slice(-1)[0].slice(-1)[0]
  if (type == '04') return 'CMYK'
  if (type === '01') return 'gray'
}

export async function analysisImageType(array, file) {
  if (!array.length) {
    file = array
    array = await file2Uint8Array(array)
  }
  const typeArr = ['image/png', 'image/jpg', 'image/jpeg']
  let imageInfo = await getImageType(array)
  if (!imageInfo) {
    imageInfo = {
      mime: $t('comp.uploadFile.notFileType', { fileType: file.type })
    }
  }
  const includeType = typeArr.includes(imageInfo.mime)
  if (includeType) return
  if (file.type) {
    return $t('comp.uploadFile.fileSuffixException', {
      fileName: file.name || '',
      imageInfoMime: imageInfo.mime,
      fileType: file.type
    })
  } else {
    return $t('comp.uploadFile.fileSuffixException1', { fileType: typeArr.join(',') })
  }
  return false
}

/**
 * 使用canvas格式化图片
 * @param file
 * @returns {Promise<unknown>}
 */
export async function useCanvasToConvertImage(file) {
  if (!file) return null
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const src = URL.createObjectURL(file)
  let resolveHandler = null
  const p = new Promise(resolve => resolveHandler = resolve)
  const img = new Image()

  img.onload = function () {
    // 设置 canvas 的宽度和高度
    canvas.width = img.width
    canvas.height = img.height
    // 在 canvas 上绘制图片
    ctx.drawImage(img, 0, 0)

    // 获取文件后缀
    const fileExtension = getFileSuffix(file.name)
    let mimeType = ''
    switch (fileExtension) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg'
        break
      case 'png':
        mimeType = 'image/png'
        break
      case 'webp':
        mimeType = 'image/webp'
        break
      default:
        // 默认使用 jpeg 格式
        mimeType = 'image/jpeg'
    }
    canvas.toBlob(function (blob) {
      URL.revokeObjectURL(src)
      resolveHandler(blob)
    }, mimeType, 0.8) // 第二个参数是 MIME 类型，第三个参数是图片质量
  }

  img.onerror = function () {
    URL.revokeObjectURL(src)
    resolveHandler(null)
  }

  img.src = src
  return await p
}
