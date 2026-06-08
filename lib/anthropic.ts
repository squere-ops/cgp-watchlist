import Anthropic from '@anthropic-ai/sdk'
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
export const MODELS = { analyse: 'claude-opus-4-8', veille: 'claude-sonnet-4-6', vl: 'claude-sonnet-4-6' }
