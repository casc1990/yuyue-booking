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
    // Get token
    const tokenResp = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU.appId,
        app_secret: FEISHU.appSecret
      })
    })
    const tokenData = await tokenResp.json()
    
    if (tokenData.code !== 0) {
      return new Response(JSON.stringify(tokenData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    
    const token = tokenData.tenant_access_token

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }

    const url = new URL(context.request.url)
    
    // Handle /api/feishu
    if (url.pathname === '/api/feishu' || url.pathname.endsWith('/api/feishu')) {
      const filter = url.searchParams.get('filter') || ''
      
      if (context.request.method === 'GET') {
        const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records${filter ? '?filter=' + filter : ''}`
        const resp = await fetch(`https://open.feishu.cn${path}`, { headers })
        const data = await resp.json()
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (context.request.method === 'POST') {
        const body = await context.request.json()
        const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records`
        const resp = await fetch(`https://open.feishu.cn${path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        })
        const data = await resp.json()
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (context.request.method === 'DELETE') {
        const recordId = url.searchParams.get('id')
        const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records/${recordId}`
        const resp = await fetch(`https://open.feishu.cn${path}`, {
          method: 'DELETE',
          headers
        })
        const data = await resp.json()
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    return new Response('Not Found', { status: 404 })
  } catch (err) {
    return new Response(JSON.stringify({ code: 500, msg: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}