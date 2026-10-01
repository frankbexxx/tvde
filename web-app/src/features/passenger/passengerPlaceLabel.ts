const COORDINATES = /^-?\d+\.\d+, -?\d+\.\d+$/

/** When the shared formatter only has coordinates, do not show them as the place name. */
export function passengerPlaceLabel(formatted: string, whenCoordinates: string): string {
  return COORDINATES.test(formatted.trim()) ? whenCoordinates : formatted
}
