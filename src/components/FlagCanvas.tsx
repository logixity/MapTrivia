import { PointerEvent, useEffect, useRef, useState } from "react";
import { WHITE, classify, scoreFlag } from "../flagScore";

const flagImages = import.meta.glob("../../node_modules/flag-icons/flags/4x3/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;
const colors = ["#202438", "#d92f35", "#2457b5", "#f4ca37", "#238650", "#ff8c1a", "#8e44ad", "#ffffff"];

type Tool = "brush" | "eraser" | "fill" | "line" | "rect" | "ellipse" | "triangle" | "star";
const TOOLS: { id: Tool; icon: string; label: string }[] = [
  { id: "brush", icon: "✏️", label: "Brush" },
  { id: "eraser", icon: "🧽", label: "Eraser" },
  { id: "fill", icon: "🪣", label: "Fill" },
  { id: "line", icon: "╱", label: "Line" },
  { id: "rect", icon: "▭", label: "Rectangle" },
  { id: "ellipse", icon: "◯", label: "Ellipse" },
  { id: "triangle", icon: "△", label: "Triangle" },
  { id: "star", icon: "★", label: "Star" },
];
const SHAPES: Tool[] = ["line", "rect", "ellipse", "triangle", "star"];
const MAX_UNDO = 30;

interface Props {
  code: string;
  onSubmit: (accuracy: number) => void;
  timeUp?: boolean;
  revealLabel?: string;
  clearLabel: string;
  submitLabel: string;
}

interface Point { x: number; y: number }

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function floodFill(context: CanvasRenderingContext2D, width: number, height: number, sx: number, sy: number, hex: string) {
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return;
  const start = (y0 * width + x0) * 4;
  const target = [data[start], data[start + 1], data[start + 2]];
  const [fr, fg, fb] = hexToRgb(hex);
  // Tolerance absorbs anti-aliased stroke edges.
  const tolerance = 60;
  const matches = (i: number) =>
    Math.abs(data[i] - target[0]) + Math.abs(data[i + 1] - target[1]) + Math.abs(data[i + 2] - target[2]) <= tolerance;
  if (Math.abs(fr - target[0]) + Math.abs(fg - target[1]) + Math.abs(fb - target[2]) <= 3) return;
  const visited = new Uint8Array(width * height);
  const stack = [x0, y0];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    while (x >= 0 && !visited[y * width + x] && matches((y * width + x) * 4)) x--;
    x++;
    let up = false;
    let down = false;
    while (x < width && !visited[y * width + x] && matches((y * width + x) * 4)) {
      const p = y * width + x;
      visited[p] = 1;
      data[p * 4] = fr;
      data[p * 4 + 1] = fg;
      data[p * 4 + 2] = fb;
      data[p * 4 + 3] = 255;
      if (y > 0) {
        const ok = !visited[p - width] && matches((p - width) * 4);
        if (ok && !up) stack.push(x, y - 1);
        up = ok;
      }
      if (y < height - 1) {
        const ok = !visited[p + width] && matches((p + width) * 4);
        if (ok && !down) stack.push(x, y + 1);
        down = ok;
      }
      x++;
    }
  }
  context.putImageData(image, 0, 0);
}

