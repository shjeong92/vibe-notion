import { CredentialManager } from '@/platforms/notion/credential-manager'
import { TokenExtractor } from '@/platforms/notion/token-extractor'

let activeUserId: string | undefined

export function setActiveUserId(userId: string | undefined): void {
  activeUserId = userId
}

export function getActiveUserId(): string | undefined {
  return activeUserId
}

async function doRequest(tokenV2: string, endpoint: string, body: Record<string, unknown>): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    cookie: `token_v2=${tokenV2}`,
  }

  if (activeUserId) {
    headers['x-notion-active-user-header'] = activeUserId
    headers.cookie += `; notion_user_id=${activeUserId}`
  }

  return fetch(`https://www.notion.so/api/v3/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function buildErrorMessage(status: number, detail: string): string {
  const suffix = detail ? `: ${detail}` : ''
  return `Notion internal API error: ${status}${suffix}`
}

async function extractResponseDetail(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (text) {
      try {
        const json = JSON.parse(text)
        return json.message || json.msg || json.error || ''
      } catch {
        return text
      }
    }
  } catch {
    // could not read response body
  }
  return ''
}

async function tryReExtractToken(staleToken: string): Promise<string | null> {
  try {
    const extractor = new TokenExtractor()
    const extracted = await extractor.extract()
    if (!extracted || extracted.token_v2 === staleToken) {
      return null
    }

    const manager = new CredentialManager()
    await manager.setCredentials(extracted)
    return extracted.token_v2
  } catch {
    return null
  }
}

export async function internalRequest(
  tokenV2: string,
  endpoint: string,
  body: Record<string, unknown> = {},
): Promise<unknown> {
  const response = await doRequest(tokenV2, endpoint, body)

  if (response.ok) {
    return response.json()
  }

  // On 401, attempt token re-extraction and retry once
  if (response.status === 401) {
    const freshToken = await tryReExtractToken(tokenV2)
    if (freshToken) {
      const retryResponse = await doRequest(freshToken, endpoint, body)
      if (retryResponse.ok) {
        return retryResponse.json()
      }
      const retryDetail = await extractResponseDetail(retryResponse)
      throw new Error(buildErrorMessage(retryResponse.status, retryDetail))
    }
  }

  const detail = await extractResponseDetail(response)
  throw new Error(buildErrorMessage(response.status, detail))
}
