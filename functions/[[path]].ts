/**
 * Cloudflare Pages Worker - 使用 D1 存储
 */
export async function onRequest(context) {
  const D1_DB_ID = '2f1426cc-6491-4e4f-bc99-44ced6fff6e5'
  const ACCOUNT_ID = '266b118cf612f91c8b6dcbf81cc65e19'
  const API_TOKEN = 'cfut_6kg8Ffz2mdJawv1bYoW8BYszes9csH4laolBnPVcff38496c'

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  }

  if (context.request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders })
  }

  const url = new URL(context.request.url)
  
  // Handle /api/feishu (兼容旧接口，实际使用 D1)
  if (url.pathname === '/api/feishu') {
    try {
      // D1 API
      const d1Url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/databases/${D1_DB_ID}/query`
      
      if (context.request.method === 'GET') {
        const filter = url.searchParams.get('filter') || ''
        
        let sql = 'SELECT * FROM bookings WHERE 1=1'
        const params = []
        
        // 解析 filter 参数 (如: CurrentValue.[电话]="13800138000")
        if (filter.includes('电话')) {
          const match = filter.match(/电话]="(.+?)"/)
          if (match) {
            sql += ' AND phone = ?'
            params.push(match[1])
          }
        }
        
        sql += ' ORDER BY created_at DESC'
        
        const resp = await fetch(d1Url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: sql,
            params: params
          })
        })
        
        const data = await resp.json()
        
        if (!data.success) {
          // 表可能不存在，返回空结果
          return new Response(JSON.stringify({ data: { items: [] } }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        // 转换 D1 结果格式为兼容飞书格式
        const items = (data.result || []).map(row => ({
          record_id: row.id,
          fields: {
            '姓名': row.name,
            '电话': row.phone,
            '预约日期': row.date,
            '预约时段': row.time_slot,
            '备注': row.remark,
            '预约状态': row.status
          }
        }))
        
        return new Response(JSON.stringify({ data: { items } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      if (context.request.method === 'POST') {
        const body = await context.request.json()
        const fields = body.fields || {}
        
        const id = Date.now().toString()
        const name = fields['姓名'] || ''
        const phone = fields['电话'] || ''
        const date = fields['预约日期'] ? new Date(fields['预约日期']).toISOString().split('T')[0] : ''
        const timeSlot = fields['预约时段'] || ''
        const remark = fields['备注'] || ''
        const createdAt = Math.floor(Date.now() / 1000)
        
        const sql = `INSERT INTO bookings (id, name, phone, date, time_slot, remark, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`
        
        const resp = await fetch(d1Url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: sql,
            params: [id, name, phone, date, timeSlot, remark, createdAt]
          })
        })
        
        const data = await resp.json()
        
        if (data.success) {
          return new Response(JSON.stringify({ code: 0, data: { record_id: id } }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        } else {
          return new Response(JSON.stringify({ code: 500, msg: data.errors?.[0]?.message || '插入失败' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }
      
      if (context.request.method === 'DELETE') {
        const recordId = url.searchParams.get('id')
        
        const sql = 'DELETE FROM bookings WHERE id = ?'
        
        const resp = await fetch(d1Url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sql: sql,
            params: [recordId]
          })
        })
        
        return new Response(JSON.stringify({ code: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      return new Response('Method not allowed', { status: 405 })
    } catch (err) {
      return new Response(JSON.stringify({ code: 500, msg: err.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response('Not Found', { status: 404 })
}