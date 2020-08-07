import '/Users/georgexie/workspace/playground/forge/dist/forge.js'

//knowledge
const __dirname = new URL('.', import.meta.url).pathname;

const forge =(self as any).forge; 
const {rsa, publicKeyFromPem, privateKeyFromPem}  = forge.pki;
const publicPem = Deno.readFileSync(`${__dirname}/public.pem`)
const decoded = new TextDecoder().decode(publicPem);
const publicKey = publicKeyFromPem(decoded);

const privatePem = Deno.readFileSync(`${__dirname}/private.pem`)
const decoded_ = new TextDecoder().decode(privatePem);
const privateKey = privateKeyFromPem(decoded_);

const raw = new Uint8Array([1,2,3]);
const cipher = publicKey.encrypt(raw, 'RSA-OAEP')
console.log('cipher: ', cipher);

const tp = cipher.split('').map((item: string) => item.charCodeAt(0));
console.log('tp: ', tp);

//knowledge
// new utf8
// cant use encoder
// const cipher_ = new TextEncoder().encode(cipher);
// console.log('cipher: ', cipher_, cipher_.length);


Deno.writeFileSync('cipher', new Uint8Array(tp));

// const plain = privateKey.decrypt(cipher);
// console.log('plain: ', plain);
/* 
error: Uncaught Error: Encryption block is invalid.
    throw new Error('Encryption block is invalid.');
*/
