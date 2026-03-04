import axios from "axios";

const API = "http://localhost:5000/api/compiler";

export const compileCode = async (code, inputs = [], resumeState = null, inputValue = null) => {
  if (resumeState) {
    const res = await axios.post(`${API}/run`, { resume: true, state: resumeState, inputValue });
    return res.data;
  }

  const res = await axios.post(`${API}/run`, { code, inputs });
  return res.data;
};