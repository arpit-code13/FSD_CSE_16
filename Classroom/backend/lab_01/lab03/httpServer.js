import http from "http";

const userdata = [
  {
    name: "arpit",
    age: 20,
  },
];

const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const url = req.url;
  const method = req.method;
  if (url === "/" && method === "GET") {
    res.statusCode = 200;
    res.end("Welcome to the Home Page");
  } else if (url === "/sys" && method === "GET") {
    res.statusCode = 201;
    res.end("Welcome to the System Page");
  } else if (url === "/data" && method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify(userdata));
  } else if (url.startsWith("/users/") && method == "GET") {
    const id = url.split("/")[2];
    console.log(id);
    const user = userdata.find((u) => u.name == id);
    if (!user) {
      return res.end("user not found");
    }
    res.end(JSON.stringify(user));
  } else {
    res.statusCode = 404;
    res.end("Page not found");
  }
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
