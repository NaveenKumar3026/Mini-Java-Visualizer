import { lexer } from "../services/lexer/lexer.js";
import { execute } from "../services/executor/executor.js";
import db from "../config/db.js";

export const runCompiler = (req, res) => {
  try {
    const { code, inputs, resume, state, inputValue } = req.body;

    // determine tokens: if resuming, state may contain tokens
    let tokens = [];
    if (resume && state && state.tokens) {
      tokens = state.tokens;
    } else {
      tokens = lexer(code || "");
    }

    const splitOutput = (outArr) => {
      const arr = Array.isArray(outArr) ? outArr : [];
      const printed = arr.filter((o) => typeof o === "string" && !o.startsWith("(input:"));
      const consoleOutput = arr.filter((o) => typeof o === "string" && o.startsWith("(input:"));
      return { printed, consoleOutput };
    };

    // resume flow: consume single input and resume from state
    if (resume && state) {
      const result = execute(tokens, [inputValue], state);

      if (result.waitingForInput) {
        return res.json(result);
      }

      // finished — save and return
      const { printed, consoleOutput } = splitOutput(result.output);

      if (!db || typeof db.query !== "function") {
        return res.json({
          tokens,
          variables: result.variables,
          steps: result.steps,
          printed,
          console: consoleOutput
        });
      }

      db.query(
        "INSERT INTO programs (code) VALUES (?)",
        [code || ""],
        (err, dbResult) => {
          if (err) {
            console.error(err);
            return res.json({ tokens: [], variables: {}, steps: ["DB Error"] });
          }

          const programId = dbResult.insertId;

          db.query(
            "INSERT INTO executions (program_id, tokens, output) VALUES (?, ?, ?)",
            [programId, JSON.stringify(tokens), JSON.stringify(result.variables)],
            () => {
              const { printed, consoleOutput } = splitOutput(result.output);
              res.json({
                tokens,
                variables: result.variables,
                steps: result.steps,
                printed,
                console: consoleOutput
              });
            }
          );
        }
      );

      return;
    }

    // initial run
    const result = execute(tokens, inputs || []);

    if (result.waitingForInput) {
      // include tokens in state so client can resume without re-lexing
      result.state = { ...(result.state || {}), tokens };
      return res.json(result);
    }

    // finished — save and return
    const { printed, consoleOutput } = splitOutput(result.output);

    if (!db || typeof db.query !== "function") {
      return res.json({
        tokens,
        variables: result.variables,
        steps: result.steps,
        printed,
        console: consoleOutput
      });
    }

    db.query(
      "INSERT INTO programs (code) VALUES (?)",
      [code || ""],
      (err, dbResult) => {
        if (err) {
          console.error(err);
          return res.json({ tokens: [], variables: {}, steps: ["DB Error"] });
        }

        const programId = dbResult.insertId;

        db.query(
          "INSERT INTO executions (program_id, tokens, output) VALUES (?, ?, ?)",
          [programId, JSON.stringify(tokens), JSON.stringify(result.variables)],
          () => {
            res.json({
              tokens,
              variables: result.variables,
              steps: result.steps,
              printed,
              console: consoleOutput
            });
          }
        );
      }
    );

  } catch (error) {
    res.json({
      tokens: [],
      variables: {},
      steps: [`⚠ ${error.message}`],
      printed: [],
      console: []
    });
  }
};

export const getHistory = (req, res) => {
  try {
    if (!db || typeof db.query !== "function") {
      return res.json({ history: [] });
    }

    db.query(
      "SELECT * FROM executions ORDER BY id DESC LIMIT 50",
      (err, results) => {
        if (err) {
          console.error(err);
          return res.json({ history: [] });
        }

        res.json({ history: results });
      }
    );
  } catch (error) {
    res.json({ history: [] });
  }
};