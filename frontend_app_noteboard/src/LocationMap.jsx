import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

function LocationMap({ lat, lng, locations, zoom = 14 }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markers = useRef([])
  const [zoomLimits, setZoomLimits] = useState({ minZoom: 0, maxZoom: 22 })

  useEffect(() => {
    const fetchZoomLimits = async () => {
      try {
        const response = await fetch('/tiles/taiwan/style.json')
        const style = await response.json()
        
        const firstSource = Object.values(style.sources)[0]
        if (firstSource) {
          const minZoom = firstSource.minzoom || 0
          const maxZoom = firstSource.maxzoom || 22
          setZoomLimits({ minZoom, maxZoom })
        }
      } catch (error) {
        console.error('Failed to fetch zoom limits:', error)
      }
    }
    
    fetchZoomLimits()
  }, [])

  useEffect(() => {
    if (map.current) return

    const locationsList = locations || (lat !== undefined && lng !== undefined ? [{ lat, lng }] : [])
    
    if (locationsList.length === 0) return

    const firstLocation = locationsList[0]
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: '/tiles/taiwan/style.json',
      center: [firstLocation.lng, firstLocation.lat],
      zoom: zoom,
      minZoom: zoomLimits.minZoom,
      maxZoom: zoomLimits.maxZoom - 0.05,
      dragRotate: false,
      touchPitch: false,
      cooperativeGestures: true
    })

    map.current.touchZoomRotate.disableRotation()

    const markerColors = ['#FF5252', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63']
    
    locationsList.forEach((location, index) => {
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
        .addTo(map.current)
      
      markers.current.push(marker)
    })

    if (locationsList.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      locationsList.forEach(location => {
        bounds.extend([location.lng, location.lat])
      })
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
    }

    map.current.addControl(
      new maplibregl.NavigationControl({
        showCompass: false,
        showZoom: true,
        visualizePitch: false
      }),
      'top-right'
    )

    map.current.on('zoom', () => {
      console.log('Current zoom level:', map.current.getZoom())
    })
    
    console.log('Map initialized with zoom:', zoom, 'minZoom:', zoomLimits.minZoom, 'maxZoom:', zoomLimits.maxZoom)

    return () => {
      markers.current.forEach(marker => marker.remove())
      markers.current = []
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [zoomLimits])

  useEffect(() => {
    if (!map.current) return

    const locationsList = locations || (lat !== undefined && lng !== undefined ? [{ lat, lng }] : [])
    
    if (locationsList.length === 0) return

    markers.current.forEach(marker => marker.remove())
    markers.current = []

    const markerColors = ['#FF5252', '#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#FF9800', '#00BCD4', '#E91E63']
    
    locationsList.forEach((location, index) => {
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
        .addTo(map.current)
      
      markers.current.push(marker)
    })

    if (locationsList.length === 1) {
      map.current.setCenter([locationsList[0].lng, locationsList[0].lat])
    } else if (locationsList.length > 1) {
      const bounds = new maplibregl.LngLatBounds()
      locationsList.forEach(location => {
        bounds.extend([location.lng, location.lat])
      })
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 })
    }
  }, [lat, lng, locations])

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '98%', 
        margin: '0 auto',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        height: '240px',
        borderRadius: '8px',
        overflow: 'hidden'
      }} 
    />
  )
}

export default LocationMap
