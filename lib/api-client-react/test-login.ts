const originalFetch = global.fetch;
global.fetch = function(url, init) {
  const fullUrl = url.toString().startsWith('/') ? 'http://localhost:8080' + url : url;
  return originalFetch(fullUrl, init);
};

import { login } from "./src/generated/api";

async function testLogin() {
  try {
    const res = await login({ username: "admin", password: "admin123" });
    console.log("Success:", res);
  } catch (err: any) {
    if (err.response) {
       console.log("Status:", err.response.status);
       const text = await err.response.text();
       console.log("Body:", text);
    } else {
       console.error("Failed:", err.message);
    }
  }
}
testLogin();
