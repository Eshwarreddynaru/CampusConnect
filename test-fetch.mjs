const url = 'https://dnxpmnjmxelkiohtlnab.supabase.co';

console.log(`Fetching ${url}...`);

fetch(url)
    .then(res => console.log(`Success! Status: ${res.status} ${res.statusText}`))
    .catch(err => {
        console.error(`Fetch failed: ${err.cause ? err.cause : err.message}`);
        if (err.cause) console.error(err.cause);
    });
