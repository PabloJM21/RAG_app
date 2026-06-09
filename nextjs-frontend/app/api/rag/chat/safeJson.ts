// SAFE, SSR-COMPATIBLE VERSION — NO errorLogger, NO devLogger

export interface SafeJsonResult<T = any> {
  success: boolean
  data?: T
  error?: string
  originalValue?: string
}

export interface SafeJsonOptions {
  fallbackValue?: any
  logErrors?: boolean
  context?: string
  maxLength?: number
}

function logJsonErrorSimple(message: string, error: Error, snippet?: string) {
  console.error(`[JSON ERROR] ${message}`, {
    error,
    snippet
  })
}

/**
 * Safely parse JSON with comprehensive error handling
 */
export function safeJsonParse<T = any>(
  jsonString: string | null | undefined,
  options: SafeJsonOptions = {}
): SafeJsonResult<T> {
  const {
    fallbackValue = null,
    logErrors = true,
    context = 'unknown',
    maxLength = 10000
  } = options

  if (jsonString === null || jsonString === undefined) {
    return { success: false, error: 'Input is null or undefined', data: fallbackValue }
  }

  if (typeof jsonString !== 'string') {
    return { success: false, error: `Input is not a string (type: ${typeof jsonString})`, data: fallbackValue }
  }

  if (jsonString.trim() === '') {
    return { success: false, error: 'Input is empty string', data: fallbackValue }
  }

  if (jsonString.length > maxLength) {
    const truncated = jsonString.substring(0, 100)
    if (logErrors) {
      logJsonErrorSimple(
        `JSON string too large (${jsonString.length} chars)`,
        new Error('JSON string exceeds maximum length'),
        truncated
      )
    }
    return {
      success: false,
      error: `JSON string too large (${jsonString.length} characters)`,
      data: fallbackValue,
      originalValue: truncated + '...'
    }
  }

  try {
    const parsed = JSON.parse(jsonString)
    return { success: true, data: parsed }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error'

    if (logErrors) {
      logJsonErrorSimple(
        `JSON parsing failed in context: ${context}`,
        error instanceof Error ? error : new Error(errorMessage),
        jsonString.length > 500 ? jsonString.substring(0, 500) + '...' : jsonString
      )
    }

    let detailedError = errorMessage
    if (errorMessage.includes('Unexpected token')) {
      const match = errorMessage.match(/Unexpected token (.) in JSON at position (\d+)/)
      if (match) {
        const position = parseInt(match[2])
        const contextStart = Math.max(0, position - 20)
        const contextEnd = Math.min(jsonString.length, position + 20)
        const contextSnippet = jsonString.substring(contextStart, contextEnd)
        detailedError = `${errorMessage}. Context: "${contextSnippet}"`
      }
    }

    return {
      success: false,
      error: detailedError,
      data: fallbackValue,
      originalValue: jsonString.length > 200 ? jsonString.substring(0, 200) + '...' : jsonString
    }
  }
}

/**
 * Safe JSON parse that throws on failure
 */
export function safeJsonParseStrict<T = any>(
  jsonString: string,
  context = 'unknown'
): T {
  const result = safeJsonParse<T>(jsonString, { context, logErrors: true })
  if (!result.success) {
    throw new Error(`JSON parsing failed in ${context}: ${result.error}`)
  }
  return result.data!
}

/**
 * Safe JSON parse with default value (never throws)
 */
export function safeJsonParseWithDefault<T>(
  jsonString: string | null | undefined,
  defaultValue: T,
  context = 'unknown'
): T {
  const result = safeJsonParse<T>(jsonString, {
    fallbackValue: defaultValue,
    context,
    logErrors: true
  })
  return result.success ? result.data! : defaultValue
}

/**
 * Safe JSON stringify with error handling
 */
