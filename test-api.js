const axios = require('axios');

async function testGenerate() {
  const url = 'http://localhost:3000/api/generate';
  const data = { word: 'Resilient' };

  console.log(`Sending POST request to ${url} with word: "${data.word}"...`);

  try {
    const response = await axios.post(url, data);
    console.log('--- Success! Response Data ---');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('--- Error ---');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

testGenerate();
