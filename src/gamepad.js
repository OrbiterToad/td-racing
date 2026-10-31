export const GAMEPAD_DEADZONE = 0.16;

export function applyDeadzone(value, deadzone = GAMEPAD_DEADZONE) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) return 0;
  return (
    Math.sign(value) * Math.min(1, (magnitude - deadzone) / (1 - deadzone))
  );
}

const buttonPressed = (pad, index) => Boolean(pad.buttons[index]?.pressed);
const buttonValue = (pad, index) => pad.buttons[index]?.value || 0;

export function mapGamepad(pad) {
  const x = applyDeadzone(pad.axes[0] || 0);
  const y = applyDeadzone(pad.axes[1] || 0);
  return {
    steer: x,
    throttle: Math.max(buttonValue(pad, 7), y < 0 ? -y : 0),
    brake: Math.max(buttonValue(pad, 6), y > 0 ? y : 0),
    handbrake: buttonPressed(pad, 4) || buttonPressed(pad, 5) ? 1 : 0,
  };
}

export class GamepadInput {
  constructor() {
    this.previous = new Map();
    this.padIndex = null;
    this.nextScan = 0;
    this.connected = false;
    this.controls = { steer: 0, throttle: 0, brake: 0, handbrake: 0 };
  }

  update(gamepads, now = 0) {
    if (this.padIndex === null || !gamepads?.[this.padIndex]?.connected) {
      if (now < this.nextScan)
        return { connected: false, actions: [], controls: this.neutral() };
      this.nextScan = now + 250;
      const pad = Array.from(gamepads || []).find((item) => item?.connected);
      this.padIndex = pad?.index ?? null;
      if (pad) this.previous.clear();
    }
    const pad = this.padIndex === null ? null : gamepads?.[this.padIndex];
    if (!pad?.connected) {
      this.padIndex = null;
      this.previous.clear();
      this.connected = false;
      return { connected: false, actions: [], controls: this.neutral() };
    }
    this.connected = true;
    const actions = [];
    const edge = (button, action) => {
      const pressed = buttonPressed(pad, button);
      if (pressed && !this.previous.get(button)) actions.push(action);
      this.previous.set(button, pressed);
    };
    edge(0, 'confirm');
    edge(1, 'back');
    edge(9, 'pause');
    edge(3, 'restart');
    edge(2, 'rewind');
    const dpadLeft = buttonPressed(pad, 14),
      dpadRight = buttonPressed(pad, 15);
    const left = Math.abs(pad.axes[0] || 0) > 0.55 && (pad.axes[0] || 0) < 0;
    const right = Math.abs(pad.axes[0] || 0) > 0.55 && (pad.axes[0] || 0) > 0;
    edge(14, 'previous');
    edge(15, 'next');
    const oldLeft = this.previous.get('axis-left'),
      oldRight = this.previous.get('axis-right');
    if (left && !oldLeft && !dpadLeft) actions.push('previous');
    if (right && !oldRight && !dpadRight) actions.push('next');
    this.previous.set('axis-left', left);
    this.previous.set('axis-right', right);
    this.controls = mapGamepad(pad);
    return { connected: true, actions, controls: this.controls };
  }

  disconnect(now = 0) {
    this.padIndex = null;
    this.previous.clear();
    this.connected = false;
    this.nextScan = now + 250;
    return this.neutral();
  }

  neutral() {
    this.controls = { steer: 0, throttle: 0, brake: 0, handbrake: 0 };
    return this.controls;
  }
}
