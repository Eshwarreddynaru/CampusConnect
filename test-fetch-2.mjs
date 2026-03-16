const url = 'https://dnxpmnjmxelkiohtlnab.supabase.co';

console.log(`Fetching ${url}...`);

try {
    const res = await fetch(url + '/auth/v1/health');
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Body: ${text.slice(0, 100)}`);
} catch (err) {
    console.error('FETCH ERROR:', err);
    if (err.cause) console.error('CAUSE:', err.cause);
}
