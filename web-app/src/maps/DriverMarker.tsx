import type { FC } from 'react'
import type { MarkerProps } from 'react-map-gl/maplibre'
import { Marker } from 'react-map-gl/maplibre'

type DriverMarkerProps = Omit<MarkerProps, 'children'> & {
  colorClassName?: string
}

export const DriverMarker: FC<DriverMarkerProps> = ({
  colorClassName = 'bg-accent ring-accent/40',
  longitude,
  latitude,
  ...props
}) => {
  return (
    <Marker anchor="center" longitude={longitude} latitude={latitude} {...props}>
      <div
        className={`w-5 h-5 rounded-full ring-4 shadow-floating transition-transform duration-300 ease-out ${colorClassName}`}
      />
    </Marker>
  )
}


