interface Env {
  API_URL: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const FEISHU_API = 'https://open.feishu.cn/open-apis'
  
  const FEISHU = {
    appId: 'cli_a948c8e789b81bef',
    appSecret: 'Y9x56ZRTJYhyEPeHFhXFJb5yaUVWKZh2',
    appToken: 'Tt7WbdPzDahXLtsHRFAcuJbEnAh',
    tableId: 'tblylpjywtF5QFST'
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  if (context.request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders })
  }

  try {
    const tokenResp = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU.appId,
        app_secret: FEISHU.appSecret
      })
    })
    const tokenData = await tokenResp.json()
    const token = tokenData.tenant_access_token

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }

    const url = new URL(context.request.url)
    
    // /api/feishu handling
    if (url.pathname === '/api/feishu' || url.pathname.startsWith('/api/feishu?')) {
      const filter = url.searchParams.get('filter') || ''
      const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records${filter ? '?filter=' + filter : ''}`
      
      let resp
      if (context.request.method === 'GET') {
        resp = await fetch(`https://open.feishu.cn${path}`, { headers })
      } else if (context.request.method === 'POST') {
        const body = await context.request.json()
        resp = await fetch(`https://open.feishu.cn/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        })
      } else if (context.request.method === 'DELETE') {
        const recordId = url.searchParams.get('id')
        resp = await fetch(`https://open.feishu.cn/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records/${recordId}`, {
          method: 'DELETE',
          headers
        })
      } else {
        return new Response(JSON.stringify({ code: 405, msg: 'Method not allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      const data = await resp.json()
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response('Not Found', { status: 404 })
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, msg: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}