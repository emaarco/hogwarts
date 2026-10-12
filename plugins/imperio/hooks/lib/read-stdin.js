export function readStdin(stream = process.stdin) {
  return new Promise((resolve) => {
    if (stream.isTTY) return resolve(null);
    let data = '';
    stream.setEncoding?.('utf8');
    stream.on('data', (chunk) => { data += chunk; });
    stream.on('end', () => {
      if (!data) return resolve(null);
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
    stream.on('error', () => resolve(null));
  });
}
