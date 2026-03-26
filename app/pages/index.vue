<template>
  <div class="app">
    <!-- 头部 -->
    <div class="header">
      <h1>🌿 臧式养生馆</h1>
      <p>霍尔灸 · 足浴 · 养生 · 调理</p>
    </div>

    <!-- 导航 -->
    <div class="nav-tabs">
      <div class="nav-tab" :class="{ active: activeTab === 'book' }" @click="activeTab = 'book'">预约</div>
      <div class="nav-tab" :class="{ active: activeTab === 'my' }" @click="activeTab = 'my'">我的预约</div>
    </div>

    <div class="content">
      <!-- 预约页 -->
      <div v-if="activeTab === 'book'" class="page">
        <!-- 日期选择 -->
        <div class="date-section">
          <h3>📅 选择日期</h3>
          <div class="date-list">
            <div 
              v-for="(d, i) in dates" 
              :key="i"
              class="date-item"
              :class="{ selected: selectedDate === d.date }"
              @click="selectDate(d.date)"
            >
              <div class="week">{{ d.week }}</div>
              <div class="day">{{ d.day }}</div>
              <div class="month">{{ d.month }}</div>
            </div>
          </div>
        </div>

        <!-- 时段选择 -->
        <div class="time-section">
          <h3>⏰ 选择时段（剩余/总名额）</h3>
          <div class="time-list">
            <div 
              v-for="slot in timeSlots" 
              :key="slot.start"
              class="time-item"
              :class="{ selected: selectedTime === slot.start, disabled: slot.isFull }"
              @click="selectTime(slot)"
            >
              <span class="time">{{ slot.start }} - {{ slot.end }}</span>
              <span v-if="slot.isFull" class="full-tag">已约满</span>
              <span v-else class="remain">剩{{ slot.remain }}位</span>
            </div>
          </div>
        </div>

        <!-- 填写信息 -->
        <div class="form-section">
          <h3>📝 填写信息</h3>
          <div class="form-item">
            <input v-model="name" type="text" placeholder="请输入您的姓名" />
          </div>
          <div class="form-item">
            <input v-model="phone" type="tel" placeholder="请输入手机号" maxlength="11" />
          </div>
          <div class="form-item">
            <textarea v-model="remark" placeholder="如有特殊需求请在此说明"></textarea>
          </div>
          <button class="btn-primary" :disabled="!canBook" @click="handleBook">
            确认预约
          </button>
          <p class="tip">💡 温馨提示：预约成功后可在我<span style="color:#667eea;font-weight:600">的预约</span>中查看或取消/改约</p>
        </div>
      </div>

      <!-- 我的预约页 -->
      <div v-if="activeTab === 'my'" class="page">
        <div class="search-section">
          <input v-model="searchPhone" type="tel" placeholder="输入手机号查询预约" />
          <button class="btn-search" @click="handleSearch">查询</button>
        </div>
        <div id="myBookings">
          <div v-if="bookings.length === 0" class="empty-state">
            <p>暂无预约记录</p>
          </div>
          <div v-else v-for="b in bookings" :key="b.id" class="booking-card">
            <div class="card-info">
              <div>{{ b.date }} {{ b.timeSlot }}</div>
              <div class="status">{{ b.status === 'cancelled' ? '已取消' : '已预约' }}</div>
            </div>
            <button v-if="b.status !== 'cancelled'" class="btn-cancel" @click="cancelBooking(b.id)">取消预约</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <div v-if="showConfirm" class="modal-overlay" @click="showConfirm = false">
      <div class="confirm-modal" @click.stop>
        <h3>📋 确认预约信息</h3>
        <div class="confirm-info">
          <div class="row"><span class="label">日期</span><span class="value">{{ confirmDate }}</span></div>
          <div class="row"><span class="label">时段</span><span class="value">{{ selectedTime }}</span></div>
          <div class="row"><span class="label">姓名</span><span class="value">{{ name }}</span></div>
          <div class="row"><span class="label">电话</span><span class="value">{{ phone }}</span></div>
        </div>
        <div class="confirm-actions">
          <button class="btn-cancel-modal" @click="showConfirm = false">取消</button>
          <button class="btn-primary" @click="confirmSubmit">确认提交</button>
        </div>
      </div>
    </div>

    <!-- 加载遮罩 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div class="loading-text">{{ loadingText }}</div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="toast">{{ toast }}</div>
  </div>
