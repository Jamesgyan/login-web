import React, { useEffect, useState } from "react";
import api from "../api.js";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    employeeId: "",
    password: "",
    role: "EMPLOYEE"
  });
  const [error, setError] = useState("");

  async function loadUsers() {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post("/admin/users", form);
      setForm({
        name: "",
        email: "",
        employeeId: "",
        password: "",
        role: "EMPLOYEE"
      });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Error creating user");
    }
  }

  async function toggleActive(user) {
    await api.patch(`/admin/users/${user.id}/active`, {
      isActive: !user.isActive
    });
    loadUsers();
  }

  async function changeRole(user) {
    const newRole = user.role === "ADMIN" ? "EMPLOYEE" : "ADMIN";
    await api.patch(`/admin/users/${user.id}/role`, { role: newRole });
    loadUsers();
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete user ${user.name}?`)) return;
    await api.delete(`/admin/users/${user.id}`);
    loadUsers();
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin - User Management</h2>

      <h3>Create New User</h3>
      <form onSubmit={handleCreate}>
        <div>
          <label>Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Employee ID</label>
          <input
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="EMPLOYEE">EMPLOYEE</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ marginTop: 10 }}>
          Create User
        </button>
      </form>

      <h3 style={{ marginTop: 30 }}>Users</h3>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Name</th>
            <th>Employee ID</th>
            <th>Email</th>
            <th>Role</th>
            <th>Active</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.employeeId}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              <td>{u.isActive ? "Yes" : "No"}</td>
              <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "-"}</td>
              <td>
                <button onClick={() => changeRole(u)}>
                  Make {u.role === "ADMIN" ? "EMPLOYEE" : "ADMIN"}
                </button>{" "}
                <button onClick={() => toggleActive(u)}>
                  {u.isActive ? "Deactivate" : "Activate"}
                </button>{" "}
                <button onClick={() => deleteUser(u)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminUsers;
