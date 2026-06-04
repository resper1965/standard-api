async function test() {
  const url = "https://api.standard-grc.com/api/v1/scf/versions/latest";
  // We don't have a token, but let's see if it returns 401 or 500
  const res = await fetch(url);
  console.log(res.status);
  console.log(await res.text());
}
test();
