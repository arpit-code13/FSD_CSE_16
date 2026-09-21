import React from "react";

export const SignUp = () => {
  return (
    <div>
      <h2>Enter Your Details</h2>

      <input type="text" placeholder="Enter your name" />
      <br />
      <br />

      <input type="email" placeholder="Enter your email" />
      <br />
      <br />

      <input type="text" placeholder="Enter your ID" />
      <br />
      <br />

      <button>Submit Details</button>
    </div>
  );
};
