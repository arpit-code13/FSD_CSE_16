import { BrowserRouter, Routes, Route } from "react-router-dom";
import SignUP from "./components/SignUp.jsx";
import Login from "./components/Login.jsx";
import Home from "./components/Home.jsx";
import Anime from "./components/Anime.jsx";
import Manga from "./components/Manga.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/home" element={<Home />} />

        <Route path="/signup" element={<SignUP />} />

        <Route path="/login" element={<Login />} />

        <Route path="/anime" element={<Anime />} />

        <Route path="/manga" element={<Manga />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
