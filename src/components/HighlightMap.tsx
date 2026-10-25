import { MAP_H, MAP_SHAPES, MAP_W } from "../mapData";

interface Props {
  code: string;
}

export default function HighlightMap({ code }: Props) {
  const target = MAP_SHAPES.find((shape) => shape.code === code);
  let view = { x: 0, y: 0, w: MAP_W, h: MAP_H };
  let small = false;
  if (target) {
    const [x0, y0, x1, y1] = target.bounds;
    const bw = x1 - x0;
    const bh = y1 - y0;
    const w = Math.min(MAP_W, Math.max(bw * 1.8, bh * 1.8 * (MAP_W / MAP_H), 110));
    const h = (w * MAP_H) / MAP_W;
    view = {
      w,
      h,
      x: Math.min(MAP_W - w, Math.max(0, target.center[0] - w / 2)),
      y: Math.min(MAP_H - h, Math.max(0, target.center[1] - h / 2)),
    };
    small = bw < 14 && bh < 14;
  }

  return (
    <svg className="world-map highlight-map" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="img" aria-label="Highlighted country">
      {MAP_SHAPES.map((item, index) => (
        <path key={`${item.code ?? "x"}-${index}`} d={item.d} className={`map-country static ${item.code === code ? "map-target" : ""}`} />
      ))}
      {small && target && <circle className="map-marker pulse" cx={target.center[0]} cy={target.center[1]} r={9} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
