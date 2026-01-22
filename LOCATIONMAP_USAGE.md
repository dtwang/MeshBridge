# LocationMap Component Usage

## Overview
A React component that displays an interactive map using MapLibre GL and serves tiles from a local MBTiles file.

## Frontend Usage

### Import the Component
```jsx
import LocationMap from './LocationMap'
```

### Basic Usage
```jsx
<LocationMap lat={25.033} lng={121.565} />
```

### With Custom Zoom
```jsx
<LocationMap lat={25.033} lng={121.565} zoom={12} />
```

### Example Integration in App.jsx
```jsx
import LocationMap from './LocationMap'

function App() {
  return (
    <div>
      <h1>My Location</h1>
      <LocationMap lat={25.033} lng={121.565} zoom={14} />
    </div>
  )
}
```

## Backend API Endpoints

The backend provides three endpoints for serving map tiles:

### 1. Tile Data Endpoint
```
GET /tiles/{tileset}/{z}/{x}/{y}
```
Returns individual tile data (PNG, JPEG, or vector tiles).

**Example:**
```
GET /tiles/taiwan/14/13850/6324
```

### 2. Style JSON Endpoint
```
GET /tiles/{tileset}/style.json
```
Returns MapLibre style configuration with layer definitions.

**Example:**
```
GET /tiles/taiwan/style.json
```

### 3. TileJSON Endpoint
```
GET /tiles/{tileset}/tilejson.json
```
Returns TileJSON metadata including bounds, zoom levels, and tile URLs.

**Example:**
```
GET /tiles/taiwan/tilejson.json
```

## Setup Requirements

### 1. Install Frontend Dependencies
```bash
cd frontend_app_noteboard
npm install
```

This will install `maplibre-gl` along with other dependencies.

### 2. MBTiles File Location
Place your MBTiles file at:
```
/maps/taiwan.mbtiles
```

The backend expects MBTiles files in the `/maps/` directory with the naming pattern `{tileset}.mbtiles`.

### 3. MBTiles File Structure
The MBTiles file should contain:
- `tiles` table with columns: `zoom_level`, `tile_column`, `tile_row`, `tile_data`
- `metadata` table with columns: `name`, `value`

Recommended metadata fields:
- `name`: Display name of the tileset
- `description`: Description of the tileset
- `bounds`: Bounding box as "minlon,minlat,maxlon,maxlat"
- `center`: Center point as "lon,lat,zoom"
- `minzoom`: Minimum zoom level
- `maxzoom`: Maximum zoom level
- `attribution`: Attribution text

## Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `lat` | number | required | Latitude coordinate |
| `lng` | number | required | Longitude coordinate |
| `zoom` | number | 14 | Initial zoom level |

## Features

- **Interactive Map**: Pan, zoom, and navigate the map
- **Marker**: Automatically places a marker at the specified coordinates
- **Navigation Controls**: Zoom in/out and compass controls
- **Responsive**: Adapts to container size
- **Cached Tiles**: Tiles are cached for 24 hours for better performance

## Coordinate System Notes

- The backend automatically converts between XYZ (used by MapLibre) and TMS (used by MBTiles) coordinate systems
- You only need to provide standard lat/lng coordinates in WGS84 (EPSG:4326)

## Troubleshooting

### Map doesn't load
1. Check that `/maps/taiwan.mbtiles` exists
2. Verify the MBTiles file has the correct schema
3. Check browser console for errors

### Tiles not displaying
1. Verify the style.json endpoint returns valid JSON
2. Check that tile URLs are accessible
3. Ensure the MBTiles file contains tiles for the requested zoom level and coordinates

### Performance issues
1. Ensure tiles are being cached (check response headers)
2. Consider using a CDN for tile serving in production
3. Optimize MBTiles file size and zoom levels
