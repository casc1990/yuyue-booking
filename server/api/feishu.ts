// 飞书 API 代理 - Nuxt Server Route
const FEISHU_API = 'https://open.feishu.cn/open-apis'

// 飞书配置
const FEISHU = {
  appId: 'cli_a948c8e789b81bef',
  appSecret: 'Y9x56ZRTJYhyEPeHFhXFJb5yaUVWKZh2',
  appToken: 'Tt7WbdPzDahXLtsHRFAcuJbEnAh',
  tableId: 'tblylpjywtF5QFST'
}

// 获取 tenant token
async function getToken() {
  const resp = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU.appId,
      app_secret: FEISHU.appSecret
    })
  })
  const data = await resp.json()
  return data.tenant_access_token
}

export default defineEventHandler(async (event) => {
  const method = event.method
  
  // CORS 头
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
  
  if (method === 'OPTIONS') {
    return { code: 0 }
  }
  
  try {
    const token = await getToken()
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
    
    if (method === 'GET') {
      // 查询记录
      const query = getQuery(event)
      const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records`
      const url = query.filter ? `${path}?filter=${encodeURIComponent(query.filter)}` : path
      
      const resp = await fetch(`https://open.feishu.cn${url}`, { headers })
      return await resp.json()
    }
    
    if (method === 'POST') {
      // 创建记录
      const body = await readBody(event)
      const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records`
      
      const resp = await fetch(`https://open.feishu.cn${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })
      return await resp.json()
    }
    
    if (method === 'PUT') {
      // 更新记录
      const body = await readBody(event)
      const recordId = body.record_id
      delete body.record_id
      const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records/${recordId}`
      
      const resp = await fetch(`https://open.feishu.cn${path}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ fields: body })
      })
      return await resp.json()
    }
    
    if (method === 'DELETE') {
      // 删除记录
      const query = getQuery(event)
      const recordId = query.id
      const path = `/bitable/v1/apps/${FEISHU.appToken}/tables/${FEISHU.tableId}/records/${recordId}`
      
      const resp = await fetch(`https://open.feishu.cn${path}`, {
        method: 'DELETE',
        headers
      })
      return await resp.json()
    }
    
    return { code: 400, msg: 'Unknown method' }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
})