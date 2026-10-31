// Native dialogs make the page inert, but Tab at an edge can still move focus
// to browser chrome. Keep keyboard navigation in the active modal's controls.
export function initModalKeyboard() {
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== 'Tab') return;
    const dialog = document.querySelector('dialog:modal');
    if (!dialog) return;
    const controls = [
      ...dialog.querySelectorAll(
        'button, a[href], input, select, textarea, [tabindex]',
      ),
    ].filter(
      (el) => !el.disabled && el.tabIndex >= 0 && el.getClientRects().length,
    );
    const first = controls[0],
      last = controls.at(-1);
    if (!first) return;
    if (
      !dialog.contains(document.activeElement) ||
      (event.shiftKey
        ? document.activeElement === first
        : document.activeElement === last)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  });
}
