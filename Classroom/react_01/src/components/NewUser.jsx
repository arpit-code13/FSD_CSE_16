import React from 'react'
import axios from 'axios';
import { useState } from 'react';
const NewUser = () => {
   const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData, //spread
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
        name: "",
        email: "",
        password: "",
      });
    } catch (error) {
      console.error(error);
      alert("Signup failed");
    }
  };
};
export const signUp = () => {
  return (
    <form onSubmit={handleSubmit}>
          <h2>Enter Your Details</h2>

          <input
            type="text"
            name='Arpit maurya '
            placeholder="Enter your name"
            onchange={handleChange}
          />
          <br></br>

          <input
            type="email"
            placeholder="Enter your email"
            onchange={handleChange}
          />
          <br />
          <br />

          <input
            Name
            type="email"
            placeholder="Enter your ID"
            onchange={handleChange}
          />
          <br />
          <br />

          <button type="submit">Sign up</button>
    </form>
  )
}

export default NewUser