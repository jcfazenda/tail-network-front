import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.MOCK_API_PORT || 4300);
const dataFile = path.join(__dirname, 'mock-jobs.json');

app.use(express.json({ limit: '5mb' }));

function ensureDataFile() {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '[]\n', 'utf8');
  }
}

function readJobs() {
  ensureDataFile();

  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs) {
  ensureDataFile();
  fs.writeFileSync(dataFile, `${JSON.stringify(jobs, null, 2)}\n`, 'utf8');
}

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.get('/api/mock-jobs', (_request, response) => {
  response.json(readJobs());
});

app.put('/api/mock-jobs', (request, response) => {
  const jobs = Array.isArray(request.body) ? request.body : [];
  writeJobs(jobs);
  response.json({ ok: true, count: jobs.length });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[mock-api] listening on http://0.0.0.0:${port}`);
});
