// Extracts job-posting fields (company, role, salary, location, link, notes)
// from a screenshot using Claude Haiku 4.5, so the add-application form can
// be pre-filled for the user to review and save.
//
// Signed-in only. Quota is checked BEFORE calling Anthropic -- this is the
// wallet protection, so it must be server-side and must run first. Caps are
// constants below rather than a settings table; revisit only if they need to
// change without a redeploy.
//
// PER_USER_MONTHLY_LIMIT is the free-tier ceiling per account.
// GLOBAL_MONTHLY_LIMIT bounds total spend across all users; at Haiku rates
// (~0.4c/extraction) 5,000/month is roughly $20. During initial testing the
// Anthropic account only has a small prepaid balance with auto-reload OFF,
// so that balance is the real backstop -- GLOBAL_MONTHLY_LIMIT is a
// forward-looking ceiling, not the current practical limit.
//
// Deployed via the Supabase dashboard's Edge Functions editor (no CLI link
// set up), same as account-action and delete-account. SUPABASE_URL,
// SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are injected by the
// platform; ANTHROPIC_API_KEY is a Function secret set in the dashboard --
// never in frontend code.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { checkQuota } from './quota.ts'

const PER_USER_MONTHLY_LIMIT = 20
const GLOBAL_MONTHLY_LIMIT = 5000
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function startOfCurrentMonthUtc(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    company: { type: ['string', 'null'] },
    role_title: { type: ['string', 'null'] },
    salary_range: { type: ['string', 'null'] },
    location: { type: ['string', 'null'] },
    job_link: { type: ['string', 'null'] },
    employment_type: {
      anyOf: [{ type: 'string', enum: ['full_time', 'part_time', 'freelance', 'internship'] }, { type: 'null' }],
    },
    work_mode: {
      anyOf: [{ type: 'string', enum: ['on_site', 'remote', 'hybrid'] }, { type: 'null' }],
    },
  },
  required: ['company', 'role_title', 'salary_range', 'location', 'job_link', 'employment_type', 'work_mode'],
  additionalProperties: false,
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  let imageBase64: string | undefined
  let mediaType: string | undefined
  try {
    const body = await req.json()
    imageBase64 = body?.imageBase64
    mediaType = body?.mediaType
  } catch {
    // malformed/empty body -- handled by the checks below
  }

  if (!imageBase64 || !mediaType) {
    return jsonResponse({ error: 'imageBase64 and mediaType are required' }, 400)
  }
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(mediaType)) {
    return jsonResponse({ error: `Unsupported image type: ${mediaType}` }, 400)
  }
  // Bound worst-case input-token spend -- a much larger image than any real
  // screenshot costs more Anthropic tokens, so reject oversized payloads
  // before any Anthropic call rather than let them through and pay for them.
  const decodedImageBytes = Math.floor(
    (imageBase64.length * 3) / 4 - (imageBase64.endsWith('==') ? 2 : imageBase64.endsWith('=') ? 1 : 0),
  )
  if (decodedImageBytes > MAX_IMAGE_BYTES) {
    return jsonResponse({ error: 'Image is too large. Please use a smaller screenshot (max 5MB).' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!

  // Session-scoped client: identifies the caller.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  // Service-role client for the quota count (needs the GLOBAL total, which
  // RLS would otherwise scope down to the caller's own rows) and the insert.
  const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'Not authenticated' }, 401)
  }

  const monthStart = startOfCurrentMonthUtc()

  const [userCountResult, globalCountResult] = await Promise.all([
    admin
      .from('extraction_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart),
    admin
      .from('extraction_events')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart),
  ])

  if (userCountResult.error || globalCountResult.error) {
    return jsonResponse({ error: 'Failed to check extraction quota' }, 500)
  }

  const userCount = userCountResult.count ?? 0
  const globalCount = globalCountResult.count ?? 0

  const quota = checkQuota(userCount, globalCount, {
    perUserMonthlyLimit: PER_USER_MONTHLY_LIMIT,
    globalMonthlyLimit: GLOBAL_MONTHLY_LIMIT,
  })
  if (!quota.allowed) {
    return jsonResponse(
      quota.reason === 'per-user'
        ? { error: `You've used your ${PER_USER_MONTHLY_LIMIT} free extractions this month.` }
        : { error: 'Extraction is temporarily unavailable -- monthly limit reached. Try again next month.' },
      429,
    )
  }

  let anthropicResponse: Response
  try {
    anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 },
              },
              {
                type: 'text',
                text:
                  'Extract the job posting details visible in this screenshot. ' +
                  'For employment_type, classify as full_time, part_time, freelance, or internship only if ' +
                  'the posting states it explicitly; for work_mode, classify as on_site, remote, or hybrid ' +
                  'only if explicitly stated. Use null for any field not present in the image. ' +
                  'Do not guess or infer values that are not actually shown.',
              },
            ],
          },
        ],
        output_config: {
          format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
        },
      }),
    })
  } catch (err) {
    console.error('extract-job-details: Anthropic request failed', err)
    return jsonResponse({ error: 'Failed to reach the extraction service' }, 502)
  }

  if (!anthropicResponse.ok) {
    const errBody = await anthropicResponse.text()
    console.error('extract-job-details: Anthropic API error', anthropicResponse.status, errBody)
    return jsonResponse({ error: 'Extraction failed' }, 502)
  }

  const anthropicData = await anthropicResponse.json()

  if (anthropicData.stop_reason === 'refusal') {
    return jsonResponse({ error: 'Could not extract details from this image' }, 422)
  }

  const jsonBlock = (anthropicData.content ?? []).find((b: any) => b.type === 'text')
  if (!jsonBlock) {
    return jsonResponse({ error: 'Extraction returned no content' }, 502)
  }

  let extracted: Record<string, string | null>
  try {
    extracted = JSON.parse(jsonBlock.text)
  } catch (err) {
    console.error('extract-job-details: failed to parse model output', err, jsonBlock.text)
    return jsonResponse({ error: 'Extraction returned malformed data' }, 502)
  }

  const { error: insertError } = await admin.from('extraction_events').insert({
    user_id: user.id,
    input_tokens: anthropicData.usage?.input_tokens ?? null,
    output_tokens: anthropicData.usage?.output_tokens ?? null,
  })

  if (insertError) {
    // The extraction already succeeded and cost money -- log but still
    // return the result rather than discarding a paid-for result.
    console.error('extract-job-details: failed to record extraction_event', insertError)
  }

  return jsonResponse({ success: true, fields: extracted })
})
