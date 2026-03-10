import type { FC } from 'react'
import type { MarkerProps } from 'react-map-gl/maplibre'
import { Marker } from 'react-map-gl/maplibre'

type PassengerMarkerProps = Omit<MarkerProps, 'children'> & {
  colorClassName?: string
}

export const PassengerMarker: FC<PassengerMarkerProps> = ({
  colorClassName = 'bg-primary ring-primary/35',
  ...props
}) => {
  return (
    <Marker anchor="center" {...props}>
      <div className="relative">
        <span
          className={`absolute inset-0 rounded-full animate-ping opacity-60 ${colorClassName}`}
        />
        <span className={`relative block w-4 h-4 rounded-full ring-4 shadow-floating ${colorClassName}`} />
      </div>
    </Marker>
  )
}


