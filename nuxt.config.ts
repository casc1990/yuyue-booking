// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  
  // 静态生成模式，适合 Cloudflare Pages
  ssr: true,
  
  future: {
    compatibilityVersion: 4,
  },
  
  app: {
    head: {
      title: '臧式养生馆',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
      ]
    }
  },
  
  // Cloudflare Pages 配置
  nitro: {
    preset: 'static'
  }
})