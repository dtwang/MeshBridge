import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

class StaticMapRenderer {
  constructor() {
    this.container = null
    this.map = null
    this.isInitialized = false
    this.mapConfig = null
    this.zoomLimits = { minZoom: 0, maxZoom: 22 }
    this.renderQueue = []
    this.isRendering = false
    this.imageCache = new Map()
  }

  async initialize() {
    if (this.isInitialized) return true

    try {
      const response = await fetch('/api/available-tilesets')
      const data = await response.json()
      
      if (!data.success || !data.map_enabled) {
        console.log('Map disabled:', data.message)
        return false
      }

      this.mapConfig = data

      let styleUrl = '/tiles/style.json'
      if (data.layer_mode === 'single' && data.tilesets.length === 1) {
        styleUrl = `/tiles/${data.tilesets[0].name}/style.json`
      }

      const styleResponse = await fetch(styleUrl)
      const style = await styleResponse.json()
      
      const firstSource = Object.values(style.sources)[0]
      if (firstSource) {
        this.zoomLimits.minZoom = firstSource.minzoom || 0
        this.zoomLimits.maxZoom = firstSource.maxzoom || 22
      }

      // 確保只創建一個容器
      // 使用與實際顯示相同的尺寸比例，假設桌面寬度約 1200px，98% = 1176px
      if (!this.container) {
        this.container = document.createElement('div')
        // 使用實際顯示尺寸：寬度約 1176px (98% of ~1200px)，高度 240px
        this.container.style.width = '1176px'
        this.container.style.height = '240px'
        this.container.style.position = 'fixed'
        this.container.style.left = '-9999px'
        this.container.style.top = '-9999px'
        this.container.style.zIndex = '-1'
        // 不要設置 visibility: hidden，這會導致 canvas 無法正確渲染
        document.body.appendChild(this.container)
      }

      // 確保只創建一個地圖實例
      if (!this.map) {
        this.map = new maplibregl.Map({
          container: this.container,
          style: styleUrl,
          center: [121.5654, 25.0330],
          zoom: 14,
          minZoom: this.zoomLimits.minZoom,
          maxZoom: this.zoomLimits.maxZoom - 0.05,
          dragRotate: false,
          touchPitch: false,
          preserveDrawingBuffer: true
        })

        await new Promise((resolve) => {
          this.map.on('load', resolve)
        })
      }

      this.isInitialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize StaticMapRenderer:', error)
      return false
    }
  }

  generateCacheKey(locations, zoom) {
    const locStr = locations.map(l => `${l.lat.toFixed(6)},${l.lng.toFixed(6)},${l.label || ''}`).join('|')
    return `${locStr}:${zoom}`
  }