export function safeJsonStringify(
  value: any,
  options: SafeJsonOptions = {}
): SafeJsonResult<string> {
  const {
    fallbackValue = '{}',
    logErrors = true,
    context = 'unknown',
    maxLength = 100000
  } = options

  try {
    const stringified = JSON.stringify(value, (_key, val) => {
      if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`
      if (val === undefined) return '[undefined]'
      if (typeof val === 'symbol') return val.toString()
      return val
    })

    if (stringified.length > maxLength) {
      if (logErrors) {
        logJsonErrorSimple(
          `Stringified JSON too large (${stringified.length} chars)`,
          new Error('JSON string exceeds maximum length'),
          stringified.substring(0, 100) + '...'
        )
      }
      return { success: false, error: `Stringified JSON too large (${stringified.length} characters)`, data: fallbackValue }
    }

    return { success: true, data: stringified }
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown stringify error'

    if (logErrors) {
      logJsonErrorSimple(
        `JSON stringifying failed in context: ${context}`,
        error instanceof Error ? error : new Error(errorMessage),
        String(value).substring(0, 200)
      )
    }

    return { success: false, error: errorMessage, data: fallbackValue }
  }
}

/**
 * Validate that a string appears to be valid JSON
 */
export function isValidJsonString(jsonString: string): boolean {
  if (typeof jsonString !== 'string' || jsonString.trim() === '') return false

  const trimmed = jsonString.trim()
  const startsWithBrace = trimmed.startsWith('{') && trimmed.endsWith('}')
  const startsWithBracket = trimmed.startsWith('[') && trimmed.endsWith(']')
  const isQuotedString = trimmed.startsWith('"') && trimmed.endsWith('"')
  const isNumber = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)
  const isBoolean = trimmed === 'true' || trimmed === 'false'
  const isNull = trimmed === 'null'

  if (!startsWithBrace && !startsWithBracket && !isQuotedString && !isNumber && !isBoolean && !isNull) {
    return false
  }

  try {
    JSON.parse(jsonString)
    return true
  } catch {
    return false
  }
}

/**
 * Extract JSON from mixed content
 */
export function extractAndParseJson<T = any>(
  content: string,
  options: SafeJsonOptions = {}
): SafeJsonResult<T> {
  const { context = 'json-extraction', logErrors = true } = options

  if (!content || typeof content !== 'string') {
    return { success: false, error: 'No content provided for JSON extraction', data: options.fallbackValue }
  }

  const jsonPatterns = [
    /\{[\s\S]*\}/,   // match objects, multiline-safe
    /\[[\s\S]*\]/    // match arrays, multiline-safe
  ];


  for (const pattern of jsonPatterns) {
    const match = content.match(pattern)
    if (match) {
      const jsonCandidate = match[0]
      const result = safeJsonParse<T>(jsonCandidate, {
        ...options,
        context: `${context}-extracted`,
        logErrors: false
      })
      if (result.success) return result
    }
  }

  const directResult = safeJsonParse<T>(content, { ...options, logErrors: false })
  if (directResult.success) return directResult

  if (logErrors) {
    logJsonErrorSimple(
      `Could not extract valid JSON from content in context: ${context}`,
      new Error('JSON extraction failed'),
      content.length > 200 ? content.substring(0, 200) + '...' : content
    )
  }

  return {
    success: false,
    error: 'Could not extract valid JSON from content',
    data: options.fallbackValue,
    originalValue: content.length > 200 ? content.substring(0, 200) + '...' : content
  }
}

/**
 * Safe localStorage getItem with JSON parsing
 */
export function safeLocalStorageGet<T = any>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const item = window.localStorage.getItem(key)
    if (item === null) return defaultValue
    return safeJsonParseWithDefault(item, defaultValue, `localStorage-${key}`)
  } catch {
    return defaultValue
  }
}

/**
 * Safe localStorage setItem with JSON stringification
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined') return false
  try {
    const result = safeJsonStringify(value, { context: `localStorage-${key}` })
    if (result.success) {
      window.localStorage.setItem(key, result.data!)
      return true
    }
    return false
  } catch {
    return false
  }
}