</template>

<script setup>
const activeTab = ref('book')
const dates = ref([])
const timeSlots = ref([
  { start: '09:30', end: '10:30', remain: 3, isFull: false },
  { start: '10:30', end: '11:30', remain: 3, isFull: false },
  { start: '11:30', end: '12:30', remain: 3, isFull: false },
  { start: '14:30', end: '15:30', remain: 3, isFull: false },
  { start: '15:30', end: '16:30', remain: 3, isFull: false }
])
const selectedDate = ref('')
const selectedTime = ref('')
const name = ref('')
const phone = ref('')
const remark = ref('')
const searchPhone = ref('')
const bookings = ref([])
const showConfirm = ref(false)
const loading = ref(false)
const loadingText = ref('')
const toast = ref('')

const API = '/api'
const D1_TOKEN = 'cfat_cPahg4lZLwPAgkLOBDX8jmxgf1IORtRIQlIz9JMvbc5d1c0f'
const D1_DB_ID = '2f1426cc-6491-4e4f-bc99-44ced6fff6e5'
const ACCOUNT_ID = '266b118cf612f91c8b6dcbf81cc65e19'

// 初始化日期
const initDates = () => {
  const arr = []
  const today = new Date()
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    arr.push({
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      week: weekdays[d.getDay()],
      day: d.getDate(),
      month: (d.getMonth()+1) + '月'
    })
  }
  dates.value = arr
  selectedDate.value = arr[0].date
}

const selectDate = (date) => {
  selectedDate.value = date
  selectedTime.value = ''
  loadTimeSlots()
}

const selectTime = (slot) => {
  if (slot.isFull) return
  selectedTime.value = slot.start
}

const canBook = computed(() => {
  return name.value && phone.value && selectedTime.value && /^1[3-9]\d{9}$/.test(phone.value)
})

