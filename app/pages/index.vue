<template>
  <div class="qr-page">
    <img src="/logo.png" alt="藏有引力" class="qr-logo" />
    <h1>藏有引力</h1>
    <p class="desc">霍尔灸 · 足浴 · 养生 · 调理</p>
    
    <div class="qr-section">
      <img src="/qrcode.png" alt="预约二维码" class="qr-img" />
      <p class="qr-tip">长按二维码识别预约</p>
    </div>
    
    <div class="link-section">
      <p class="link-tip">或复制链接到浏览器打开</p>
      <div class="link-box">
        <input type="text" :value="bookingUrl" readonly class="link-input" id="copyInput" />
        <button @click="copyLink" class="copy-btn">{{ copied ? '已复制' : '复制' }}</button>
      </div>
    </div>
    
    <a href="/booking" class="direct-link">直接进入预约 →</a>
  </div>
</template>

<script setup>
const bookingUrl = 'https://yuyue-booking.pages.dev'
const copied = ref(false)

const copyLink = () => {
  const input = document.getElementById('copyInput')
  input.select()
  document.execCommand('copy')
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: linear-gradient(135deg, #667eea, #764ba2); min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
.qr-page { padding: 40px 20px; text-align: center; color: white; }
.qr-logo { width: 120px; margin-bottom: 16px; }
h1 { font-size: 28px; margin-bottom: 8px; }
.desc { font-size: 14px; opacity: 0.9; margin-bottom: 30px; letter-spacing: 2px; }
.qr-section { background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
.qr-img { width: 200px; height: 200px; }
.qr-tip { color: #666; font-size: 14px; margin-top: 12px; }
.link-section { background: rgba(255,255,255,0.2); border-radius: 12px; padding: 20px; }
.link-tip { font-size: 14px; margin-bottom: 12px; }
.link-box { display: flex; gap: 10px; }
.link-input { flex: 1; padding: 12px; border: none; border-radius: 8px; font-size: 14px; }
.copy-btn { padding: 12px 24px; background: #fff; color: #667eea; border: none; border-radius: 8px; font-weight: 600; }
.direct-link { display: block; margin-top: 24px; color: white; font-size: 16px; text-decoration: underline; }
</style>
