/* Form conveniences that used to live in inline handlers.
 *
 * Filter controls submit their form on change. That was an onchange attribute
 * on each one, which is exactly what script-src 'unsafe-inline' had to permit.
 * One delegated listener replaces all of them, and picks up any control added
 * later that carries the attribute — <select>s as well as the radio/checkbox
 * inputs in the job-filter rail.
 *
 * Deferred: nothing here affects the first paint.
 */
document.addEventListener('change', function (event) {
  var control = event.target;
  if (!control.matches) return;
  if (!control.matches('select[data-auto-submit], input[data-auto-submit]')) return;
  if (control.form) control.form.submit();
});

/* Homepage filter bar: the filters are <details> dropdowns. Keep at most one
 * open, and close it when the click lands outside. (In the rail layout the
 * <details> are plain accordions and this never fires — they aren't .filters-top.)
 * `toggle` doesn't bubble, so listen in the capture phase.
 */
document.addEventListener('toggle', function (event) {
  var d = event.target;
  if (!d.open || !d.matches || !d.matches('.filters-top .fgroup')) return;
  d.parentElement.querySelectorAll('.fgroup[open]').forEach(function (other) {
    if (other !== d) other.open = false;
  });
}, true);

document.addEventListener('click', function (event) {
  var open = document.querySelectorAll('.filters-top .fgroup[open]');
  if (!open.length) return;
  var inside = event.target.closest && event.target.closest('.filters-top .fgroup');
  open.forEach(function (d) {
    if (d !== inside) d.open = false;
  });
});
