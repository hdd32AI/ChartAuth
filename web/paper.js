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
