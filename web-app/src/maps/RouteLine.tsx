import type { FC } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection, LineString } from 'geojson'

export interface RouteLineProps {
  id?: string
  geometry: FeatureCollection<LineString>
  sourceProps?: Record<string, unknown>
  layerProps?: Record<string, unknown>
}

export const RouteLine: FC<RouteLineProps> = ({
  id = 'route-line',
  geometry,
  sourceProps,
  layerProps,
}) => {
  return (
    <Source id={id} type="geojson" data={geometry as any} {...(sourceProps as any)}>
      <Layer
        id={`${id}-layer`}
        type="line"
        paint={{
          'line-color': 'hsl(280, 100%, 60%)', // approximate accent color
          'line-width': 4,
          'line-opacity': 0.85,
        } as any}
        {...(layerProps as any)}
      />
    </Source>
  )
}

