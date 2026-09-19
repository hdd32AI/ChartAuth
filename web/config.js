window.LAB_API =
  "https://bkvwjkkonvkykaymjrwb.supabase.co/functions/v1/chartauth-api";
window.LAB_PUBLIC_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrdndqa2tvbnZreWtheW1qcndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzY4MzMsImV4cCI6MjEwMzk1MjgzM30.ZXa8vMlh1K6JFU4C48rLPT4k9A72-HIX5pdjvqqSLOk";

// Shared presentation assets also apply to server-delivered workspace and specifications.
(() => {
  const base = new URL('.', document.currentScript?.src || document.baseURI);
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('mobile.css?v=20260919-2', base).href;
  style.addEventListener('load', () => {
    const script = document.createElement('script');
    script.src = new URL('mobile.js?v=20260919-2', base).href;
    script.defer = true;
    document.head.append(script);
  }, { once: true });
  document.head.append(style);
})();
