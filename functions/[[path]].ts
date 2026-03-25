/**
 * Cloudflare Pages Worker - 转发请求到 D1
 */
export async function onRequest(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (context.request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders })
  }

  if (context.request.url.pathname !== '/api/feishu') {
    return new Response('Not Found', { status: 404 })
  }

  try {
    const body = await context.request.json()
    const { action, sql, params, accountId, dbId, token } = body

    if (!accountId || !dbId || !token) {
      return new Response(JSON.stringify({ success: false, error: 'Missing config' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const d1Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/databases/${dbId}/query`

    const d1Resp = await fetch(d1Url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: sql,
        params: params || []
      })
    })

    const data = await d1Resp.json()

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
}