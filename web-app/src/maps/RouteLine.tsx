import type { FC } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'

type LatLng = {
  lat: number
  lng: number
}

export interface RouteLineProps {
  id?: string
  from: LatLng
  to: LatLng
  sourceProps?: Record<string, unknown>
  layerProps?: Record<string, unknown>
}

export const RouteLine: FC<RouteLineProps> = ({
  id = 'route-line',
  from,
  to,
  sourceProps,
  layerProps,
}) => {
  const data = {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        },
        properties: {},
      },
    ],
  }

  return (
    <Source id={id} type="geojson" data={data} {...(sourceProps as any)}>
      <Layer
        id={`${id}-layer`}
        type="line"
        paint={{
          'line-color': '#2563eb',
          'line-width': 4,
          'line-opacity': 0.9,
        } as any}
        {...(layerProps as any)}
      />
    </Source>
  )
}

