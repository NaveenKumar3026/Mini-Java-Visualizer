const KEYWORDS = ["int", "string", "function", "return", "class", "print", "scan"];

export const lexer = (input) => {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    let char = input[i];

    // 🔹 Skip spaces
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // 🔹 IDENTIFIER / KEYWORD
    if (/[a-zA-Z]/.test(char)) {
      let value = "";

      while (i < input.length && /[a-zA-Z]/.test(input[i])) {
        value += input[i];
        i++;
      }

      tokens.push({
        type: KEYWORDS.includes(value) ? "KEYWORD" : "IDENTIFIER",
        value,
      });

      continue;
    }

    // 🔹 NUMBER
    if (/[0-9]/.test(char)) {
      let value = "";

      while (i < input.length && /[0-9]/.test(input[i])) {
        value += input[i];
        i++;
      }

      tokens.push({ type: "NUMBER", value });
      continue;
    }

    // 🔹 STRING LITERAL
    if (char === '"' || char === "'") {
      const quote = char;
      i++; // skip opening quote
      let value = "";
      while (i < input.length && input[i] !== quote) {
        // simple escape for \" and \'
        if (input[i] === "\\" && i + 1 < input.length) {
          value += input[i + 1];
          i += 2;
          continue;
        }
        value += input[i];
        i++;
      }
      i++; // skip closing quote

      tokens.push({ type: "STRING", value });
      continue;
    }

    // 🔹 OPERATORS
    if (["+", "-", "*", "/", "="].includes(char)) {
      tokens.push({ type: "OPERATOR", value: char });
      i++;
      continue;
    }

    // 🔹 SYMBOLS (VERY IMPORTANT)
    if (["(", ")", "{", "}", ",", ".", ";"].includes(char)) {
      tokens.push({ type: "SYMBOL", value: char });
      i++;
      continue;
    }

    throw new Error(`Invalid character: ${char}`);
  }

  return tokens;
};