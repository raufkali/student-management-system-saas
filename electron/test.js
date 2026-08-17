const http = require("http");

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/",
  method: "HEAD",
  timeout: 5000,
};

const req = http.request(options, (res) => {
  console.log(
    `✅ Frontend server is running on port 3000 (Status: ${res.statusCode})`,
  );
  process.exit(0);
});

req.on("error", (error) => {
  console.error("❌ Frontend server is NOT running on port 3000");
  console.error("Error:", error.message);
  process.exit(1);
});

req.on("timeout", () => {
  console.error("❌ Connection to port 3000 timed out");
  process.exit(1);
});

req.end();
