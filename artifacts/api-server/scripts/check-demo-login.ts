const res = await fetch("http://127.0.0.1:8080/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "demo-admin@fmcsoft.com", password: "DemoAdmin@123" }),
});

const text = await res.text();
console.log(JSON.stringify({ status: res.status, body: JSON.parse(text) }, null, 2));