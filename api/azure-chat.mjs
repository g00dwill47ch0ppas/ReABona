export function createAzureChat({ endpoint, key, deployment, fetchImpl = fetch }) {
  return async (messages, timeout = 30000) => {
    if (!endpoint || !key || !deployment) {
      throw Object.assign(new Error('The assistant is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY and MODEL_DEPLOYMENT on the server.'), { status: 503 })
    }

    let url
    try {
      url = new URL(endpoint)
    } catch {
      throw Object.assign(new Error('The assistant endpoint is invalid.'), { status: 503 })
    }
    const allowedHosts = ['.openai.azure.com', '.cognitiveservices.azure.com', '.services.ai.azure.com']
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !allowedHosts.some(suffix => url.hostname.endsWith(suffix))) {
      throw Object.assign(new Error('The assistant endpoint must be a supported Azure HTTPS endpoint.'), { status: 503 })
    }
    const fullPath = url.pathname.match(/^\/openai\/deployments\/([^/]+)\/chat\/completions\/?$/)
    if (url.pathname === '/') {
      url.pathname = `/openai/deployments/${encodeURIComponent(deployment)}/chat/completions`
      url.searchParams.set('api-version', '2024-10-21')
    } else if (fullPath) {
      if (decodeURIComponent(fullPath[1]) !== deployment || !url.searchParams.has('api-version')) {
        throw Object.assign(new Error('The assistant endpoint and deployment configuration do not match.'), { status: 503 })
      }
    } else {
      throw Object.assign(new Error('The assistant endpoint must be an Azure resource root or deployment chat-completions URL.'), { status: 503 })
    }

    let response
    try {
      response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': key },
        body: JSON.stringify({ messages, response_format: { type: 'json_object' } }),
        redirect: 'error',
        signal: AbortSignal.timeout(timeout),
      })
    } catch (error) {
      console.error('Azure OpenAI request failed:', error.name)
      throw Object.assign(new Error('Unable to reach the AI service. Please try again.'), { status: 502 })
    }
    if (!response.ok) {
      console.error('Azure OpenAI request returned HTTP', response.status)
      throw Object.assign(new Error(`The AI service returned an error (${response.status}). Check the server configuration or try again.`), { status: 502, upstreamStatus: response.status })
    }
    try {
      const result = await response.json()
      return result?.choices?.[0]?.message?.content
    } catch {
      throw Object.assign(new Error('The AI service returned an invalid response.'), { status: 502 })
    }
  }
}
