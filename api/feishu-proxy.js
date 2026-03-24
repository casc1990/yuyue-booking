// Netlify Function - 飞书API代理，解决CORS跨域问题
const fetch = require('node-fetch');

const FEISHU_API = 'https://open.feishu.cn/open-apis';

// 获取 tenant token
async function getToken() {
  const resp = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET
    })
  });
  const data = await resp.json();
  return data.tenant_access_token;
}

// 通用请求代理
async function proxyRequest(path, method, body) {
  const token = await getToken();
  const resp = await fetch(`${FEISHU_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return await resp.json();
}

exports.handler = async function(event) {
  const { action, path, method, body } = JSON.parse(event.body || '{}');
  
  // CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  // 处理 OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let result;
    
    switch (action) {
      case 'query':
        result = await proxyRequest(path, 'GET');
        break;
      case 'create':
        result = await proxyRequest(path, 'POST', body);
        break;
      case 'update':
        result = await proxyRequest(path, 'PUT', body);
        break;
      case 'delete':
        result = await proxyRequest(path, 'DELETE');
        break;
      default:
        result = { code: 400, msg: 'Unknown action' };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ code: 500, msg: err.message })
    };
  }
};
