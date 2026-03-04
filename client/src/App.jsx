import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Login from "./components/Login";
import CodeEditor from "./components/CodeEditor";
import TokenTable from "./components/TokenTable";
import OutputPanel from "./components/OutputPanel";
import MemoryView from "./components/MemoryView";
import StepsPanel from "./components/StepsPanel";
import { compileCode } from "./services/compilerApi";

function App() {
  const [code, setCode] = useState(`int a = 5;
print(a);

int b = scan();
print(b);`);

  const [tokens, setTokens] = useState([]);
  const [memory, setMemory] = useState({});
  const [steps, setSteps] = useState([]);
  const [output, setOutput] = useState("");
  const [consoleOutput, setConsoleOutput] = useState([]);
  const [inputsText, setInputsText] = useState("");
  const [waitingState, setWaitingState] = useState(null);
  const [waitingPrompt, setWaitingPrompt] = useState("");
  const [waitingInput, setWaitingInput] = useState("");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")) || null);
  const [historyList, setHistoryList] = useState([]);

  const handleRun = async () => {
    try {
      const inputs = inputsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (isNaN(Number(s)) ? s : Number(s)));

      const res = await compileCode(code, inputs);

      if (res.waitingForInput) {
        // pause execution and prompt user
        setTokens(res.tokens || []);
        setMemory(res.state?.variables || {});
        setSteps(res.state?.steps || []);
        setConsoleOutput(res.output || []);
        setWaitingState(res.state);
        setWaitingPrompt(res.prompt || "input");
        setWaitingInput("");
        return;
      }

      setTokens(res.tokens || []);
      setMemory(res.variables || {});
      setSteps(res.steps || []);
      // server now returns `printed` (program printed output) and `console` (input logs)
      setConsoleOutput(res.console || []);
      setOutput((res.printed || []).join("\n") || JSON.stringify(res.variables, null, 2));
    } catch (err) {
      console.error(err);
      setOutput("⚠ Backend Error");
    }
  };

  const handleResume = async () => {
    try {
      if (!waitingState) return;

      const inputValue = isNaN(Number(waitingInput)) ? waitingInput : Number(waitingInput);
      const res = await compileCode(null, [], waitingState, inputValue);

      if (res.waitingForInput) {
        // still waiting for next input
        setWaitingState(res.state);
        setWaitingPrompt(res.prompt || "input");
        setConsoleOutput(res.output || []);
        return;
      }

      // finished
      setTokens(res.tokens || []);
      setMemory(res.variables || {});
      setSteps(res.steps || []);
      setConsoleOutput(res.console || []);
      setOutput((res.printed || []).join("\n") || JSON.stringify(res.variables, null, 2));
      setWaitingState(null);
      setWaitingPrompt("");
      setWaitingInput("");
    } catch (err) {
      console.error(err);
      setOutput("⚠ Backend Error");
    }
  };

  const handleLogin = async (username, password) => {
    // guest shortcut
    if (username === "guest" && password === "") {
      const u = { username: "guest" };
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { username, password });
      const u = res.data.user || { username };
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
      return;
    } catch (err) {
      const message = err.response?.data?.error || "Login failed";
      throw new Error(message);
    }
  };

  const handleSignup = async (username, password) => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", { username, password });
      const u = res.data.user || { username };
      localStorage.setItem("user", JSON.stringify(u));
      setUser(u);
      return;
    } catch (err) {
      const message = err.response?.data?.error || "Signup failed";
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const [route, setRoute] = useState("run");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const loadHistory = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/compiler/history");
      setHistoryList(res.data.history || []);
    } catch (e) {
      console.error(e);
      setHistoryList([]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (!user) {
    return (
      <div className="app-shell">
        <div className="dashboard-card login-card">
          <h1 className="dashboard-title-center">Mini Java Intelligence Report</h1>
          <p className="dashboard-subtitle-center">Sign in to start exploring your programs</p>
          <div className="login-content">
            <Login onLogin={handleLogin} onSignup={handleSignup} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="dashboard-header">
        <div className="dashboard-logo-row">
          <div className="logo-pill">MJ</div>
          <div>
            <h1 className="dashboard-title">Mini Java Intelligence Report</h1>
            <p className="dashboard-subtitle">
              Visual report of your code runs, history and syntax — styled like your reference.
            </p>
          </div>
        </div>
        <div className="dashboard-user-row">
          <div className="nav-dropdown" ref={navRef}>
            {/** show current route label on the button */}
            {(() => {
              const label = route === "saved" ? "Saved Data" : route === "syntax" ? "Syntax" : (route === "runFull" || route === "run") ? "Run" : "Menu";
              const activeClass = (route === "saved" || route === "syntax" || route === "runFull" || route === "run") ? "nav-tab-active" : "";
              return (
                <button
                  className={"nav-dropdown-btn " + activeClass}
                  onClick={() => setDropdownOpen((s) => !s)}
                  aria-expanded={dropdownOpen}
                >
                  {label} ▾
                </button>
              );
            })()}
            {dropdownOpen && (
              <div className="nav-dropdown-menu" role="menu">
                <button className={"nav-dropdown-item " + (route === "runFull" ? "nav-tab-active" : "")} onClick={() => { setRoute("runFull"); setDropdownOpen(false); }} role="menuitem">Run</button>
                <button className={"nav-dropdown-item " + (route === "saved" ? "nav-tab-active" : "")} onClick={() => { setRoute("saved"); setDropdownOpen(false); }} role="menuitem">Saved Data</button>
                <button className={"nav-dropdown-item " + (route === "syntax" ? "nav-tab-active" : "")} onClick={() => { setRoute("syntax"); setDropdownOpen(false); }} role="menuitem">Syntax</button>
              </div>
            )}
          </div>
          <span className="user-chip">Welcome, {user.username || "guest"}</span>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {route === "runFull" ? (
        <main className="page-container fade-in" style={{display: 'flex', justifyContent: 'center', padding: 24}}>
          <section className="dashboard-card" style={{width: '1000px'}}>
            <div className="card-header-row">
              <div>
                <h2 className="card-title-main">Run & Debug</h2>
                <p className="card-subtitle-main">Type, run and interact with your Mini Java code.</p>
              </div>
              <div className="card-icon-pill">▶</div>
            </div>

            <div className="card-body">
              <div className="editor-wrapper" style={{minHeight: 360}}>
                <CodeEditor code={code} setCode={setCode} />
              </div>

              <div className="inputs-row">
                <input
                  placeholder="Inputs (comma separated) — e.g. 10, 20"
                  value={inputsText}
                  onChange={(e) => setInputsText(e.target.value)}
                  className="inputs-field"
                />
                <button onClick={handleRun} className="run-primary-btn">
                  Run Code
                </button>
              </div>

              <div className="console-box">
                <div className="console-label">Console Output</div>
                <div className="console-scroll">
                  {consoleOutput.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                  {waitingState && (
                    <div className="waiting-input">
                      <div className="waiting-label">
                        Waiting for input for <strong>{waitingPrompt}</strong>
                      </div>
                      <div className="waiting-row">
                        <input
                          value={waitingInput}
                          onChange={(e) => setWaitingInput(e.target.value)}
                          className="waiting-field"
                        />
                        <button onClick={handleResume} className="run-secondary-btn">
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{display: 'flex', gap: 12, marginTop: 12}}>
                <div style={{flex:1}}>
                  <div className="text-sm muted mb-2">Tokens</div>
                  <div className="tokens-box"><TokenTable tokens={tokens} /></div>
                </div>

                <div style={{flex:1}}>
                  <OutputPanel output={output} />
                </div>
              </div>

              <div style={{marginTop:12}}>
                <button className="chip-button" onClick={() => setRoute('run')}>Back</button>
              </div>
            </div>
          </section>
        </main>
      ) : route === "run" ? (
        <main className="dashboard-grid page-container fade-in">
          {/* RUN card (same as before) */}
          <section className="dashboard-card dashboard-card-large" onClick={() => setRoute("runFull")} style={{cursor: 'pointer'}}>
            <div className="card-header-row">
              <div>
                <h2 className="card-title-main">Run & Debug</h2>
                <p className="card-subtitle-main">Type, run and interact with your Mini Java code.</p>
              </div>
              <div className="card-icon-pill">▶</div>
            </div>

            <div className="card-body">
              <div className="editor-wrapper">
                <CodeEditor code={code} setCode={setCode} />
              </div>

              <div className="inputs-row">
                <input
                  placeholder="Inputs (comma separated) — e.g. 10, 20"
                  value={inputsText}
                  onChange={(e) => setInputsText(e.target.value)}
                  className="inputs-field"
                />
                <button onClick={handleRun} className="run-primary-btn">
                  Run Code
                </button>
              </div>

              <div className="console-box">
                <div className="console-label">Console Output</div>
                <div className="console-scroll">
                  {consoleOutput.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                  {waitingState && (
                    <div className="waiting-input">
                      <div className="waiting-label">
                        Waiting for input for <strong>{waitingPrompt}</strong>
                      </div>
                      <div className="waiting-row">
                        <input
                          value={waitingInput}
                          onChange={(e) => setWaitingInput(e.target.value)}
                          className="waiting-field"
                        />
                        <button onClick={handleResume} className="run-secondary-btn">
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Small cards for Saved and Syntax in the grid */}
          <section className="dashboard-card" onClick={() => setRoute("saved")}> 
            <div className="card-header-row">
              <div>
                <h2 className="card-title-main">Saved Data</h2>
                <p className="card-subtitle-main">History of compiled runs from your backend.</p>
              </div>
              <div className="card-icon-pill">📊</div>
            </div>

            <div className="card-body history-body">
              <div className="history-header-row">
                <span className="history-label">
                  Total runs: <strong>{historyList.length}</strong>
                </span>
                <button className="chip-button" onClick={loadHistory}>
                  Refresh
                </button>
              </div>
              <div className="history-scroll">
                {historyList.length === 0 && (
                  <div className="history-empty">No saved runs yet. Run some code to see history here.</div>
                )}
                {historyList.slice(0,3).map((h) => (
                  <div key={h.id} className="history-item-row">
                    <div className="history-item-header">
                      <span className="history-run-id">Run #{h.id}</span>
                      {h.created_at && (
                        <span className="history-time">
                          {new Date(h.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <pre className="history-code-snippet">
                      {typeof h.tokens === "string"
                        ? h.tokens
                        : JSON.stringify(h.tokens, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="dashboard-card" onClick={() => setRoute("syntax")}>
            <div className="card-header-row">
              <div>
                <h2 className="card-title-main">Syntax Guide</h2>
                <p className="card-subtitle-main">Quick reference for your Mini Java language.</p>
              </div>
              <div className="card-icon-pill">📚</div>
            </div>

            <div className="card-body syntax-body">
              <div className="syntax-section">
                <div className="syntax-title">Variables & Types</div>
                <pre className="syntax-code">
{`int a = 5;
string name = "Naveen";`}
                </pre>
              </div>

              <div className="syntax-section">
                <div className="syntax-title">Input & Output</div>
                <pre className="syntax-code">
{`int x = scan();
print(x);`}
                </pre>
              </div>

              <div className="syntax-section">
                <div className="syntax-title">Classes</div>
                <pre className="syntax-code">
{`class Student {
  string name;
  int marks = 87;
}

Student s;
s.name = scan();
print(s.name);
print(s.marks);`}
                </pre>
              </div>
            </div>
          </section>
        </main>
      ) : route === "saved" ? (
        <main className="page-container fade-in" style={{display: 'flex', justifyContent: 'center', padding: 24}}>
          <section className="dashboard-card" style={{width: '800px'}}>
            <div className="card-header-row">
              <div>
                <h2 className="card-title-main">Saved Data</h2>
                <p className="card-subtitle-main">Full history of compiled runs from your backend.</p>
              </div>
              <div className="card-icon-pill">📊</div>
            </div>

            <div className="card-body history-body">
              <div className="history-header-row">
                <span className="history-label">
                  Total runs: <strong>{historyList.length}</strong>
                </span>
                <div>
                  <button className="chip-button" onClick={loadHistory}>
                    Refresh
                  </button>
                  <button className="chip-button" style={{marginLeft:8}} onClick={() => setRoute('run')}>
                    Back
                  </button>
                </div>
              </div>
              <div className="history-scroll">
                {historyList.length === 0 && (
                  <div className="history-empty">No saved runs yet. Run some code to see history here.</div>
                )}
                {historyList.map((h) => (
                  <div key={h.id} className="history-item-row">
                    <div className="history-item-header">
                      <span className="history-run-id">Run #{h.id}</span>
                      {h.created_at && (
                        <span className="history-time">
                          {new Date(h.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <pre className="history-code-snippet">
                      {typeof h.tokens === "string"
                        ? h.tokens
                        : JSON.stringify(h.tokens, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="page-container fade-in" style={{display: 'flex', justifyContent: 'center', padding: 24}}>
          <section className="dashboard-card" style={{width: '800px'}}>
            <div className="card-header-row">
              <div>
                <h2 className="card-title-main">Syntax Guide</h2>
                <p className="card-subtitle-main">Full reference for your Mini Java language.</p>
              </div>
              <div className="card-icon-pill">📚</div>
            </div>

            <div className="card-body syntax-body">
              <div className="syntax-section">
                <div className="syntax-title">Variables & Types</div>
                <pre className="syntax-code">
{`int a = 5;
string name = "Naveen";`}
                </pre>
              </div>

              <div className="syntax-section">
                <div className="syntax-title">Input & Output</div>
                <pre className="syntax-code">
{`int x = scan();
print(x);`}
                </pre>
              </div>

              <div className="syntax-section">
                <div className="syntax-title">Classes</div>
                <pre className="syntax-code">
{`class Student {
  string name;
  int marks = 87;
}

Student s;
s.name = scan();
print(s.name);
print(s.marks);`}
                </pre>
              </div>

              <div style={{marginTop:12}}>
                <button className="chip-button" onClick={() => setRoute('run')}>Back</button>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default App;