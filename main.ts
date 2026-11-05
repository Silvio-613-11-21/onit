import 'dotenv/config';

import app from './src/app.ts'

let port = Number(process.env.PORT) || 8080
let host = process.env.HOST ?? "0.0.0.0"

app.listen(port, host, () => {
    console.log(`http://${host}:${port}/api-docs`)
});
