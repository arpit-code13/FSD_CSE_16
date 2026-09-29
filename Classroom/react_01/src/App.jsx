import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SignUP from "./components/SignUp.jsx";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUP />} />
        <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
