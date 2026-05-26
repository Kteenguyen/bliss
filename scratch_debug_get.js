const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyunF6VHhc3nt8CmiqZRUthKVR9vDv0PRcG_eIO_7yPtBwtyG1tcsQtFAETInoYBkq1jg/exec';

async function run() {
  const url = `${WEB_APP_URL}?token=BlissSecureToken2026&sheet=rooms`;
  console.log('Fetching rooms from:', url);
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Raw response:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
