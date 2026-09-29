const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();

const PORT = 3000;
const databaseFile = "./Database.json";

app.use(cors());
app.use(express.json());

const readDatabase = () => {
  const data = fs.readFileSync(databaseFile, "utf-8");

  if (!data) {
    return [];
  }

  return JSON.parse(data);
}; 

const writeDatabase = (data) => {
  fs.writeFileSync(databaseFile, JSON.stringify(data, null, 2));
};

app.post("/create", (req, res) => {
  const { id, name, email, password } = req.body;

  if (!id || !name || !email || !password) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  const users = readDatabase();

  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    return res.status(409).json({
      message: "User already exists",
    });
  }

  const newUser = {
    id,
    name,
    email,
    password,
  };

  users.push(newUser);

  writeDatabase(users);

  res.status(201).json({
    message: "User created successfully",
    user: newUser,
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const users = readDatabase();

  const user = users.find(
    (user) => user.email === email && user.password === password,
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  res.json({
    message: "Login successful",
    user,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
