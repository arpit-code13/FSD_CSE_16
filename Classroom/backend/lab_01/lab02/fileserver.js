import fs from "fs";

const filePath = "example.txt";

function createFile(content) {
  fs.writeFileSync(filePath, content);
  console.log("File created");
}

function readFile() {
  const content = fs.readFileSync(filePath, "utf-8");
  console.log(content);
}

function updateFile(content) {
  fs.writeFileSync(filePath, content);
  console.log("File updated");
}

function deleteFile() {
  fs.unlinkSync(filePath);
  console.log("File deleted");
}

createFile("Hello World");

readFile();

updateFile("Hello JavaScript");

readFile()

deleteFile()



// assiment  1 

