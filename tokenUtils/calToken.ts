import type { Tiktoken } from 'js-tiktoken'
import { countTokens as countAnthropicTokens } from '@anthropic-ai/tokenizer'
import { fromPreTrained } from '@lenml/tokenizer-gemini'
import { encodingForModel } from 'js-tiktoken'

export const TokenType = {
  OPENAI: 'openai',
  CLAUDE: 'claude',
  GEMINI: 'gemini',
} as const

export type TokenTypeKey = typeof TokenType[keyof typeof TokenType]

export interface TokenCountResult {
  count: number
  timing: number
  type: TokenTypeKey
  text: string
  success: boolean
  error?: string
}

class TokenizerCache {
  private static openaiEncoders = new Map<string, Tiktoken>()
  private static geminiTokenizer: any = null
  private static cacheInitialized = false

  static async initializeCache(): Promise<void> {
    if (this.cacheInitialized) {
      return
    }

    try {
      const commonModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo']
      for (const model of commonModels) {
        if (!this.openaiEncoders.has(model)) {
          this.openaiEncoders.set(model, encodingForModel(model as any))
        }
      }

      if (!this.geminiTokenizer) {
        this.geminiTokenizer = fromPreTrained()
      }

      this.cacheInitialized = true
    }
    catch (error) {
      console.warn('Cache initialization failed:', error)
    }
  }

  static getOpenAIEncoder(model: string = 'gpt-4o'): Tiktoken {
    if (this.openaiEncoders.has(model)) {
      return this.openaiEncoders.get(model)!
    }

    const encoder = encodingForModel(model as any)
    this.openaiEncoders.set(model, encoder)
    return encoder
  }

  static getGeminiTokenizer(): any {
    if (this.geminiTokenizer) {
      return this.geminiTokenizer
    }

    this.geminiTokenizer = fromPreTrained()
    return this.geminiTokenizer
  }
}

function countOpenAITokens(text: string, model: string = 'gpt-4o') {
  try {
    const enc = TokenizerCache.getOpenAIEncoder(model)
    const tokens = enc.encode(text)
    return tokens.length
  }
  catch (error) {
    console.error('OpenAI Counting Error:', error)
    return 0
  }
}

async function countClaudeTokens(text: string) {
  try {
    const tokenCount = await countAnthropicTokens(text)
    return tokenCount
  }
  catch (error) {
    console.error('Claude Counting Error:', error)
    return 0
  }
}

async function countGeminiTokensLocal(text: string) {
  try {
    const tokenizer = TokenizerCache.getGeminiTokenizer()
    const tokens = tokenizer.encode(text)
    return tokens.length
  }
  catch (error) {
    console.error('Gemini Local Counting Error:', error)
    return 0
  }
}

export async function countTokens(
  text: string,
  type: TokenTypeKey = TokenType.OPENAI,
): Promise<TokenCountResult> {
  if (!text || typeof text !== 'string') {
    return {
      count: 0,
      timing: 0,
      type,
      text: text || '',
      success: false,
      error: 'Invalid input: text must be a non-empty string',
    }
  }

  const startTime = performance.now()

  try {
    let tokenCount: number

    switch (type) {
      case TokenType.OPENAI:
        tokenCount = countOpenAITokens(text, 'gpt-4o')
        break

      case TokenType.CLAUDE:
        tokenCount = await countClaudeTokens(text)
        break

      case TokenType.GEMINI:
        tokenCount = await countGeminiTokensLocal(text)
        break

      default:
        throw new Error(`Unsupported token type: ${type}`)
    }

    const timing = performance.now() - startTime

    return {
      count: tokenCount,
      timing,
      type,
      text,
      success: true,
    }
  }
  catch (error) {
    const timing = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      count: 0,
      timing,
      type,
      text,
      success: false,
      error: `Token counting failed: ${errorMessage}`,
    }
  }
}

export async function countTokensBatch(
  texts: string[],
  type: TokenTypeKey = TokenType.OPENAI,
): Promise<TokenCountResult[]> {
  if (!Array.isArray(texts)) {
    throw new TypeError('Input must be an array of strings')
  }

  await TokenizerCache.initializeCache()

  const startTime = performance.now()
  const results: TokenCountResult[] = []
  try {
    for (const text of texts) {
      const result = await countTokens(text, type)
      results.push(result)
    }
  }
  catch (error) {
    console.warn('Batch processing error:', error)
    throw error
  }

  const totalTime = performance.now() - startTime
  console.warn(`Batch processed ${texts.length} texts in ${totalTime.toFixed(2)}ms (avg: ${(totalTime / texts.length).toFixed(2)}ms per text)`)

  return results
}

export async function benchmarkTokenizers(
  text: string,
  iterations: number = 10,
): Promise<{
  [key in TokenTypeKey]: {
    avgTime: number
    minTime: number
    maxTime: number
  }
}> {
  const results: { [key in TokenTypeKey]: { times: number[] } } = {
    [TokenType.CLAUDE]: { times: [] },
    [TokenType.OPENAI]: { times: [] },
    [TokenType.GEMINI]: { times: [] },
  }

  console.warn(`Running ${iterations} iterations for each tokenizer (timings in ms)...`)

  await TokenizerCache.initializeCache()

  for (let i = 0; i < iterations; i++) {
    for (const type of [TokenType.CLAUDE, TokenType.OPENAI, TokenType.GEMINI]) {
      const start = performance.now()
      await countTokens(text, type)
      const time = performance.now() - start
      results[type].times.push(time)
    }
  }

  const stats: {
    [key in TokenTypeKey]: {
      avgTime: number
      minTime: number
      maxTime: number
    }
  } = {
    [TokenType.CLAUDE]: { avgTime: 0, minTime: 0, maxTime: 0 },
    [TokenType.OPENAI]: { avgTime: 0, minTime: 0, maxTime: 0 },
    [TokenType.GEMINI]: { avgTime: 0, minTime: 0, maxTime: 0 },
  }

  for (const type of [TokenType.CLAUDE, TokenType.OPENAI, TokenType.GEMINI] as TokenTypeKey[]) {
    const times = results[type].times
    stats[type] = {
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
    }
  }

  return stats
}
