import type { Express } from "express";
import type { Server } from "node:http";

export async function startTestServer(app: Express) {
    const server: Server = app.listen(0, '127.0.0.1');

    await new Promise<void>((resolve) => server.once('listening', resolve));

    const address = server.address() as { port: number };

    return {
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((resolve) => server.close(() => resolve())),
    };
}

export async function request(baseUrl: string, method: string, path: string, body?: unknown) {
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();

    let json: any = undefined;
    try {
        json = JSON.parse(text);
    } catch {
        json = undefined;
    }

    return { status: response.status, headers: response.headers, text, json };
}