const confirmDate = computed(() => {
  if (!selectedDate.value) return ''
  const d = new Date(selectedDate.value)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth()+1}月${d.getDate()}日 ${weekdays[d.getDay()]}`
})

// 加载时段
const loadTimeSlots = async () => {
  try {
    const sql = `SELECT * FROM bookings WHERE date = '${selectedDate.value}'`
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: sql })
    })
    const data = await res.json()
    const items = data.result?.[0]?.results || []
    
    timeSlots.value = [
      { start: '09:30', end: '10:30', remain: 3, isFull: false },
      { start: '10:30', end: '11:30', remain: 3, isFull: false },
      { start: '11:30', end: '12:30', remain: 3, isFull: false },
      { start: '14:30', end: '15:30', remain: 3, isFull: false },
      { start: '15:30', end: '16:30', remain: 3, isFull: false }
    ]
    timeSlots.value.forEach(slot => {
      const count = items.filter(i => i.time_slot === slot.start).length
      slot.remain = 3 - count
      slot.isFull = count >= 3
    })
  } catch (e) {
    console.error(e)
  }
}

const showToast = (msg) => {
  toast.value = msg
  setTimeout(() => toast.value = '', 2000)
}

const handleBook = () => {
  if (!canBook.value) {
    showToast('请填写完整信息')
    return
  }
  showConfirm.value = true
}

const confirmSubmit = async () => {
  showConfirm.value = false
  loading.value = true
  loadingText.value = '正在提交预约...'
  
  try {
    const id = Date.now().toString()
    const createdAt = Math.floor(Date.now() / 1000)
    const sql = `INSERT INTO bookings (id, name, phone, date, time_slot, remark, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`
    
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: sql,
        params: [id, name.value, phone.value, selectedDate.value, selectedTime.value, remark.value || '', createdAt]
      })
    })
    const data = await res.json()
    
    if (!data.success) {
      showToast('预约失败')
      loading.value = false
      return
    }
    
    // 清空表单
    name.value = ''
    phone.value = ''
    remark.value = ''
    selectedTime.value = ''
    
    await loadTimeSlots()
    showToast('预约成功！')
    
    // 跳转到我的预约
    activeTab.value = 'my'
    searchPhone.value = phone.value
    handleSearch()
  } catch (e) {
    console.error(e)
    showToast('预约失败')
  }
  
  loading.value = false
}

const handleSearch = async () => {
  if (!searchPhone.value) return
  loading.value = true
  loadingText.value = '正在查询...'
  
  try {
    const sql = `SELECT * FROM bookings WHERE phone = '${searchPhone.value}' ORDER BY created_at DESC`
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: sql })
    })
    const data = await res.json()
    const items = data.result?.[0]?.results || []
    bookings.value = items.map(i => ({
      id: i.id,
      date: i.date,
      timeSlot: i.time_slot,
      status: i.status
    }))
  } catch (e) {
    showToast('查询失败')
  }
  
  loading.value = false
}

const cancelBooking = async (id) => {
  if (!confirm('确定取消？')) return
  loading.value = true
  loadingText.value = '正在取消...'
  
  try {
    const sql = `DELETE FROM bookings WHERE id = '${id}'`
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: sql })
    })
    showToast('已取消')
    handleSearch()
  } catch (e) {
    showToast('取消失败')
  }
  
  loading.value = false
}

onMounted(() => {
  initDates()
  loadTimeSlots()
})
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f6fa; padding-bottom: 80px; }
.header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 24px 20px 60px; border-radius: 0 0 24px 24px; }
.header h1 { font-size: 22px; margin-bottom: 4px; }
.header p { font-size: 13px; opacity: 0.9; }
.nav-tabs { display: flex; background: white; padding: 0 16px; margin: -40px 16px 16px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.nav-tab { flex: 1; padding: 14px 0; text-align: center; font-size: 15px; color: #666; border-bottom: 3px solid transparent; }
.nav-tab.active { color: #667eea; border-bottom-color: #667eea; font-weight: 600; }
.content { padding: 0 16px; }
.date-section, .time-section, .form-section, .search-section { background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.date-section h3, .time-section h3, .form-section h3 { font-size: 14px; color: #999; margin-bottom: 12px; }
.date-list { display: flex; gap: 10px; overflow-x: auto; }
.date-item { flex-shrink: 0; width: 60px; padding: 10px 4px; text-align: center; border-radius: 10px; background: #f5f6fa; }
.date-item.selected { background: #667eea; color: white; }
.date-item .week { font-size: 11px; color: #999; }
.date-item.selected .week { color: rgba(255,255,255,0.8); }
.date-item .day { font-size: 18px; font-weight: 600; }
.date-item .month { font-size: 10px; color: #999; }
.time-list { display: flex; flex-direction: column; gap: 10px; }
.time-item { display: flex; justify-content: space-between; padding: 14px 16px; background: #f5f6fa; border-radius: 10px; }
.time-item.selected { background: #667eea; color: white; }
.time-item.disabled { opacity: 0.5; }
.form-item { margin-bottom: 12px; }
.form-item input, .form-item textarea { width: 100%; padding: 12px; font-size: 15px; border: 1px solid #e8e8e8; border-radius: 8px; }
.btn-primary { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 10px; font-size: 16px; }
.btn-primary:disabled { opacity: 0.5; }
.search-section { display: flex; gap: 10px; }
.search-section input { flex: 1; padding: 12px; border: 1px solid #e8e8e8; border-radius: 8px; }
.btn-search { padding: 12px 20px; background: #667eea; color: white; border: none; border-radius: 8px; }
.booking-card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
.btn-cancel { padding: 8px 16px; background: #ff4d4f; color: white; border: none; border-radius: 6px; }
.empty-state { text-align: center; padding: 40px; color: #999; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.confirm-modal { background: white; border-radius: 16px; padding: 24px; width: 90%; max-width: 320px; }
.confirm-modal h3 { text-align: center; margin-bottom: 16px; }
.confirm-info { background: #f5f6fa; border-radius: 10px; padding: 14px; }
.row { display: flex; justify-content: space-between; padding: 8px 0; }
.row .label { color: #999; }
.confirm-actions { display: flex; gap: 12px; margin-top: 16px; }
.btn-cancel-modal { flex: 1; padding: 12px; background: #f5f6fa; border: none; border-radius: 8px; }
.loading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 200; }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.loading-text { color: white; margin-top: 12px; }
.toast { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 12px 24px; border-radius: 8px; z-index: 300; }
.tip { margin-top: 12px; font-size: 13px; color: #666; }
</style>