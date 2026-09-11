const fs = require('fs');

let content = fs.readFileSync('app/batch/[batchId]/page.tsx', 'utf8');

// I will just write a new file completely instead of doing complex regex.
