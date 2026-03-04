const OutputPanel = ({ output }) => {
  const text = Array.isArray(output) ? output.join("\n") : String(output || "");
  return (
    <div>
      <div className="text-sm muted mb-2">Program Output</div>
      <pre className="output-box">{text}</pre>
    </div>
  );
};

export default OutputPanel;