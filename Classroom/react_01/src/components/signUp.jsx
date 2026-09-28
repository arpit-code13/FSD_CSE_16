import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const url = "http://localhost:3000/";

const SignUP = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const response = await axios.post(`${url}create`, {
        id: formData.id,
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      console.log(response.data);
      alert("Signup successfully");

      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Signup failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card shadow">
        <div className="card-body p-4">
          <h2 className="text-center mb-2">Create Account</h2>
          <p className="text-center text-muted mb-4">
            Sign up to create your account
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">ID</label>
              <input
                type="text"
                name="id"
                className="form-control"
                placeholder="Enter your ID"
                value={formData.id}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

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

            <div className="mb-3">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-control"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Sign Up
            </button>
          </form>

          <p className="text-center mt-4 mb-0">
            Already have an account?{" "}
            <Link to="/" className="text-decoration-none">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUP;
