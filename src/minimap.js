import { PAINTS } from './config.js';
import { coast } from './coast.js';
import { visibleGhostPose } from './ghost.js';
import { paintAmazonRiver } from './jungle.js';
import { path, ribbon } from './renderer.js';
import { car, opponentRace, pitLane, state, track } from './state.js';

export function buildMinimapLayer() {
  const layer = document.createElement('canvas');
  layer.width = 320;
  layer.height = 266;
  const c = layer.getContext('2d'),
    b = pitLane.bounds,
    scale = Math.min(280 / (b.right - b.left), 225 / (b.bottom - b.top));
  c.save();
  c.translate(160, 132);
  c.scale(scale, scale);
  c.translate(-(b.left + b.right) / 2, -(b.top + b.bottom) / 2);
  if (state.activeMap.id === 'coast') {
    c.save();
    c.globalAlpha = 0.3;
    path(c, coast.shore);
    c.fillStyle = '#c8c99c';
    c.fill();
    c.restore();
  }
  if (state.activeMap.id === 'amazonas') paintAmazonRiver(c, false);
  path(c, pitLane.points, 0, false);
  c.strokeStyle = '#c2b98c';
  c.lineWidth = 2 / scale;
  c.stroke();
  ribbon(c, '#536258', 9 / scale);
  ribbon(c, '#abbca2', 3 / scale);
  if (state.activeMap.id === 'amazonas') {
    c.save();
    c.globalAlpha = 0.75;
    paintAmazonRiver(c, false);
    c.restore();
  }
  const p = track[0];
  c.save();
  c.translate(p.x, p.y);
  c.rotate(Math.atan2(p.ty, p.tx));
  c.fillStyle = state.activeMap.accent;
  c.fillRect(-1 / scale, -5 / scale, 2 / scale, 10 / scale);
  c.restore();
  c.restore();
  state.minimapLayer = layer;
  state.minimapLayout = {
    scale,
    x: (b.left + b.right) / 2,
    y: (b.top + b.bottom) / 2,
  };
}

export function drawMinimap() {
  if (!state.mapCtx) return;
  if (!state.minimapLayer) buildMinimapLayer();
  const c = state.mapCtx,
    { scale, x, y } = state.minimapLayout;
  c.clearRect(0, 0, 320, 266);
  c.drawImage(state.minimapLayer, 0, 0);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.translate(160, 132);
  c.scale(scale, scale);
  c.translate(-x, -y);
  for (const rival of opponentRace.cars) {
    c.fillStyle = PAINTS[rival.paint].hex;
    c.beginPath();
    c.arc(rival.x, rival.y, 3.5 / scale, 0, Math.PI * 2);
    c.fill();
  }
  const ghost = visibleGhostPose();
  if (ghost) {
    c.save();
    c.translate(ghost.x, ghost.y);
    c.fillStyle = '#91e1ff';
    c.strokeStyle = '#e4faff';
    c.lineWidth = 1 / scale;
    c.beginPath();
    c.arc(0, 0, 4 / scale, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  }
  c.save();
  c.translate(car.x, car.y);
  c.rotate(car.angle);
  c.scale(1 / scale, 1 / scale);
  c.fillStyle = state.activeMap.accent;
  c.beginPath();
  c.moveTo(5, 0);
  c.lineTo(-3.5, -3.5);
  c.lineTo(-2, 0);
  c.lineTo(-3.5, 3.5);
  c.closePath();
  c.fill();
  c.restore();
  c.restore();
}
