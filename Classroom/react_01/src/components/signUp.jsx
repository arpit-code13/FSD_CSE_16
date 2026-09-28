import React, { useState } from "react";
import axios from "axios";

const url = "http://localhost:3000/";

const SignUP = () => {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
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
      const response = await axios.post(`${url}create`, formData);

      console.log(response.data);
      alert("Signup successfully");

      setFormData({
        id: "",
        name: "",
        email: "",
      });
    } catch (error) {
      console.error(error);
      alert("Signup failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Enter Your Details</h2>

      <input
        name="name"
        type="text"
        placeholder="Enter your name"
        onChange={handleChange}
      />
      <br />

      <input
        name="email"
        type="email"
        placeholder="Enter your email"
        onChange={handleChange}
      />
      <br />
      <br />

      <input
        name="id"
        type="text"
        placeholder="Enter your ID"
        onChange={handleChange}
      />
      <br />
      <br />

      <button type="submit">Sign up</button>
    </form>
  );
};

export default SignUP;
