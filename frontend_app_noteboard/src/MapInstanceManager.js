function isMobileLayout() {
  // 動態檢測 .notes-grid 是否為單欄顯示
  // 透過檢查 Grid 的實際渲染結果，而非固定的 px 數字
  const notesGrid = document.querySelector('.notes-grid')
  
  if (!notesGrid) {
    // 如果找不到 Grid 元素，使用保守的寬度判斷
    return window.innerWidth <= 480
  }
  
  // 檢查 Grid 的 computed style
  const computedStyle = window.getComputedStyle(notesGrid)
  const gridTemplateColumns = computedStyle.gridTemplateColumns
  
  // 如果 grid-template-columns 只有一個值（單欄），返回 true
  // 例如: "1fr" 或 "500px" (單欄)
  // 多欄會是: "250px 250px" 或 "1fr 1fr" 等
  const columnCount = gridTemplateColumns.split(' ').filter(val => val && val !== 'none').length
  
  return columnCount <= 1
}

function needsWebGLControl() {
  return isMobileLayout()
}

class MapInstanceManager {
  constructor(maxInstances = 3) {
    this.maxInstances = maxInstances
    this.activeInstances = new Map()
    this.pendingQueue = []
    this.instanceCounter = 0
    this.needsControl = needsWebGLControl()
    this.desktopInteractiveMap = null
    this.desktopCallbacks = new Map()
  }

  requestInstance(componentId, priority = 0) {
    return new Promise((resolve) => {
      // 不需要 WebGL 控制的設備：直接允許所有地圖實例
      if (!this.needsControl) {
        const instanceId = ++this.instanceCounter
        this.activeInstances.set(componentId, { instanceId, priority })
        resolve({ allowed: true, instanceId })
        return
      }

      // 需要 WebGL 控制的設備（Android Chrome / iOS Safari）：應用實例限制
      if (this.activeInstances.size < this.maxInstances) {
        const instanceId = ++this.instanceCounter
        this.activeInstances.set(componentId, { instanceId, priority })
        resolve({ allowed: true, instanceId })
      } else {
        this.pendingQueue.push({ componentId, priority, resolve })
        this.pendingQueue.sort((a, b) => b.priority - a.priority)
        
        const lowestPriorityActive = this._findLowestPriorityActive()
        if (lowestPriorityActive && lowestPriorityActive.priority < priority) {
          this.releaseInstance(lowestPriorityActive.componentId)
        } else {
          resolve({ allowed: false, instanceId: null })
        }
      }
    })
  }

  releaseInstance(componentId) {
    if (this.activeInstances.has(componentId)) {
      this.activeInstances.delete(componentId)
      this._processQueue()
    }
  }

  updatePriority(componentId, newPriority) {
    if (this.activeInstances.has(componentId)) {
      const instance = this.activeInstances.get(componentId)
      instance.priority = newPriority
    }
  }

  _findLowestPriorityActive() {
    let lowest = null
    for (const [componentId, instance] of this.activeInstances.entries()) {
      if (!lowest || instance.priority < lowest.priority) {
        lowest = { componentId, ...instance }
      }
    }
    return lowest
  }

  _processQueue() {
    if (this.pendingQueue.length > 0 && this.activeInstances.size < this.maxInstances) {
      const next = this.pendingQueue.shift()
      const instanceId = ++this.instanceCounter
      this.activeInstances.set(next.componentId, { instanceId, priority: next.priority })
      next.resolve({ allowed: true, instanceId })
    }
  }

  getActiveCount() {
    return this.activeInstances.size
  }

  isActive(componentId) {
    return this.activeInstances.has(componentId)
  }

  requestDesktopInteractiveMap(componentId) {
    // 桌機版：一次只能有一個互動地圖
    if (isMobileLayout()) return

    // 如果已經有活動的互動地圖，先釋放它
    if (this.desktopInteractiveMap && this.desktopInteractiveMap !== componentId) {
      const callback = this.desktopCallbacks.get(this.desktopInteractiveMap)
      if (callback) {
        callback() // 通知舊地圖恢復成靜態圖
      }
      this.releaseInstance(this.desktopInteractiveMap)
    }

    // 設定新的互動地圖
    this.desktopInteractiveMap = componentId
    const instanceId = ++this.instanceCounter
    this.activeInstances.set(componentId, { instanceId, priority: 100 })
  }

  registerDesktopCallback(componentId, callback) {
    this.desktopCallbacks.set(componentId, callback)
  }

  unregisterDesktopCallback(componentId) {
    this.desktopCallbacks.delete(componentId)
    if (this.desktopInteractiveMap === componentId) {
      this.desktopInteractiveMap = null
    }
  }
}

const mapInstanceManager = new MapInstanceManager(3)

export { isMobileLayout, needsWebGLControl }
export default mapInstanceManager
