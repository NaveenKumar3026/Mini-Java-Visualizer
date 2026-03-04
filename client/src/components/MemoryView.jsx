const MemoryView = ({ memory }) => {
  return (
    <div>
      <div className="text-sm muted mb-2">Memory</div>
      <pre className="memory-box">{JSON.stringify(memory, null, 2)}</pre>
    </div>
  );
};

export default MemoryView;