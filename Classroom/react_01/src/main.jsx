import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Home } from "./components/Home.jsx";
import SignUP from "./components/SignUp.jsx";
import NewUser from "./components/NewUser.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
   <SignUP/>
  </StrictMode>,
);
