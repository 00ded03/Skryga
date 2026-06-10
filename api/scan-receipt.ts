import type { VercelRequest, VercelResponse } from '@vercel/node'

interface ScanRequestBody {
  imageBase64: string
  mimeType: string
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
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'OpenAI API key not configured' })
  }

  const body = req.body as ScanRequestBody
  const { imageBase64, mimeType } = body

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({ error: 'imageBase64 and mimeType are required' })
  }

  const prompt = `Это фото чека или скриншот платежа Apple Pay.
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

  try {
    const openAIRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: 'low',
                },
              },
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
      return res.status(502).json({ error: 'OpenAI request failed', detail: errText })
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
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
