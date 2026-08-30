import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

interface ScanRequestBody {
  imageBase64: string
  mimeType: string
  documentType?: 'receipt' | 'salary_slip'
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  error?: {
    message: string
    type: string
  }
}

interface ExtractedReceiptData {
  amount: number
  merchantName: string
  date: string
  suggestedCategory: string
  title: string
}

const VALID_CATEGORIES = [
  'food', 'bills', 'transport', 'health', 'children', 'fashion',
  'entertainment', 'education', 'home', 'gifts', 'finance', 'pets', 'other_expense',
  'salary', 'other_income',
]

const MAX_BASE64_LENGTH = 11_200_000 // approximately 8 MiB before base64 encoding
const VALID_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf',
])
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_REQUESTS = 10
const requestLog = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(key) ?? []).filter(time => now - time < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_REQUESTS) {
    requestLog.set(key, recent)
    return true
  }
  recent.push(now)
  requestLog.set(key, recent)
  return false
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!supabaseUrl || !supabasePublishableKey) {
    return res.status(500).json({ error: 'Authentication is not configured' })
  }
  const authorization = req.headers.authorization
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!accessToken) return res.status(401).json({ error: 'Authentication required' })

  const authClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !user) return res.status(401).json({ error: 'Invalid or expired session' })

  const clientKey = user.id
  if (isRateLimited(clientKey)) {
    res.setHeader('Retry-After', '60')
    return res.status(429).json({ error: 'Слишком много запросов. Повторите через минуту.' })
  }

  const { imageBase64, mimeType, documentType } = req.body as ScanRequestBody

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 and mimeType are required' })
  }
  if (!VALID_MIME_TYPES.has(mimeType)) {
    return res.status(415).json({ error: 'Unsupported file type' })
  }
  if ((documentType === 'salary_slip' && mimeType !== 'application/pdf')
    || (documentType !== 'salary_slip' && mimeType === 'application/pdf')) {
    return res.status(400).json({ error: 'File type does not match document type' })
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return res.status(413).json({ error: 'File is too large' })
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return res.status(400).json({ error: 'Invalid base64 payload' })
  }

  const isSalarySlip = documentType === 'salary_slip'
  const isPdf = mimeType === 'application/pdf'

  const prompt = isSalarySlip
    ? `Это тлуш сахар (תלוש שכר) — расчётный листок зарплаты.
Извлеки следующую информацию:
- сумма к выплате (שכר נטו, net pay — только число в шекелях)
- название работодателя
- месяц и год (дата выплаты)

Верни ТОЛЬКО JSON без объяснений:
{
  "amount": <число>,
  "merchantName": "<название работодателя>",
  "date": "<ISO дата, например 2024-06-01>",
  "suggestedCategory": "salary",
  "title": "Зарплата"
}

Если поле не определить: amount=0, merchantName="Работодатель", date="${new Date().toISOString().slice(0, 10)}", suggestedCategory="salary", title="Зарплата".`
    : `Это фото чека или скриншот платежа Apple Pay.
Извлеки следующую информацию:
- сумма (в шекелях, только число)
- название магазина/получателя
- дата операции
- предлагаемая категория

Верни ТОЛЬКО JSON без каких-либо объяснений:
{
  "amount": <число>,
  "merchantName": "<название>",
  "date": "<ISO дата, например 2024-06-15>",
  "suggestedCategory": "<одна из: food/bills/transport/health/children/fashion/entertainment/education/home/gifts/finance/pets/other_expense>",
  "title": "<краткое название операции на русском>"
}

Если какое-то поле не удаётся определить, используй: amount=0, merchantName="Неизвестно", date="${new Date().toISOString().slice(0, 10)}", suggestedCategory="other_expense", title="Операция из чека".`

  const contentItem = isPdf
    ? { type: 'file', file: { filename: 'document.pdf', file_data: `data:application/pdf;base64,${imageBase64}` } }
    : { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' } }

  try {
    const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: isPdf ? 'gpt-4o' : 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              contentItem,
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!openAIRes.ok) {
      const errText = await openAIRes.text()
      console.error('OpenAI error:', errText)
      return res.status(502).json({ error: 'OpenAI request failed' })
    }

    const data = (await openAIRes.json()) as OpenAIResponse

    if (data.error) {
      return res.status(502).json({ error: data.error.message })
    }

    const rawContent = data.choices?.[0]?.message?.content ?? ''

    // Extract JSON from the response (strip markdown code blocks if present)
    let jsonStr = rawContent.trim()
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }
    // Try to find the first { ... } block
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objMatch) {
      jsonStr = objMatch[0]
    }

    let parsed: ExtractedReceiptData
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      console.error('Failed to parse OpenAI JSON response:', rawContent)
      return res.status(200).json({
        amount: 0,
        merchantName: 'Не распознано',
        date: new Date().toISOString().slice(0, 10),
        suggestedCategoryKey: 'other_expense',
        title: 'Операция из чека',
      })
    }

    // Normalize
    const amount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(String(parsed.amount)) || 0
    const merchantName = parsed.merchantName || 'Неизвестно'
    const title = parsed.title || merchantName
    const suggestedCategoryKey = VALID_CATEGORIES.includes(parsed.suggestedCategory)
      ? parsed.suggestedCategory
      : 'other_expense'

    // Validate date
    let dateStr = parsed.date || new Date().toISOString().slice(0, 10)
    const dateTest = new Date(dateStr)
    if (isNaN(dateTest.getTime())) {
      dateStr = new Date().toISOString().slice(0, 10)
    }

    return res.status(200).json({
      amount,
      merchantName,
      date: dateStr,
      suggestedCategoryKey,
      title,
    })
  } catch (err) {
    console.error('scan-receipt handler error:', err)
    return res.status(500).json({
      error: 'Internal server error',
    })
  }
}
