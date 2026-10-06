const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "https://fsd-cse-16.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

let students = [];

// Validate student data
const validateStudent = (student) => {
  const { id, name, email, branch, semester, mobile } = student;

  if (!id || !Number.isInteger(Number(id))) {
    return "Student ID must be a number";
  }

  if (!name || name.trim() === "") {
    return "Name is required";
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Valid email is required";
  }

  if (!["CSE", "CS", "IT", "ECE"].includes(branch)) {
    return "Invalid branch";
  }

  if (
    !Number.isInteger(Number(semester)) ||
    Number(semester) < 1 ||
    Number(semester) > 8
  ) {
    return "Semester must be between 1 and 8";
  }

  if (!/^\d{10}$/.test(String(mobile))) {
    return "Mobile number must contain exactly 10 digits";
  }

  return null;
};

// GET all students
app.get("/api/students", (req, res) => {
  res.json(students);
});

// GET student by ID
app.get("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);

  const student = students.find((student) => student.id === id);

  if (!student) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  res.json(student);
});

// POST add student
app.post("/api/students", (req, res) => {
  const error = validateStudent(req.body);

  if (error) {
    return res.status(400).json({
      message: error,
    });
  }

  const id = Number(req.body.id);

  const existingStudent = students.find((student) => student.id === id);

  if (existingStudent) {
    return res.status(409).json({
      message: "Student ID already exists",
    });
  }

  const newStudent = {
    id: id,
    name: req.body.name.trim(),
    email: req.body.email.trim(),
    branch: req.body.branch,
    semester: Number(req.body.semester),
    mobile: String(req.body.mobile),
  };

  students.push(newStudent);

  res.status(201).json({
    message: "Student added successfully",
    student: newStudent,
  });
});

// PUT update student
app.put("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = students.findIndex((student) => student.id === id);

  if (index === -1) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  const error = validateStudent(req.body);

  if (error) {
    return res.status(400).json({
      message: error,
    });
  }

  const updatedStudent = {
    id: id,
    name: req.body.name.trim(),
    email: req.body.email.trim(),
    branch: req.body.branch,
    semester: Number(req.body.semester),
    mobile: String(req.body.mobile),
  };

  students[index] = updatedStudent;

  res.json({
    message: "Student updated successfully",
    student: updatedStudent,
  });
});

// DELETE student
app.delete("/api/students/:id", (req, res) => {
  const id = Number(req.params.id);

  const index = students.findIndex((student) => student.id === id);

  if (index === -1) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  students.splice(index, 1);

  res.json({
    message: "Student deleted successfully",
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
