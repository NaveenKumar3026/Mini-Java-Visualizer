import Editor from "@monaco-editor/react";

const CodeEditor = ({ code, setCode }) => {
  return (
    <div className="rounded-lg overflow-hidden shadow-md" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
      <Editor
        height="320px"
        theme="vs-dark"
        defaultLanguage="javascript"
        value={code}
        onChange={(value) => setCode(value)}
      />
    </div>
  );
};

export default CodeEditor;