  async renderMapToImage(locations, zoom = 14, containerElement = null) {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        console.error('StaticMapRenderer not initialized')
        return null
      }
    }

    const cacheKey = this.generateCacheKey(locations, zoom)
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)
    }

    return new Promise((resolve) => {
      // 獲取當前請求的 Y 座標
      let yPosition = Infinity
      if (containerElement) {
        const rect = containerElement.getBoundingClientRect()
        yPosition = rect.top + window.scrollY
      }

      const newRequest = { locations, zoom, resolve, cacheKey, yPosition }

      // 找到應該插入的位置：找第一個 Y 座標大於當前請求的位置
      let insertIndex = this.renderQueue.findIndex(item => item.yPosition > yPosition)
      
      if (insertIndex === -1) {
        // 沒有找到更大的，加到最後
        this.renderQueue.push(newRequest)
      } else {
        // 插入到找到的位置
        this.renderQueue.splice(insertIndex, 0, newRequest)
      }

      if (!this.isRendering) {
        this.processQueue()
      }
    })
  }

  async processQueue() {
    // 如果正在渲染或佇列為空，不處理
    if (this.isRendering || this.renderQueue.length === 0) return

    this.isRendering = true
    const { locations, zoom, resolve, cacheKey } = this.renderQueue.shift()

    try {
      const markers = []
      const markerColors = ['#FF5252', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63']

      // 等待地圖移動完成
      await new Promise((resolveMove) => {
        if (locations.length === 1) {
          this.map.once('moveend', resolveMove)
          this.map.setCenter([locations[0].lng, locations[0].lat])
          this.map.setZoom(zoom)
        } else if (locations.length > 1) {
          const bounds = new maplibregl.LngLatBounds()
          locations.forEach(location => {
            bounds.extend([location.lng, location.lat])
          })
          this.map.once('moveend', resolveMove)
          this.map.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 0 })
        } else {
          resolveMove()
        }
      })

      // 等待地圖渲染完成
      await new Promise(resolveIdle => {
        this.map.once('idle', resolveIdle)
      })

      // 添加標記
      locations.forEach((location, index) => {
        const color = markerColors[index % markerColors.length]
        
        const markerElement = document.createElement('div')
        markerElement.style.width = '30px'
        markerElement.style.height = '40px'
        markerElement.innerHTML = `
          <svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" style="display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M15 0C8.373 0 3 5.373 3 12c0 9 12 28 12 28s12-19 12-28c0-6.627-5.373-12-12-12z" 
                  fill="${color}" 
                  stroke="white" 
                  stroke-width="2"/>
            <circle cx="15" cy="12" r="4" fill="white"/>
          </svg>
        `
        
        if (location.label) {
          const labelDiv = document.createElement('div')
          labelDiv.textContent = location.label
          labelDiv.style.position = 'absolute'
          labelDiv.style.bottom = '44px'
          labelDiv.style.left = '50%'
          labelDiv.style.transform = 'translateX(-50%)'
          labelDiv.style.backgroundColor = 'white'
          labelDiv.style.color = '#333'
          labelDiv.style.padding = '2px 6px'
          labelDiv.style.borderRadius = '3px'
          labelDiv.style.fontSize = '12px'
          labelDiv.style.fontWeight = 'bold'
          labelDiv.style.whiteSpace = 'nowrap'
          labelDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
          labelDiv.style.pointerEvents = 'none'
          markerElement.appendChild(labelDiv)
        }
        
        const marker = new maplibregl.Marker({ 
          element: markerElement,
          anchor: 'bottom'
        })
          .setLngLat([location.lng, location.lat])
          .addTo(this.map)
        
        markers.push(marker)
      })

      // 等待標記 DOM 渲染完成
      // 使用單次 requestAnimationFrame 即可，因為我們會手動繪製標記到 canvas
      await new Promise(resolve => {
        requestAnimationFrame(resolve)
      })

      try {
        // 獲取地圖 canvas
        const mapCanvas = this.map.getCanvas()
        const pixelRatio = window.devicePixelRatio || 1
        
        // 創建新的 canvas 用於合成
        const compositeCanvas = document.createElement('canvas')
        compositeCanvas.width = mapCanvas.width
        compositeCanvas.height = mapCanvas.height
        const ctx = compositeCanvas.getContext('2d')
        
        // 繪製地圖
        ctx.drawImage(mapCanvas, 0, 0)
        
        // 手動繪製標記到 canvas 上
        locations.forEach((location, index) => {
          const color = markerColors[index % markerColors.length]
          const point = this.map.project([location.lng, location.lat])
          
          // 考慮 pixel ratio
          const x = point.x * pixelRatio
          const y = point.y * pixelRatio
          
          // 繪製 pin - 只根據 pixel ratio 調整，不放大
          const scale = pixelRatio
          const pinWidth = 30 * scale
          const pinHeight = 40 * scale
          
          // 使用 Path2D 繪製 pin 形狀
          ctx.save()
          ctx.translate(x - pinWidth/2, y - pinHeight)
          ctx.scale(scale, scale)
          
          // 繪製陰影
          ctx.shadowColor = 'rgba(0,0,0,0.3)'
          ctx.shadowBlur = 4
          ctx.shadowOffsetX = 0
          ctx.shadowOffsetY = 2
          
          // 繪製 pin 外框（白色描邊）
          ctx.strokeStyle = 'white'
          ctx.lineWidth = 2
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(15, 0)
          ctx.bezierCurveTo(8.373, 0, 3, 5.373, 3, 12)
          ctx.bezierCurveTo(3, 21, 15, 40, 15, 40)
          ctx.bezierCurveTo(15, 40, 27, 21, 27, 12)
          ctx.bezierCurveTo(27, 5.373, 21.627, 0, 15, 0)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          
          // 繪製中心圓點
          ctx.shadowColor = 'transparent'
          ctx.fillStyle = 'white'
          ctx.beginPath()
          ctx.arc(15, 12, 4, 0, Math.PI * 2)
          ctx.fill()
          
          ctx.restore()
          
          // 繪製 label - 使用原始大小
          if (location.label) {
            ctx.save()
            const fontSize = 12 * pixelRatio
            ctx.font = `bold ${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            
            const labelText = location.label
            const metrics = ctx.measureText(labelText)
            const labelWidth = metrics.width + 12 * pixelRatio
            const labelHeight = 20 * pixelRatio
            const labelX = x
            const labelY = y - pinHeight - 4 * pixelRatio
            
            // 繪製 label 背景
            ctx.shadowColor = 'rgba(0,0,0,0.3)'
            ctx.shadowBlur = 4 * pixelRatio
            ctx.shadowOffsetX = 0
            ctx.shadowOffsetY = 2 * pixelRatio
            ctx.fillStyle = 'white'
            ctx.beginPath()
            ctx.roundRect(labelX - labelWidth/2, labelY - labelHeight, labelWidth, labelHeight, 3 * pixelRatio)
            ctx.fill()
            
            // 繪製 label 文字
            ctx.shadowColor = 'transparent'
            ctx.fillStyle = '#333'
            ctx.fillText(labelText, labelX, labelY - 4 * pixelRatio)
            
            ctx.restore()
          }
        })
        
        // 轉換為圖片
        const imageDataUrl = compositeCanvas.toDataURL('image/png')
        
        // 清理標記
        markers.forEach(marker => marker.remove())
        
        // 存入快取
        this.imageCache.set(cacheKey, imageDataUrl)
        resolve(imageDataUrl)
      } catch (error) {
        console.error('Failed to capture map image:', error)
        markers.forEach(marker => marker.remove())
        resolve(null)
      }
    } catch (error) {
      console.error('Error rendering map:', error)
      resolve(null)
    } finally {
      // 標記渲染完成，處理下一個
      this.isRendering = false
      // 使用 setTimeout 確保當前渲染完全結束後再處理下一個
      setTimeout(() => this.processQueue(), 0)
    }
  }

  clearCache() {
    this.imageCache.clear()
  }

  destroy() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
      this.container = null
    }
    this.isInitialized = false
    this.imageCache.clear()
  }
}

const staticMapRenderer = new StaticMapRenderer()

export default staticMapRenderer
