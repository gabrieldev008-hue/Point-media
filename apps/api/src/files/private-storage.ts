import { Inject, Injectable } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ENV, type Environment } from '../config';
export abstract class PrivateStorage {
  abstract put(key: string, contents: Buffer): Promise<void>;
  abstract get(key: string): Promise<Buffer>;
  abstract remove(key: string): Promise<void>;
}
@Injectable()
export class LocalPrivateStorage extends PrivateStorage {
  constructor(@Inject(ENV) private readonly env: Environment) { super(); }
  private file(key: string) {
    if (!/^[a-f0-9-]{36}$/.test(key)) throw new Error('Invalid storage identifier');
    return resolve(this.env.STORAGE_DIRECTORY, key);
  }
  async put(key: string, contents: Buffer) {
    await mkdir(this.env.STORAGE_DIRECTORY, { recursive: true });
    await writeFile(this.file(key), contents, { flag: 'wx', mode: 0o600 });
  }
  get(key: string) { return readFile(this.file(key)); }
  async remove(key: string) {
    try { await unlink(this.file(key)); }
    catch (error) { if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error; }
  }
}
