const TokenTable = ({ tokens }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((t, i) => (
          <tr key={i}>
            <td>{t.type}</td>
            <td>{t.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TokenTable;