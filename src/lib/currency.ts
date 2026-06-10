export const MONTH_NAMES_RU: string[] = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

export const MONTH_NAMES_SHORT_RU: string[] = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
]

const MONTH_GENITIVE_RU: string[] = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

export function formatCurrency(amount: number, showSign = false): string {
  const absAmount = Math.abs(amount)
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const base = `₪${formatted}`
  if (!showSign) return base
  if (amount < 0) return `-${base}`
  if (amount > 0) return `+${base}`
  return base
}

export function formatDate(date: Date): string {
  const day = date.getDate()
  const month = MONTH_GENITIVE_RU[date.getMonth()]
  return `${day} ${month}`
}

export function formatDateRelative(date: Date): string {
  const today = new Date()
  if (isSameDay(date, today)) return 'Сегодня'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Вчера'
  return formatDate(date)
}

export function formatMonth(date: Date): string {
  return `${MONTH_NAMES_RU[date.getMonth()]} ${date.getFullYear()}`
}

export function getMonthStart(date?: Date): Date {
  const d = date ? new Date(date) : new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function getMonthEnd(date?: Date): Date {
  const d = date ? new Date(date) : new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

/** Format a numeric string with thousands spaces for input display: "400000" → "400 000" */
export function fmtInputNum(v: string): string {
  const digits = v.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

/** Strip spaces and parse to number */
export function parseInputNum(v: string): number {
  return parseFloat(v.replace(/[\s ]/g, '')) || 0
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
