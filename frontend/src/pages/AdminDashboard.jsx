import React, { useEffect, useState } from "react";
import api from "../api.js";
import { Link } from "react-router-dom";

function AdminDashboard({ user }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    async function fetchSummary() {
      const res = await api.get("/attendance/admin/summary");
      setSummary(res.data);
    }
    fetchSummary();
  }, []);

  if (!summary) return <div>Loading dashboard...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Admin Dashboard</h2>
      <p>Welcome, {user.name}</p>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <div style={{ border: "1px solid #ccc", padding: 10 }}>
          <h3>Total Employees</h3>
          <p>{summary.totalEmployees}</p>
        </div>
        <div style={{ border: "1px solid #ccc", padding: 10 }}>
          <h3>Present Today</h3>
          <p>{summary.presentToday}</p>
        </div>
        <div style={{ border: "1px solid #ccc", padding: 10 }}>
          <h3>On Leave</h3>
          <p>{summary.onLeave}</p>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Recent Logins</h3>
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Login Time</th>
            </tr>
          </thead>
          <tbody>
            {summary.recentLogins.map((r) => (
              <tr key={r.id}>
                <td>{r.user.name}</td>
                <td>{r.user.employeeId}</td>
                <td>{r.loginTime ? new Date(r.loginTime).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <Link to="/admin/users">Manage Users</Link>
      </div>
    </div>
  );
}

export default AdminDashboard;
