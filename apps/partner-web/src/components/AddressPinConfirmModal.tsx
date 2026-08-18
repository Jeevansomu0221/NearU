import { useEffect, useMemo, useRef, useState } from "react";
import "./AddressPinConfirmModal.css";

type Props = {
  visible: boolean;
  addressLines: string[];
  latitude: number;
  longitude: number;
  confirming?: boolean;
  onConfirm: (pin: { latitude: number; longitude: number }) => void;
  onEdit: () => void;
};

const TILE_SIZE = 256;
const MAP_ZOOM = 18;
const TILE_SPAN = 3;

const latLngToTile = (latitude: number, longitude: number, zoom: number) => {
  const n = 2 ** zoom;
  const x = ((longitude + 180) / 360) * n;
  const latRad = (latitude * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
};

const tileToLatLng = (x: number, y: number, zoom: number) => {
  const n = 2 ** zoom;
  const longitude = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { latitude: (latRad * 180) / Math.PI, longitude };
};

const tileUrl = (x: number, y: number, zoom: number) => {
  const n = 2 ** zoom;
  const tx = ((x % n) + n) % n;
  return `https://basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${y}@2x.png`;
};

function PannablePinMap({
  latitude,
  longitude,
  onPinChange
}: {
  latitude: number;
  longitude: number;
  onPinChange: (pin: { latitude: number; longitude: number }) => void;
}) {
  const [center, setCenter] = useState({ latitude, longitude });
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [viewportWidth, setViewportWidth] = useState(360);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setCenter({ latitude, longitude });
    setDrag({ x: 0, y: 0 });
  }, [latitude, longitude]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setViewportWidth(node.clientWidth || 360));
    observer.observe(node);
    setViewportWidth(node.clientWidth || 360);
    return () => observer.disconnect();
  }, []);

  const tiles = useMemo(() => {
    const point = latLngToTile(center.latitude, center.longitude, MAP_ZOOM);
    const originX = Math.floor(point.x) - 1;
    const originY = Math.floor(point.y) - 1;
    const items = [];
    for (let row = 0; row < TILE_SPAN; row += 1) {
      for (let col = 0; col < TILE_SPAN; col += 1) {
        const x = originX + col;
        const y = originY + row;
        items.push({
          key: `${MAP_ZOOM}-${x}-${y}`,
          uri: tileUrl(x, y, MAP_ZOOM),
          left: col * TILE_SIZE,
          top: row * TILE_SIZE
        });
      }
    }
    return {
      items,
      offsetX: (point.x - originX) * TILE_SIZE,
      offsetY: (point.y - originY) * TILE_SIZE
    };
  }, [center.latitude, center.longitude]);

  const endDrag = (clientX: number, clientY: number) => {
    if (!dragStart.current) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    dragStart.current = null;
    const point = latLngToTile(center.latitude, center.longitude, MAP_ZOOM);
    const next = tileToLatLng(point.x - dx / TILE_SIZE, point.y - dy / TILE_SIZE, MAP_ZOOM);
    setDrag({ x: 0, y: 0 });
    setCenter(next);
    onPinChange(next);
  };

  return (
    <div
      ref={viewportRef}
      className="pin-map"
      onPointerDown={(event) => {
        dragStart.current = { x: event.clientX, y: event.clientY };
        (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragStart.current) return;
        setDrag({ x: event.clientX - dragStart.current.x, y: event.clientY - dragStart.current.y });
      }}
      onPointerUp={(event) => endDrag(event.clientX, event.clientY)}
      onPointerCancel={(event) => endDrag(event.clientX, event.clientY)}
    >
      <div
        className="pin-map__tiles"
        style={{
          width: TILE_SIZE * TILE_SPAN,
          height: TILE_SIZE * TILE_SPAN,
          transform: `translate(${viewportWidth / 2 - tiles.offsetX + drag.x}px, ${140 - tiles.offsetY + drag.y}px)`
        }}
      >
        {tiles.items.map((tile) => (
          <img key={tile.key} src={tile.uri} alt="" style={{ left: tile.left, top: tile.top }} />
        ))}
      </div>
      <div className="pin-map__pin" />
      <div className="pin-map__hint">Drag the map to place the pin</div>
    </div>
  );
}

export default function AddressPinConfirmModal({
  visible,
  addressLines,
  latitude,
  longitude,
  confirming,
  onConfirm,
  onEdit
}: Props) {
  const [pin, setPin] = useState({ latitude, longitude });

  useEffect(() => {
    setPin({ latitude, longitude });
  }, [latitude, longitude]);

  if (!visible) return null;

  return (
    <div className="pin-modal" role="dialog" aria-modal="true">
      <div className="pin-modal__card">
        <h2>Confirm shop pin</h2>
        <p>Place the pin on your shop. Drag the map until it sits on the entrance or building.</p>
        <div className="pin-modal__map">
          {Number.isFinite(latitude) && Number.isFinite(longitude) ? (
            <PannablePinMap latitude={latitude} longitude={longitude} onPinChange={setPin} />
          ) : (
            <div className="pin-modal__fallback">Locating address…</div>
          )}
        </div>
        <div className="pin-modal__address">
          <span>Shop address</span>
          {addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <button className="btn" type="button" disabled={confirming} onClick={() => onConfirm(pin)}>
          {confirming ? "Saving…" : "Yes, this is my shop"}
        </button>
        <button className="btn secondary" type="button" disabled={confirming} onClick={onEdit}>
          Edit address
        </button>
      </div>
    </div>
  );
}
