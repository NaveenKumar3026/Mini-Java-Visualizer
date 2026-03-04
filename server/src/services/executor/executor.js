export const execute = (tokens, inputs = [], state = null) => {
  let variables = {};
  let functions = {};
  let classes = {};
  let steps = [];
  let output = [];
  let inputPointer = 0;
  let i = 0;

  // resume state support
  if (state) {
    variables = state.variables || {};
    functions = state.functions || {};
    classes = state.classes || {};
    steps = state.steps || [];
    output = state.output || [];
    inputPointer = state.inputPointer || 0;
    i = state.i || 0;
  }

  while (i < tokens.length) {

    // 🔹 CLASS
    if (tokens[i].value === "class") {
      const className = tokens[i + 1].value;

      let j = i;
      while (tokens[j]?.value !== "{") j++;
      j++;

      const props = {};
      while (tokens[j] && tokens[j].value !== "}") {
        // expect patterns like: int name = 5 ;  OR string name ;
        if (tokens[j]?.value === "int" || tokens[j]?.value === "string") {
          const type = tokens[j].value;
          const propName = tokens[j + 1].value;
          let propValue = null;

          if (tokens[j + 2]?.value === "=") {
            const valToken = tokens[j + 3];
            if (valToken?.type === "NUMBER") propValue = parseInt(valToken.value);
            else if (valToken?.type === "STRING") propValue = valToken.value;
            else propValue = null;
            j += 5; // skip: type name = value ;
          } else {
            j += 3; // skip: type name ;
          }

          props[propName] = propValue;
          continue;
        }

        j++;
      }

      classes[className] = props;

      steps.push(`Class ${className} created`);

      while (tokens[i]?.value !== "}") i++;
      i++;
      continue;
    }

    // 🔹 FUNCTION (store function body for later execution)
    if (tokens[i].value === "function") {
      const funcName = tokens[i + 1].value;

      // find opening brace
      let j = i;
      while (tokens[j] && tokens[j].value !== "{") j++;
      if (!tokens[j]) { i++; continue; }
      const bodyStart = j + 1;

      // find matching closing brace
      let depth = 1;
      j = bodyStart;
      while (j < tokens.length && depth > 0) {
        if (tokens[j].value === "{") depth++;
        else if (tokens[j].value === "}") depth--;
        j++;
      }
      const bodyEnd = j - 1;

      const bodyTokens = tokens.slice(bodyStart, bodyEnd);

      functions[funcName] = { params: [], bodyTokens };

      steps.push(`Function ${funcName} defined`);

      i = j;
      continue;
    }

    // 🔹 OBJECT
    if (classes[tokens[i].value]) {
      const className = tokens[i].value;
      const objName = tokens[i + 1].value;

      variables[objName] = { ...classes[className] };

      steps.push(`Object ${objName} created from ${className}`);

      i += 3;
      continue;
    }

    // 🔹 MEMBER ASSIGNMENT e.g., s.name = scan(); or s.name = "abc";
    if (
      tokens[i]?.type === "IDENTIFIER" &&
      tokens[i + 1]?.value === "." &&
      tokens[i + 2]?.type === "IDENTIFIER" &&
      tokens[i + 3]?.value === "="
    ) {
      const objName = tokens[i].value;
      const propName = tokens[i + 2].value;

      // s.name = scan();
      if (tokens[i + 4]?.value === "scan") {
        if (inputs[inputPointer] === undefined) {
          return {
            waitingForInput: true,
            prompt: `${objName}.${propName}`,
            state: {
              i,
              inputPointer,
              variables,
              functions,
              classes,
              steps,
              output,
              tokens
            }
          };
        }

        const input = inputs[inputPointer++];
        variables[objName] = variables[objName] || {};
        variables[objName][propName] = input;

        output.push(`(input: ${input})`);
        steps.push(`${objName}.${propName} = scan() → ${input}`);

        i += 7; // skip over scan ( ) ;
        continue;
      }

      // s.name = "hello";
      if (tokens[i + 4]?.type === "STRING") {
        variables[objName] = variables[objName] || {};
        variables[objName][propName] = tokens[i + 4].value;
        steps.push(`${objName}.${propName} = ${tokens[i + 4].value}`);
        i += 6;
        continue;
      }

      // s.marks = 5; or s.marks = a;
      if (tokens[i + 4]?.type === "NUMBER" || tokens[i + 4]?.type === "IDENTIFIER") {
        const val = tokens[i + 4].type === "NUMBER" ? parseInt(tokens[i + 4].value) : variables[tokens[i + 4].value];
        variables[objName] = variables[objName] || {};
        variables[objName][propName] = val;
        steps.push(`${objName}.${propName} = ${val}`);
        i += 6;
        continue;
      }
    }

    // 🔹 ASSIGNMENT to variable (allows undeclared vars and function calls)
    if (tokens[i]?.type === "IDENTIFIER" && tokens[i + 1]?.value === "=") {
      const varName = tokens[i].value;

      // var = scan();
      if (tokens[i + 2]?.value === "scan") {
        if (inputs[inputPointer] === undefined) {
          return {
            waitingForInput: true,
            prompt: varName,
            state: {
              i,
              inputPointer,
              variables,
              functions,
              classes,
              steps,
              output,
              tokens
            }
          };
        }

        const input = inputs[inputPointer++];
        variables[varName] = input;

        output.push(`(input: ${input})`);
        steps.push(`${varName} = scan() → ${input}`);

        // skip over pattern: name = scan ( ) ;
        i += 5;
        continue;
      }

      // var = funcCall();
      if (tokens[i + 2]?.type === "IDENTIFIER" && tokens[i + 3]?.value === "(") {
        const funcName = tokens[i + 2].value;

        const runFunction = (fname, args = []) => {
          const fn = functions[fname];
          if (!fn) return { value: 0 };

          const body = fn.bodyTokens || [];
          const localVars = {};
          let j = 0;

          while (j < body.length) {
            // support: string/ int declarations
            if (body[j].value === "string" || body[j].value === "int") {
              const name = body[j + 1].value;

              // string name = scan();
              if (body[j + 3]?.value === "scan") {
                if (inputs[inputPointer] === undefined) {
                  return { waitingForInput: true };
                }
                const val = inputs[inputPointer++];
                localVars[name] = body[j].value === "int" ? (isNaN(Number(val)) ? val : Number(val)) : String(val);
                j += 5;
                continue;
              }

              // string name = "abc";
              if (body[j + 3]?.type === "STRING") {
                localVars[name] = body[j + 3].value;
                j += 5;
                continue;
              }

              j++;
              continue;
            }

            // return statement
            if (body[j].value === "return") {
              const tok = body[j + 1];
              if (!tok) return { value: null };
              if (tok.type === "STRING") return { value: tok.value };
              if (tok.type === "NUMBER") return { value: parseInt(tok.value) };
              if (tok.type === "IDENTIFIER") {
                const v = localVars[tok.value] ?? variables[tok.value];
                return { value: v };
              }
              return { value: null };
            }

            // print inside function
            if (body[j].value === "print") {
              const varToken = body[j + 2];
              let rawValue = undefined;
              if (!varToken) rawValue = "";
              else if (varToken.type === "NUMBER") rawValue = parseInt(varToken.value);
              else if (varToken.type === "STRING") rawValue = varToken.value;
              else if (varToken.type === "IDENTIFIER" && body[j + 3]?.value === ".") {
                const objName = varToken.value;
                const prop = body[j + 4]?.value;
                rawValue = localVars[objName]?.[prop] ?? variables[objName]?.[prop];
              } else rawValue = localVars[varToken.value] ?? variables[varToken.value];
              const v = typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue);
              output.push(v);
              steps.push(`print(${v})`);
              j += 4;
              continue;
            }

            j++;
          }

          return { value: null };
        };

        const result = runFunction(funcName, []);

        if (result.waitingForInput) {
          return {
            waitingForInput: true,
            prompt: varName,
            state: {
              i,
              inputPointer,
              variables,
              functions,
              classes,
              steps,
              output,
              tokens
            }
          };
        }

        variables[varName] = result.value;
        steps.push(`${varName} = ${funcName}() → ${result.value}`);

        i += 6; // skip over name = func ( ) ;
        continue;
      }

      // var = "hello" or number or identifier
      if (tokens[i + 2]?.type === "STRING") {
        variables[varName] = tokens[i + 2].value;
        steps.push(`${varName} = ${variables[varName]}`);
        i += 4;
        continue;
      }

      if (tokens[i + 2]?.type === "NUMBER") {
        variables[varName] = parseInt(tokens[i + 2].value);
        steps.push(`${varName} = ${variables[varName]}`);
        i += 4;
        continue;
      }

      if (tokens[i + 2]?.type === "IDENTIFIER") {
        variables[varName] = variables[tokens[i + 2].value];
        steps.push(`${varName} = ${variables[varName]}`);
        i += 4;
        continue;
      }
    }

    // 🔹 PRINT
    if (tokens[i].value === "print") {
      const varToken = tokens[i + 2];

      let rawValue;
      if (!varToken) rawValue = "";
      else if (varToken.type === "NUMBER") rawValue = parseInt(varToken.value);
      else if (varToken.type === "STRING") rawValue = varToken.value;
      else if (varToken.type === "IDENTIFIER" && tokens[i + 3]?.value === ".") {
        const objName = varToken.value;
        const prop = tokens[i + 4]?.value;
        rawValue = variables[objName]?.[prop];
      } else rawValue = variables[varToken.value];

      const value = typeof rawValue === "object" ? JSON.stringify(rawValue) : String(rawValue);

      output.push(value);
      steps.push(`print(${value})`);

      i += 4;
      continue;
    }

    // 🔹 VARIABLE DECLARATION
    if (tokens[i].value === "int") {
      const varName = tokens[i + 1].value;

      // int a = 5;
      if (tokens[i + 3]?.type === "NUMBER") {
        variables[varName] = parseInt(tokens[i + 3].value);
        steps.push(`${varName} = ${variables[varName]}`);
        i += 5;
        continue;
      }

      // int a = scan();
      if (tokens[i + 3]?.value === "scan") {
        // if no input available, pause and request input in UI
        if (inputs[inputPointer] === undefined) {
          return {
            waitingForInput: true,
            prompt: varName,
            state: {
              i,
              inputPointer,
              variables,
              functions,
              classes,
              steps,
              output,
              tokens
            }
          };
        }

        const input = inputs[inputPointer++];
        variables[varName] = input;

        output.push(`(input: ${input})`);
        steps.push(`${varName} = scan() → ${input}`);

        i += 5;
        continue;
      }

      // int c = a + b;
      if (
        tokens[i + 3]?.type === "IDENTIFIER" &&
        ["+", "-", "*", "/"].includes(tokens[i + 4]?.value)
      ) {
        const left = variables[tokens[i + 3].value];
        const operator = tokens[i + 4].value;

        const rightToken = tokens[i + 5];

        const right =
          rightToken.type === "NUMBER"
            ? parseInt(rightToken.value)
            : variables[rightToken.value];

        let result;

        switch (operator) {
          case "+": result = left + right; break;
          case "-": result = left - right; break;
          case "*": result = left * right; break;
          case "/": result = left / right; break;
        }

        variables[varName] = result;

        steps.push(`${varName} = ${left} ${operator} ${right} → ${result}`);

        i += 7;
        continue;
      }

      // int result = add(a, b);
      if (
        tokens[i + 3]?.type === "IDENTIFIER" &&
        tokens[i + 4]?.value === "("
      ) {
        const funcName = tokens[i + 3].value;

        const arg1 =
          tokens[i + 5].type === "NUMBER"
            ? parseInt(tokens[i + 5].value)
            : variables[tokens[i + 5].value] ?? 0;

        const arg2 =
          tokens[i + 7].type === "NUMBER"
            ? parseInt(tokens[i + 7].value)
            : variables[tokens[i + 7].value] ?? 0;

        const operator = functions[funcName]?.operator || "+";

        let result;

        switch (operator) {
          case "+": result = arg1 + arg2; break;
          case "-": result = arg1 - arg2; break;
          case "*": result = arg1 * arg2; break;
          case "/": result = arg1 / arg2; break;
        }

        variables[varName] = result;

        steps.push(`${varName} = ${funcName}(${arg1}, ${arg2}) → ${result}`);

        i += 9;
        continue;
      }

      // int x = s.marks;
      if (
        tokens[i + 3]?.type === "IDENTIFIER" &&
        tokens[i + 4]?.value === "."
      ) {
        const obj = variables[tokens[i + 3].value];
        const prop = tokens[i + 5].value;

        const value = obj?.[prop];

        variables[varName] = value;

        steps.push(`${varName} = ${tokens[i + 3].value}.${prop} → ${value}`);

        i += 6;
        continue;
      }
    }

    // 🔹 STRING VARIABLE DECLARATION
    if (tokens[i].value === "string") {
      const varName = tokens[i + 1].value;

      // string s = "hello";
      if (tokens[i + 3]?.type === "STRING") {
        variables[varName] = tokens[i + 3].value;
        steps.push(`${varName} = ${variables[varName]}`);
        i += 5;
        continue;
      }

      // string s = scan();
      if (tokens[i + 3]?.value === "scan") {
        if (inputs[inputPointer] === undefined) {
          return {
            waitingForInput: true,
            prompt: varName,
            state: {
              i,
              inputPointer,
              variables,
              functions,
              classes,
              steps,
              output,
              tokens
            }
          };
        }

        const input = inputs[inputPointer++];
        variables[varName] = String(input);

        output.push(`(input: ${variables[varName]})`);
        steps.push(`${varName} = scan() → ${variables[varName]}`);

        i += 5;
        continue;
      }

      // string s = a + b;
      if (
        tokens[i + 3]?.type === "IDENTIFIER" &&
        ["+", "-", "*", "/"].includes(tokens[i + 4]?.value)
      ) {
        const left = variables[tokens[i + 3].value];
        const operator = tokens[i + 4].value;

        const rightToken = tokens[i + 5];

        const right =
          rightToken.type === "NUMBER"
            ? parseInt(rightToken.value)
            : variables[rightToken.value];

        let result;

        // if operator is + and any operand is string, do concatenation
        if (operator === "+" && (typeof left === "string" || typeof right === "string")) {
          result = String(left) + String(right);
        } else {
          switch (operator) {
            case "+": result = left + right; break;
            case "-": result = left - right; break;
            case "*": result = left * right; break;
            case "/": result = left / right; break;
          }
        }

        variables[varName] = result;

        steps.push(`${varName} = ${left} ${operator} ${right} → ${result}`);

        i += 7;
        continue;
      }

      // string s = func(a, b);
      if (
        tokens[i + 3]?.type === "IDENTIFIER" &&
        tokens[i + 4]?.value === "("
      ) {
        const funcName = tokens[i + 3].value;

        const arg1 =
          tokens[i + 5].type === "NUMBER"
            ? parseInt(tokens[i + 5].value)
            : variables[tokens[i + 5].value] ?? '';

        const arg2 =
          tokens[i + 7].type === "NUMBER"
            ? parseInt(tokens[i + 7].value)
            : variables[tokens[i + 7].value] ?? '';

        const operator = functions[funcName]?.operator || "+";

        let result;

        if (operator === "+" && (typeof arg1 === "string" || typeof arg2 === "string")) {
          result = String(arg1) + String(arg2);
        } else {
          switch (operator) {
            case "+": result = arg1 + arg2; break;
            case "-": result = arg1 - arg2; break;
            case "*": result = arg1 * arg2; break;
            case "/": result = arg1 / arg2; break;
          }
        }

        variables[varName] = result;

        steps.push(`${varName} = ${funcName}(${arg1}, ${arg2}) → ${result}`);

        i += 9;
        continue;
      }

      // string x = s.prop (coerce to string)
      if (
        tokens[i + 3]?.type === "IDENTIFIER" &&
        tokens[i + 4]?.value === "."
      ) {
        const obj = variables[tokens[i + 3].value];
        const prop = tokens[i + 5].value;

        const value = obj?.[prop];

        variables[varName] = value;

        steps.push(`${varName} = ${tokens[i + 3].value}.${prop} → ${value}`);

        i += 6;
        continue;
      }
    }

    i++;
  }

  return {
    variables,
    steps,
    output
  };
};