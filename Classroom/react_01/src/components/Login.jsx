import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const url = "http://localhost:3000/";

const Login = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${url}login`, formData);

      console.log(response.data);
      alert("Login successfully");

      navigate("/home");
      <Route path="/home" element={<Home />} />;
    } catch (error) {
      console.error(error);
      alert("Login failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card shadow">
        <div className="card-body p-4">
          <h2 className="text-center mb-2">Welcome Back</h2>
          <p className="text-center text-muted mb-4">Login to your account</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="text-end mb-3">
              <Link to="#" className="text-decoration-none">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Login
            </button>
          </form>

          <p className="text-center mt-4 mb-0">
            Don't have an account?{" "}
            <Link to="/signup" className="text-decoration-none">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
