import { MouseEvent, PointerEvent, WheelEvent, useMemo, useRef, useState } from "react";
import { Country } from "../data/countries";
import { Language, localizedCountry } from "../i18n";
import { MAP_H, MAP_SHAPES, MAP_W } from "../mapData";

interface Props {
  targetCode: string;
  countries: Country[];
  selectedCode: string | null;
  revealed: boolean;
  onPick: (code: string) => void;
  language: Language;
}

interface View { x: number; y: number; w: number }

const FULL: View = { x: 0, y: 0, w: MAP_W };
const MAX_ZOOM = 80;

function clamp(view: View): View {
  const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, view.w));
  const h = (w * MAP_H) / MAP_W;
  return { w, x: Math.min(MAP_W - w, Math.max(0, view.x)), y: Math.min(MAP_H - h, Math.max(0, view.y)) };
}

export default function WorldMap({ targetCode, countries, selectedCode, revealed, onPick, language }: Props) {
  const [view, setView] = useState<View>(FULL);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; view: View; moved: boolean; pinch?: { dist: number; w: number } } | null>(null);
  const suppressClick = useRef(false);
  const names = useMemo(() => new Map(countries.map((country) => [country.code, localizedCountry(country.code, country.name, language)])), [countries, language]);
  const target = MAP_SHAPES.find((shape) => shape.code === targetCode);
  const viewH = (view.w * MAP_H) / MAP_W;

  function zoomAt(factor: number, cx = view.x + view.w / 2, cy = view.y + viewH / 2) {
    const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, view.w / factor));
    const scale = w / view.w;
    setView(clamp({ w, x: cx - (cx - view.x) * scale, y: cy - (cy - view.y) * scale }));
  }

  function toMap(clientX: number, clientY: number, v = view) {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: v.x + ((clientX - rect.left) / rect.width) * v.w, y: v.y + ((clientY - rect.top) / rect.height) * ((v.w * MAP_H) / MAP_W) };
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    const p = toMap(event.clientX, event.clientY);
    zoomAt(event.deltaY < 0 ? 1.6 : 1 / 1.6, p.x, p.y);
  }

  function onDoubleClick(event: MouseEvent<SVGSVGElement>) {
    const p = toMap(event.clientX, event.clientY);
    zoomAt(2.5, p.x, p.y);
  }

  function down(event: PointerEvent<SVGSVGElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { x: 0, y: 0, view, moved: true, pinch: { dist: Math.hypot(a.x - b.x, a.y - b.y), w: view.w } };
    } else if (pointers.current.size === 1) {
      gesture.current = { x: event.clientX, y: event.clientY, view, moved: false };
    }
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    const state = gesture.current;
    if (!state || !pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const rect = svgRef.current!.getBoundingClientRect();
    if (state.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const w = Math.min(MAP_W, Math.max(MAP_W / MAX_ZOOM, state.pinch.w * (state.pinch.dist / dist)));
      const mid = toMap((a.x + b.x) / 2, (a.y + b.y) / 2, state.view);
      const scale = w / state.view.w;
      setView(clamp({ w, x: mid.x - (mid.x - state.view.x) * scale, y: mid.y - (mid.y - state.view.y) * scale }));
      return;
    }
    if (state.pinch) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (!state.moved && Math.hypot(dx, dy) < 6) return;
    state.moved = true;
    setView(clamp({ w: state.view.w, x: state.view.x - (dx / rect.width) * state.view.w, y: state.view.y - (dy / rect.height) * ((state.view.w * MAP_H) / MAP_W) }));
  }

  function up(event: PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId);
    if (gesture.current?.moved) suppressClick.current = true;
    if (pointers.current.size === 0) {
      gesture.current = null;
      // The click event fires after pointerup; clear the flag once it has passed.
      setTimeout(() => (suppressClick.current = false), 0);
    }
  }

  function pick(code: string | undefined) {
    if (suppressClick.current) return;
    if (!revealed && code) onPick(code);
  }

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        className="world-map"
        viewBox={`${view.x} ${view.y} ${view.w} ${viewH}`}
        role="group"
        aria-label="Clickable world map"
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {MAP_SHAPES.map((item, index) => {
          const correct = revealed && item.code === targetCode;
          const wrong = revealed && item.code === selectedCode && selectedCode !== targetCode;
          return (
            <path
              key={`${item.code ?? "x"}-${index}`}
              d={item.d}
              className={`map-country ${correct ? "map-correct" : ""} ${wrong ? "map-wrong" : ""}`}
              aria-label={(item.code && names.get(item.code)) || item.label}
              role="button"
              tabIndex={revealed ? -1 : 0}
              onClick={() => pick(item.code ?? `unknown-${index}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  pick(item.code ?? `unknown-${index}`);
                }
              }}
            />
          );
        })}
        {revealed && target && <circle className="map-marker" cx={target.center[0]} cy={target.center[1]} r={7} vectorEffect="non-scaling-stroke" />}
      </svg>
      <div className="map-controls">
        <button type="button" className="ghost" aria-label="Zoom in" onClick={() => zoomAt(2)}>+</button>
        <button type="button" className="ghost" aria-label="Zoom out" onClick={() => zoomAt(0.5)}>−</button>
        <button type="button" className="ghost" aria-label="Reset view" onClick={() => setView(FULL)}>⟲</button>
      </div>
      <p className="map-hint">Scroll, pinch or double-tap to zoom. Drag to pan.</p>
    </div>
  );
}
