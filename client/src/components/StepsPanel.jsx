const StepsPanel = ({ steps }) => {
  return (
    <div>
      <div className="text-sm muted mb-2">Execution Steps</div>
      <ul className="steps">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ul>
    </div>
  );
};

export default StepsPanel;