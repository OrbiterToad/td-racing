import { clamp } from './math.js';
import { nearestDriving } from './tracks.js';

export function routeKeepingSteering(
  vehicle,
  frame = nearestDriving(vehicle.x, vehicle.y),
) {
  if (!frame) return 0;
  const offset =
    (vehicle.x - frame.x) * frame.nx + (vehicle.y - frame.y) * frame.ny;
  const heading = Math.atan2(
    Math.sin(vehicle.angle - Math.atan2(frame.ty, frame.tx)),
    Math.cos(vehicle.angle - Math.atan2(frame.ty, frame.tx)),
  );
  return clamp(
    (-offset / Math.max(frame.road, 1)) * 1.35 + heading * 0.75,
    -1,
    1,
  );
}

// Shared driving assists (steering assist, auto-accelerate) for any player car.
export function applyDrivingAssists(controls, vehicle, settings) {
  const steer = clamp(controls.steer || 0, -1, 1);
  return {
    ...controls,
    throttle: settings.autoAccelerate ? 1 : controls.throttle || 0,
    steer: settings.steeringAssist
      ? clamp(steer + routeKeepingSteering(vehicle) * 0.65, -1, 1)
      : steer,
  };
}