function drawShape(context: CanvasRenderingContext2D, tool: Tool, a: Point, b: Point, filled: boolean) {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x);
  const h = Math.abs(b.y - a.y);
  context.beginPath();
  if (tool === "line") {
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
  } else if (tool === "rect") {
    context.rect(left, top, w, h);
  } else if (tool === "ellipse") {
    context.ellipse(left + w / 2, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (tool === "triangle") {
    context.moveTo(left + w / 2, top);
    context.lineTo(left + w, top + h);
    context.lineTo(left, top + h);
    context.closePath();
  } else if (tool === "star") {
    const cx = left + w / 2;
    const cy = top + h / 2;
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? 1 : 0.382;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = cx + Math.cos(angle) * radius * (w / 2);
      const py = cy + Math.sin(angle) * radius * (h / 2);
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
  }
  if (filled && tool !== "line") context.fill();
  else context.stroke();
}

export default function FlagCanvas({ code, onSubmit, timeUp, clearLabel, submitLabel, revealLabel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const submitted = useRef(false);
  const [showReal, setShowReal] = useState(false);
  const flagAsset = Object.entries(flagImages).find(([path]) => path.endsWith(`/${code}.svg`))?.[1];
  const drawing = useRef(false);
  const startPoint = useRef<Point>({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);
  const history = useRef<ImageData[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [color, setColor] = useState(colors[0]);
  const [tool, setTool] = useState<Tool>("brush");
  const [size, setSize] = useState(10);
  const [filled, setFilled] = useState(true);

  function whiten() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  useEffect(whiten, []);

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  }

  function pushHistory(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    history.current.push(context.getImageData(0, 0, canvas.width, canvas.height));
    if (history.current.length > MAX_UNDO) history.current.shift();
    setCanUndo(true);
  }

  function applyStyle(context: CanvasRenderingContext2D) {
    const paint = tool === "eraser" ? "#ffffff" : color;
    context.strokeStyle = paint;
    context.fillStyle = paint;
    context.lineWidth = size;
    context.lineCap = tool === "rect" || tool === "triangle" || tool === "star" ? "butt" : "round";
    context.lineJoin = tool === "star" || tool === "triangle" || tool === "rect" ? "miter" : "round";
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (submitted.current) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const p = point(event);
    pushHistory(canvas, context);
    setHasDrawn(true);
    if (tool === "fill") {
      floodFill(context, canvas.width, canvas.height, p.x, p.y, color);
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    startPoint.current = p;
    applyStyle(context);
    if (SHAPES.includes(tool)) {
      snapshot.current = context.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      // A dot so a plain click leaves a mark.
      context.beginPath();
      context.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(p.x, p.y);
    }
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    const p = point(event);
    if (SHAPES.includes(tool)) {
      if (snapshot.current) context.putImageData(snapshot.current, 0, 0);
      applyStyle(context);
      drawShape(context, tool, startPoint.current, p, filled);
    } else {
      applyStyle(context);
      context.lineTo(p.x, p.y);
      context.stroke();
    }
  }

  function stop() {
    drawing.current = false;
    snapshot.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    if (canvas && context) pushHistory(canvas, context);
    whiten();
    setHasDrawn(false);
  }

  function undo() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    const previous = history.current.pop();
    if (!canvas || !context || !previous) return;
    context.putImageData(previous, 0, 0);
    setCanUndo(history.current.length > 0);
    if (history.current.length === 0) setHasDrawn(false);
  }

  function submit() {
    if (submitted.current) return;
    submitted.current = true;
    drawing.current = false;
    setShowReal(true);
    const canvas = canvasRef.current;
    const asset = flagAsset;
    if (!canvas || !asset) {
      onSubmit(0);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const w = 96;
      const h = 64;
      const make = () => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        // Transparent pixels read as black, so paint white underneath.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        return ctx;
      };
      const refContext = make();
      refContext.drawImage(image, 0, 0, w, h);
      const drawContext = make();
      drawContext.drawImage(canvas, 0, 0, w, h);
      const expected = classify(refContext.getImageData(0, 0, w, h).data);
      const actual = classify(drawContext.getImageData(0, 0, w, h).data);
      const blank = new Uint8Array(w * h);
      blank.fill(WHITE);
      const raw = scoreFlag(expected, actual, w, h);
      const floor = scoreFlag(expected, blank, w, h);
      // Score the gain over a blank canvas, so mostly-white flags can't be gamed by drawing nothing.
      const accuracy = floor >= 0.999 ? raw : (raw - floor) / (1 - floor);
      onSubmit(Math.max(0, Math.min(100, Math.round(accuracy * 100))));
    };
    image.onerror = () => onSubmit(0);
    image.width = 480;
    image.height = 320;
    image.src = asset;
  }

  useEffect(() => {
    if (timeUp) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  return (
    <div className="draw-wrap">
      <div className="canvas-wrap">
      <canvas
        ref={canvasRef}
        className="flag-canvas"
        width={480}
        height={320}
        aria-label="Draw the flag"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      {showReal && flagAsset && (
        <>
          <img className="flag-reveal" src={flagAsset} alt="" />
          {revealLabel && <span className="flag-reveal-label">{revealLabel}</span>}
        </>
      )}
      </div>
      <div className="draw-toolbar" aria-label="Tools">
        {TOOLS.map((item) => (
          <button key={item.id} type="button" className={`tool-btn ${tool === item.id ? "chosen" : ""}`} title={item.label} aria-label={item.label} onClick={() => setTool(item.id)}>{item.icon}</button>
        ))}
        <button type="button" className="tool-btn" title="Undo" aria-label="Undo" disabled={!canUndo} onClick={undo}>↶</button>
      </div>
      <div className="draw-toolbar" aria-label="Brush colors">
        {colors.map((swatch) => <button key={swatch} type="button" className={`color-swatch ${color === swatch ? "chosen" : ""}`} style={{ backgroundColor: swatch }} aria-label={`Brush color ${swatch}`} onClick={() => setColor(swatch)} />)}
        <input type="color" className="color-picker" value={color} aria-label="Custom color" onChange={(event) => setColor(event.target.value)} />
      </div>
      <div className="draw-toolbar size-row">
        <label>Size <input type="range" min={2} max={60} value={size} onChange={(event) => setSize(Number(event.target.value))} /> {size}</label>
        {["rect", "ellipse", "triangle", "star"].includes(tool) && (
          <label><input type="checkbox" checked={filled} onChange={(event) => setFilled(event.target.checked)} /> Filled</label>
        )}
      </div>
      <div className="draw-actions">
        <button className="ghost" type="button" disabled={showReal} onClick={clear}>{clearLabel}</button>
        <button className="play draw-submit" type="button" disabled={!hasDrawn || showReal} onClick={submit}>{submitLabel}</button>
      </div>
    </div>
  );
}
