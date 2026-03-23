import type { FC } from 'react'
import { Source, Layer } from 'react-map-gl/maplibre'
import type { FeatureCollection, LineString } from 'geojson'

type LinePaint = Record<string, unknown>

export interface RouteLineProps {
  id?: string
  geometry: FeatureCollection<LineString>
  sourceProps?: Record<string, unknown>
  layerProps?: Record<string, unknown>
}

const defaultLinePaint: LinePaint = {
  'line-color': 'hsl(280, 100%, 60%)',
  'line-width': 4,
  'line-opacity': 0.85,
}

export const RouteLine: FC<RouteLineProps> = ({
  id = 'route-line',
  geometry,
  sourceProps,
  layerProps,
}) => {
  const { paint: userPaint, ...restLayerProps } = layerProps ?? {}
  const mergedPaint: LinePaint = {
    ...defaultLinePaint,
    ...(typeof userPaint === 'object' && userPaint !== null && !Array.isArray(userPaint)
      ? (userPaint as LinePaint)
      : {}),
  }

  return (
    <Source id={id} type="geojson" data={geometry} {...(sourceProps ?? {})}>
      <Layer
        id={`${id}-layer`}
        type="line"
        paint={mergedPaint}
        {...restLayerProps}
      />
    </Source>
  )
}
