const axios = require('axios');

async function testChallenge() {
  const port = process.env.PORT || 3000;
  const url = `http://localhost:${port}/api/challenge`;

  // Test Case 1: Good usage
  try {
    console.log('Testing Case 1: Good usage...');
    const res1 = await axios.post(url, {
      word: 'ephemeral',
      phrase: 'The beauty of the sunset was ephemeral, lasting only a few moments.'
    });
    console.log('Response:', res1.data);
  } catch (err) {
    console.error('Case 1 Failed:', err.response?.data || err.message);
  }

  // Test Case 2: Poor usage
  try {
    console.log('\nTesting Case 2: Poor usage...');
    const res2 = await axios.post(url, {
      word: 'ubiquitous',
      phrase: 'I went to the ubiquitous to buy some milk.'
    });
    console.log('Response:', res2.data);
  } catch (err) {
    console.error('Case 2 Failed:', err.response?.data || err.message);
  }
  
  // Test Case 3: Missing fields
  try {
    console.log('\nTesting Case 3: Missing fields...');
    const res3 = await axios.post(url, {
      word: 'fail'
    });
    console.log('Response:', res3.data);
  } catch (err) {
    console.log('Case 3 Expected Error:', err.response?.data?.error);
  }
}

testChallenge();
