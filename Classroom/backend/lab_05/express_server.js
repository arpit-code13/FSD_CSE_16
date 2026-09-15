import express from "express";

const app = express();

app.use(express.json());


const userData = {
    id: 101,
    name: "Arpit",
    email: "Arpit@gmail.com"
};


app.get("/msg", (req, res) => {
    res.status(200).json({
        message: "Welcome user"
    });
});

app.get("/user", (req, res) => {
    res.status(200).json(userData);
});

app.post("/user", (req, res) => {
    res.status(201).json({
        message: "User created successfully",
        data: req.body
    });
});


app.delete("/user", (req, res) => {
    res.status(200).json({
        message: "User deleted successfully"
    });
});

// Start server
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});

