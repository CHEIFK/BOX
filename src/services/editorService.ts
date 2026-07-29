/** editorService — wraps Tauri read_file / write_file commands */
import { invoke } from '@tauri-apps/api/core';

/** Read a file from disk as a UTF-8 string. */
export async function readFile(path: string): Promise<string> {
  return invoke<string>('read_file', { path });
}

/** Write a UTF-8 string to a file on disk. */
export async function writeFile(path: string, content: string): Promise<void> {
  return invoke<void>('write_file', { path, content });
}
