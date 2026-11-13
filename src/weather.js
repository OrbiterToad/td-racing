// Fixed race conditions: all drivers use the same traction multiplier.
export const CONDITIONS = Object.freeze({
  clear: Object.freeze({ name: 'Clear', grip: 1, surface: 'DRY' }),
  rain: Object.freeze({ name: 'Rain', grip: 0.72, surface: 'WET' }),
  snow: Object.freeze({ name: 'Snow', grip: 0.46, surface: 'SNOW COVER' }),
});

export function conditionFor(id) {
  return Object.hasOwn(CONDITIONS, id) ? CONDITIONS[id] : CONDITIONS.clear;
}

// Sparse, deterministic precipitation drawn in world space beneath vehicles.
// Reduced motion keeps the surface presentation but freezes the precipitation.
export function drawWeather(c, condition, bounds, time, reducedMotion) {
  if (condition === 'clear') return;
  const snow = condition === 'snow';
  c.save();
  c.fillStyle = snow ? '#e9f2ff24' : '#254b7c18';
  c.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  c.strokeStyle = snow ? '#f2f7ffb0' : '#b4d7ff90';
  c.lineWidth = snow ? 3 : 1.5;
  const phase = reducedMotion ? 0 : time * (snow ? 22 : 150);
  for (
    let y = Math.floor(bounds.y / 100) * 100 - 100;
    y < bounds.y + bounds.height;
    y += 100
  ) {
    for (
      let x = Math.floor(bounds.x / 130) * 130 - 130;
      x < bounds.x + bounds.width;
      x += 130
    ) {
      const offset = (((phase + x * 0.37) % 100) + 100) % 100;
      c.beginPath();
      c.moveTo(x + offset * 0.25, y + offset);
      c.lineTo(
        x + offset * 0.25 + (snow ? 1 : 7),
        y + offset + (snow ? 2 : 19),
      );
      c.stroke();
    }
  }
  c.restore();
}
