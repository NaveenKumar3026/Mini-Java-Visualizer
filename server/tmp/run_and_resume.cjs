const fs = require('fs');
const http = require('http');

const program = fs.readFileSync(__dirname + '/user_prog.json');

function post(data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/compiler/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let out = '';
      res.on('data', (d) => out += d);
      res.on('end', () => resolve(out));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const first = await post(program);
    console.log('FIRST RESPONSE:\n', first);

    const parsed = JSON.parse(first);
    if (parsed.waitingForInput && parsed.state) {
      // send resume with sample input
      const resumeBody = JSON.stringify({ resume: true, state: parsed.state, inputValue: 'Alice' });
      const second = await post(resumeBody);
      console.log('\nSECOND RESPONSE:\n', second);
    }
  } catch (e) {
    console.error(e);
  }
})();
