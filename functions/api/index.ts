// Cloudflare Pages Functions - 预约系统后端

const FEISHU_API = 'https://open.feishu.cn/open-apis';

// 飞书机器人 Webhook
const BOOKING_WEBHOOK = 'https://open.feishu.cn/open-apis/bot/v2/hook/8fe65cb8-8810-43a1-8f22-0ee2e2845e76';

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

// 发送飞书群通知
async function sendFeishuNotification(booking, type) {
  const title = type === 'create' ? '📢 新预约通知' : '❌ 预约取消';
  const template = type === 'create' ? 'green' : 'red';
  
  const message = {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          tag: "plain_text",
          content: title
        },
        template: template
      },
      elements: [
        {
          tag: "div",
          fields: [
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: "**👤 姓名**\n" + booking.name
              }
            },
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: "**📱 电话**\n" + booking.phone
              }
            }
          ]
        },
        {
          tag: "div",
          fields: [
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: "**📅 日期**\n" + booking.date
              }
            },
            {
              is_short: true,
              text: {
                tag: "lark_md",
                content: "**⏰ 时段**\n" + booking.timeSlot
              }
            }
          ]
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: "**📝 备注**: " + (booking.remark || "无")
          }
        }
      ]
    }
  };

  await fetch(BOOKING_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
}

// 获取所有预约并发送到飞书群
async function sendBookingList(env) {
  const sql = `SELECT * FROM bookings ORDER BY created_at DESC`;
  const stmt = env.D1_BOOKINGS.prepare(sql);
  const result = await stmt.all();
  const bookings = result.results || [];
  
  // 构建表格内容
  let tableContent = '';
  let index = 1;
  
  for (const b of bookings) {
    const status = b.status === 'cancelled' ? '❌ 已取消' : '✅ 已预约';
    const rowColor = b.status === 'cancelled' ? '🔴' : '🟢';
    tableContent += `${rowColor} ${b.name} | ${b.phone} | ${b.date} ${b.time_slot} | ${status}\n`;
    index++;
    if (index > 15) break; // 限制显示前15条
  }
  
  const message = {
    msg_type: "interactive",
    card: {
      header: {
        title: {
          tag: "plain_text",
          content: "📋 当前预约列表"
        },
        template: "blue"
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: "🟢 已预约 | 🔴 已取消\n\n" + tableContent
          }
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `📊 共 ${bookings.length} 条预约记录`
          }
        }
      ]
    }
  };

  await fetch(BOOKING_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
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
    
    // 预约创建接口
    if (body.type === 'create_booking') {
      const { name, phone, date, timeSlot, remark } = body;
      
      // 检查是否已预约
      const checkSql = `SELECT COUNT(*) as count FROM bookings WHERE phone = '${phone}' AND date = '${date}' AND time_slot = '${timeSlot}' AND status = 'confirmed'`;
      const checkStmt = env.D1_BOOKINGS.prepare(checkSql);
      const checkResult = await checkStmt.first();
      
      if (checkResult && checkResult.count > 0) {
        return Response.json({ success: false, error: '该时段已预约' }, { headers: corsHeaders });
      }
      
      // 检查剩余名额
      const countSql = `SELECT COUNT(*) as count FROM bookings WHERE date = '${date}' AND time_slot = '${timeSlot}' AND status = 'confirmed'`;
      const countStmt = env.D1_BOOKINGS.prepare(countSql);
      const countResult = await countStmt.first();
      
      if (countResult && countResult.count >= 3) {
        return Response.json({ success: false, error: '该时段已约满' }, { headers: corsHeaders });
      }
      
      // 创建预约
      const id = Date.now().toString();
      const createdAt = Math.floor(Date.now() / 1000);
      const insertSql = `INSERT INTO bookings (id, name, phone, date, time_slot, remark, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`;
      const insertStmt = env.D1_BOOKINGS.prepare(insertSql);
      await insertStmt.bind(id, name, phone, date, timeSlot, remark || '', createdAt).run();
      
      // 发送飞书通知
      await sendFeishuNotification({ name, phone, date, timeSlot, remark }, 'create');
      await sendBookingList(env);
      
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
    // 取消预约接口
    if (body.type === 'cancel_booking') {
      const { id } = body;
      
      // 获取预约信息
      const getSql = `SELECT * FROM bookings WHERE id = '${id}'`;
      const getStmt = env.D1_BOOKINGS.prepare(getSql);
      const booking = await getStmt.first();
      
      // 更新状态
      const updateSql = `UPDATE bookings SET status = 'cancelled' WHERE id = '${id}'`;
      const updateStmt = env.D1_BOOKINGS.prepare(updateSql);
      await updateStmt.run();
      
      // 发送飞书通知
      if (booking) {
        await sendFeishuNotification({ 
          name: booking.name, 
          phone: booking.phone, 
          date: booking.date, 
          timeSlot: booking.time_slot,
          remark: booking.remark 
        }, 'cancel');
      }
      await sendBookingList(env);
      
      return Response.json({ success: true }, { headers: corsHeaders });
    }
    
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
