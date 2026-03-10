import type { FC } from 'react'
import type { MarkerProps } from 'react-map-gl/maplibre'
import { Marker } from 'react-map-gl/maplibre'

type DriverMarkerProps = Omit<MarkerProps, 'children'> & {
  colorClassName?: string
}

export const DriverMarker: FC<DriverMarkerProps> = ({
  colorClassName = 'bg-accent ring-accent/30',
  ...props
}) => {
  return (
    <Marker anchor="center" {...props}>
      <div className={`w-4 h-4 rounded-full ring-4 shadow-floating ${colorClassName}`} />
    </Marker>
  )
}

