import request from 'supertest';
import { bootEnvironment } from './env.js';

async function app() {
  return (await bootEnvironment()).app;
}

function withAuth(req, token) {
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req;
}

export async function get(path, token) {
  return withAuth(request(await app()).get(path), token);
}

export async function post(path, body, token) {
  return withAuth(request(await app()).post(path).send(body), token);
}

export async function put(path, body, token) {
  return withAuth(request(await app()).put(path).send(body), token);
}

export async function patch(path, body, token) {
  return withAuth(request(await app()).patch(path).send(body), token);
}

export async function del(path, token) {
  return withAuth(request(await app()).delete(path), token);
}
