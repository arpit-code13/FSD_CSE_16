import http from "http";
const userdata =[{id:"theright" , name: "helllo", }]
const server = http.createServer((req, res) => {
  //   res.statusCode = 201;
  //   res.setHeader("Content-type", "text/plain");
  //   res.end("hello server");

  /////////////////////////
  const url = req.url;
  const method = req.method;
  if (url == "/msg" && method == "GET") {
    res.end("this is welcome message from server");
    
  }
  else if(url=="/sys" && method =='GET'){
    res.end("This is system information ");
  }

  else if(url =="/data" && method =="GET"){
    res.end(JSON.stru)
  }
});
server.listen(3000, () => {
  console.log("server is running on port number 3000");
});

