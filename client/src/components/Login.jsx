import { useState } from "react";

const Login = ({ onLogin, onSignup }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submitLogin = (e) => {
    e.preventDefault();
    setError("");
    if (!username) return setError("Username is required");
    if (!password) return setError("Password is required");
    onLogin(username, password).catch((err) => setError(err?.message || "Login failed"));
  };

  const submitSignup = (e) => {
    e.preventDefault();
    setError("");
    if (!username) return setError("Username is required");
    if (!password) return setError("Password is required");
    onSignup(username, password).catch((err) => setError(err?.message || "Signup failed"));
  };

  return (
    <div className="login-form">
      <h2 className="login-title">Sign in to Mini Java Visualizer</h2>
      <p className="login-subtitle">
        Enter a username to continue (demo auth).
      </p>
      <form className="login-form-body">
        <div className="login-field">
          <label className="login-label">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="login-input"
          />
        </div>
        <div className="login-field">
          <label className="login-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
          />
        </div>
        {error && <div className="login-error">{error}</div>}
        <div className="login-actions">
          <button type="button" className="run-primary-btn" onClick={submitLogin}>
            Login
          </button>
          <button type="button" className="run-secondary-btn signup-btn" onClick={submitSignup}>
            Sign Up
          </button>
          <button
            type="button"
            className="chip-button"
            onClick={() => {
              setUsername("guest");
              setPassword("");
              onLogin("guest", "");
            }}
          >
            Continue as Guest
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
