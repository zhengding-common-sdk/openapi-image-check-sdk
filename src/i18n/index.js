import tip from './locales/en'
import { get } from 'lodash'

// 实现支持填充变量的 $t 方法
export function $t(key, variables = {}) {
  let translation = get(tip, key, '')
  // 替换占位符为实际变量值
  for (const [variable, value] of Object.entries(variables)) {
    const placeholder = `{ *${variable} *}`
    translation = translation.replace(new RegExp(placeholder, 'g'), value)
  }
  return translation
}
