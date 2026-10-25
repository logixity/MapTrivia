import { geoNaturalEarth1, geoPath } from "d3-geo";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { numericToAlpha2 } from "i18n-iso-countries";
import { feature } from "topojson-client";
import world from "world-atlas/countries-50m.json";

export const MAP_W = 900;
export const MAP_H = 460;

export interface MapShape {
  code: string | undefined;
  label: string;
  d: string;
  center: [number, number];
}

function build(): MapShape[] {
  const topology = world as unknown as { objects: { countries: never } };
  const geo = feature(topology as never, topology.objects.countries as never) as unknown as FeatureCollection<Geometry, { name?: string }>;
  const projection = geoNaturalEarth1().fitSize([MAP_W, MAP_H], geo);
  const path = geoPath(projection);
  return geo.features.map((item: Feature<Geometry, { name?: string }>) => {
    const code = item.id === undefined ? undefined : numericToAlpha2(String(item.id).padStart(3, "0"))?.toLowerCase();
    const [[x0, y0], [x1, y1]] = path.bounds(item);
    return { code, label: item.properties?.name ?? "", d: path(item) ?? "", center: [(x0 + x1) / 2, (y0 + y1) / 2] as [number, number] };
  }).filter((item) => item.d);
}

export const MAP_SHAPES = build();
// Kosovo etc. have no ISO code, so a few shapes can't be asked about.
export const MAPPED_CODES = new Set(MAP_SHAPES.map((shape) => shape.code).filter((code): code is string => !!code));
