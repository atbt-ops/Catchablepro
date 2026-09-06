/* Theme selection, kept out of the HTML so the CSP can refuse inline script.
 *
 * Loaded from <head> WITHOUT defer, on purpose: the saved theme has to be on
 * <html> before the first paint, or the page flashes dark and then corrects
 * itself. That is why the attribute is set immediately and only the button
 * wiring waits for the DOM.
 */
(function () {
  var KEY = 'sm-theme';
  var root = document.documentElement;

  function read() {
    // Private windows and blocked site data make localStorage throw rather
    // than return null. Uncaught, that would take the whole file down and the
    // toggle would stop working — so every access is guarded.
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function write(value) {
    try {
      localStorage.setItem(KEY, value);
    } catch (e) {
      /* The theme still applies for this page view; it just will not persist. */
    }
  }

  root.setAttribute('data-theme', read() || 'dark');

  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      write(next);
    });
  });
})();
