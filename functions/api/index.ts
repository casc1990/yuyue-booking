// Cloudflare Pages Functions - 预约系统后端

const FEISHU_API = 'https://open.feishu.cn/open-apis';

// 获取飞书 tenant access token
async function getFeishuToken() {
  const resp = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: 'cli_a948c8e789b81bef',
      app_secret: 'Y9x56ZRTJYhyEPeHFhXFJb5yaUVWKZh2'
    })
  });
  const data = await resp.json();
  return data.tenant_access_token;
}

export async function onRequest(context) {
  const { request, env } = context;
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const body = await request.json();
    
    // D1 数据库查询
    if (body.sql && env.D1_BOOKINGS) {
      const { sql, params } = body;
      let stmt = env.D1_BOOKINGS.prepare(sql);
      if (params && params.length > 0) {
        stmt = stmt.bind(...params);
      }
      const result = await stmt.all();
      return Response.json({ success: true, result }, { headers: corsHeaders });
    }
    
    // 飞书 API 代理
    if (body.action && body.path) {
      const token = await getFeishuToken();
      const { action, path, method, data } = body;
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      let resp;
      switch (action) {
        case 'query':
          resp = await fetch(`${FEISHU_API}${path}`, { method: 'GET', headers });
          break;
        case 'create':
          resp = await fetch(`${FEISHU_API}${path}`, { 
            method: 'POST', 
            headers, 
            body: JSON.stringify(data) 
          });
          break;
        case 'update':
          resp = await fetch(`${FEISHU_API}${path}`, { 
            method: 'PUT', 
            headers, 
            body: JSON.stringify(data) 
          });
          break;
        case 'delete':
          resp = await fetch(`${FEISHU_API}${path}`, { method: 'DELETE', headers });
          break;
        default:
          return Response.json({ code: 400, msg: 'Unknown action' }, { headers: corsHeaders });
      }
      
      const result = await resp.json();
      return Response.json(result, { headers: corsHeaders });
    }
    
    // 测试 D1 连接
    if (env.D1_BOOKINGS) {
      const result = await env.D1_BOOKINGS.prepare("SELECT 1 AS ok").first();
      return Response.json({ ok: true, message: "D1 连接成功", data: result }, { headers: corsHeaders });
    }
    
    return Response.json({ ok: false, error: "No D1 bound" }, { headers: corsHeaders });
    
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { headers: corsHeaders });
  }
}
