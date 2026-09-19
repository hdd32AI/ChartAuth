const chapters = [...document.querySelectorAll(".note-chapter")],
  links = [...document.querySelectorAll(".reading-toc a")];
document.getElementById("note-search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  let n = 0;
  chapters.forEach((c, i) => {
    const match = c.textContent.toLowerCase().includes(q);
    c.hidden = !match;
    links[i].hidden = !match;
    if (match) n++;
  });
  document.getElementById("search-count").textContent = q
    ? n + " matching chapters"
    : "";
});
addEventListener(
  "scroll",
  () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    document.getElementById("reading-progress").style.width =
      (max > 0 ? (scrollY / max) * 100 : 0) + "%";
  },
  { passive: true },
);
const io = new IntersectionObserver(
  (es) => {
    es.forEach((e) => {
      if (e.isIntersecting)
        links.forEach((a) =>
          a.classList.toggle("active", a.hash === "#" + e.target.id),
        );
    });
  },
  { rootMargin: "-15% 0px -70% 0px" },
);
chapters.forEach((c) => io.observe(c));

(() => {
  const base = new URL("./", document.currentScript?.src || document.baseURI);
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && !viewport.content.includes("viewport-fit")) viewport.content += ", viewport-fit=cover";
  if (!document.getElementById("ca-mobile-style")) {
    const css = document.createElement("link");
    css.id = "ca-mobile-style";
    css.rel = "stylesheet";
    css.href = new URL("mobile.css?v=20260919m1", base).href;
    document.head.append(css);
  }
  if (!document.getElementById("ca-mobile-script")) {
    const js = document.createElement("script");
    js.id = "ca-mobile-script";
    js.src = new URL("mobile.js?v=20260919m1", base).href;
    js.defer = true;
    document.head.append(js);
  }
})();
