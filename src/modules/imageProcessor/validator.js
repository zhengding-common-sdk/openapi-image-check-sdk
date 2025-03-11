import LimitQueue from '@/utils/limitQueueUtil'
import {
  getPicName,
  file2Uint8Array,
  checkColorType,
  analysisImageType,
  useCanvasToConvertImage
} from '@/utils/imageUtil'
import { validICCProfile } from '@/utils/compressorUtil'
import { isBlob, isFile } from '@/utils/fileUtil'
import { $t } from '@/i18n'
import { isArray, isPlainObject, merge, isBoolean } from 'lodash'

const WAIT_VALID = 1
const VALID_FAIL = 2
const VALID_SUCCESS = 3

const CODE_SUCCESS = 0
const CODE_ERR = 1

let uId = 1

const imageValidatorDefaultOption = {
  disableModeList: ['cmyk', 'CMYK', 'gray', 'GRAY'], //禁用的图片模式
  format: false
}

class ImageValidator {
  constructor(option) {
    this.option = ImageValidator.normalizeOption(option)
    const { file } = this.option
    this.format = option.format
    this.file = file
    this.formatFile = null
    this.title = this.option.title || getPicName(file.name)
    this.mode = null
    this.errMsg = ''
    this.status = WAIT_VALID
  }

  get uid() {
    return this.option.uid
  }

  get disableModeList() {
    return this.option.disableModeList
  }

  static normalizeOption(option) {
    if (!isPlainObject(option)) option = { file: option }
    return merge({ uid: uId++ }, imageValidatorDefaultOption, option)
  }

  fillTitle(tip) {
    return `${this.title} ${tip}`
  }

  dealWithResult(msg, status) {
    this.status = status
    this.errMsg = msg
    return msg
  }

  async action() {
    const res0 = await this.validAll()
    if (res0[0]) {
      if (!this.format) {
        this.dealWithResult(res0[1], VALID_FAIL)
        return res0
      }
      const formatRes = await this.formatAbnormalFile(this.file)
      console.log('formatRes', formatRes)
      if (formatRes[0]) {
        this.dealWithResult(formatRes[1], VALID_FAIL)
        return formatRes
      }
    }
    this.dealWithResult('', VALID_SUCCESS)
    return res0
  }

  async formatAbnormalFile(file) {
    const res0 = this.checkFile(file)
    if (res0[0]) return res0
    let formatFile = await useCanvasToConvertImage(file)
    if (!formatFile) return [true, this.fillTitle($t('comp.uploadProShow.formatFileFailed'))]
    formatFile = new File([formatFile], file.name, {
      type: formatFile.type,
      lastModified: new Date().getTime()
    })
    this.formatFile = formatFile
    return [false, formatFile]
  }

  async validAll() {
    const file = this.file
    let res0 = this.checkFile(file)
    if (res0[0]) return res0
    const uint8Array = await file2Uint8Array(file)
    const res1 = await this.checkMode(uint8Array)
    if (res1[0]) return res1
    const res2 = await this.checkImageType(uint8Array, file)
    if (res2[0]) return res2
    const res3 = await this.validICCProfile(file)
    if (res3[0]) return res3
    return [false, this.fillTitle($t('comp.uploadProShow.verificationPassed'))]
  }

  checkFile(file) {
    return [!(isFile(file) || isBlob(file)), $t('comp.uploadProShow.notImageFile')]
  }

  //校验通道
  async checkMode(uint8Array) {
    const res = await checkColorType(uint8Array) || {}
    this.mode = res || 'aRgb'
    return [this.disableModeList.includes(this.mode), this.fillTitle($t('comp.uploadProShow.modeTip', { mode: this.mode }))]
  }

  async checkImageType(uint8Array, file) {
    const error = await analysisImageType(uint8Array, file)
    return [error, error]
  }

  async validICCProfile(file) {
    const isValid = await validICCProfile(file)
    return [!isValid, this.fillTitle($t('comp.uploadProShow.colorConfigurationError'))]
  }
}

class BatchImageValidator {
  constructor() {
    this.uploadId = 1
    this.queue = new LimitQueue({ limit: 2 })
    this.instanceList = []
    this.res = []
    this.actionPromise = null
    this.actionResolve = null
  }

  normalizeOption(option) {
    const defaultOption = {}
    if (!isPlainObject(option)) option = { fileList: option }
    return merge({}, defaultOption, option)
  }

  async action(option) {
    const uploadId = ++this.uploadId
    option = this.normalizeOption(option)
    const { fileList } = option
    let res = this.res
    if (!this.actionPromise) {
      this.actionPromise = new Promise(resolve => this.actionResolve = resolve)
    }
    const concatInstanceList = fileList.map(file => {
      const instance = new ImageValidator({
        file,
        ...option
      })
      this.instanceList.unshift(instance)
      return instance
    })

    concatInstanceList.map(instance => {
      const fn = async () => {
        try {
          const actionRes = await instance.action()
          res.push(actionRes)
        } catch {
          instance.status = VALID_FAIL
          res.push([true, null])
        } finally {
          const isAllFinish = this.instanceList.every(({ status }) => {
            return status == VALID_FAIL || status == VALID_SUCCESS
          })
          if (isAllFinish) {
            this.actionResolve(true)
          }
        }
      }
      fn.size = instance.file.size
      this.queue.concat(fn, (queues) => {
        queues.sort((a, b) => a.size - b.size)
      })
    })
    try {
      await this.actionPromise
    } catch {
    }
    if (uploadId != this.uploadId) return
    this.res = []
    this.actionPromise = null
    this.actionResolve = null
    let response = {
      code: CODE_SUCCESS,
      errMsg: '',
      errList: [],
      data: []
    }
    this.instanceList.map(instance => {
      const { errMsg, file, formatFile } = instance
      const { errList, data } = response
      data.push({
        errMsg,
        file: formatFile ? null : file,
        formatFile,
        item: instance
      })
      if (errMsg) {
        response.code = CODE_ERR
        errList.push(errMsg)
      }
    })
    response.errMsg = response.errList.join('\n')
    return response
  }
}

/**
 * batchOriginImageValidator
 * @param files
 * @param option
 * @returns {Promise<undefined|{code: number, data: *[], errMsg: string, errList: *[]}>}
 */
export async function batchOriginImageValidator(files, option = false) {
  if (!isArray(files)) files = [files]
  if (isBoolean(option)) {
    option = {
      format: option
    }
  }
  option.fileList = files
  const instance = new BatchImageValidator()
  return await instance.action(option)
}
