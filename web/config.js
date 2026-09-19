window.LAB_API =
  "https://bkvwjkkonvkykaymjrwb.supabase.co/functions/v1/chartauth-api";
window.LAB_PUBLIC_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdndqa2tvbnZreWtheW1qcndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzY4MzMsImV4cCI6MjEwMzk1MjgzM30.ZXa8vMlh1K6JFU4C48rLPT4k9A72-HIX5pdjvqqSLOk";

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
