import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api.js";

function LoginPage({ setUser }) {
  const [emailOrEmployeeId, setEmailOrEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await api.post("/auth/login", {
        emailOrEmployeeId,
        password
      });

      setUser(res.data.user);
      if (res.data.user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else {
        // For employee you can later add /employee/dashboard
        alert("Logged in as employee (employee dashboard not implemented yet)");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: 20, border: "1px solid #ddd" }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>Employee ID or Email</label>
          <input
            type="text"
            value={emailOrEmployeeId}
            onChange={(e) => setEmailOrEmployeeId(e.target.value)}
            required
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
        <button style={{ marginTop: 15 }} type="submit">
          Login
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
