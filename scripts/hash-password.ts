// 產生最高管理者密碼的雜湊：npm run hash-password
import { hashPassword } from '../src/lib/auth/password';

const MIN_LENGTH = 12;

/** 讀取一行輸入；在終端機中不顯示輸入的字元 */
async function readSecret(prompt: string): Promise<string> {
  const { stdin, stdout } = process;
  stdout.write(prompt);

  if (!stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8').split(/\r?\n/)[0];
  }

  return new Promise((resolve) => {
    let input = '';
    const onData = (data: string) => {
      for (const ch of data) {
        if (ch === '\r' || ch === '\n') {
          stdin.off('data', onData);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(input);
          return;
        }
        if (ch === '\u0003') {
          stdout.write('\n');
          process.exit(130);
        }
        input = ch === '\u007f' || ch === '\b' ? Array.from(input).slice(0, -1).join('') : input + ch;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const password = await readSecret('請輸入最高管理者密碼：');
  if (Array.from(password).length < MIN_LENGTH) {
    console.error(`密碼至少要 ${MIN_LENGTH} 個字元。`);
    process.exit(1);
  }
  if (process.stdin.isTTY && (await readSecret('再輸入一次：')) !== password) {
    console.error('兩次輸入不一致。');
    process.exit(1);
  }

  console.log('\n把下面這一行貼到 .env（上線時貼到 Vercel 的環境變數）：\n');
  console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(password)}`);
}

main();
