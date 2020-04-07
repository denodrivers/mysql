Deno.test(async function test() {
  let timer: number | undefined = undefined;
  await Promise.race([
    new Promise((resolve) => setTimeout(resolve, 1000)).then(() =>
      clearTimeout(timer)
    ),
    new Promise(
      (_, reject) =>
        (timer = setTimeout(() => {
          reject(new Error("connect timeout"));
        }, 2000))
    ),
  ]);
});

await Deno.runTests();
