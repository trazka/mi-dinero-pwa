(function () {
  var key = "mi-dinero-theme";
  var preference = "auto";
  try {
    var saved = localStorage.getItem(key);
    if (["auto", "light", "dark"].indexOf(saved) !== -1) preference = saved;
  } catch (_) {}
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() {
    var dark =
      preference === "dark" || (preference === "auto" && media.matches);
    var root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.style.colorScheme = dark ? "dark" : "light";
    root.style.setProperty("--page-bg", dark ? "#0e1814" : "#f5f7f4");
    root.style.setProperty("--page-text", dark ? "#e3ede7" : "#243d32");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? "#0e1814" : "#124c38";
  }
  window.miDineroTheme = {
    get: function () {
      return preference;
    },
    set: function (next) {
      if (["auto", "light", "dark"].indexOf(next) === -1) return;
      preference = next;
      try {
        localStorage.setItem(key, next);
      } catch (_) {}
      apply();
      window.dispatchEvent(new Event("theme-change"));
    },
  };
  if (media.addEventListener) media.addEventListener("change", apply);
  else media.addListener(apply);
  window.addEventListener("storage", function (event) {
    if (event.key === key || event.key === null) {
      preference =
        ["light", "dark"].indexOf(event.newValue) !== -1
          ? event.newValue
          : "auto";
      apply();
      window.dispatchEvent(new Event("theme-change"));
    }
  });
  apply();
})();
