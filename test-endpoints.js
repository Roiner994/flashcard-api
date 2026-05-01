

async function testEndpoints() {
  try {
    const exploreRes = await fetch('http://localhost:3000/api/community/explore');
    const exploreData = await exploreRes.json();
    console.log('Explore status:', exploreRes.status);
    console.log('Explore data:', exploreData.length ? exploreData.slice(0, 1) : exploreData);

    const peopleRes = await fetch('http://localhost:3000/api/community/people');
    const peopleData = await peopleRes.json();
    console.log('People status:', peopleRes.status);
    console.log('People data:', peopleData.length ? peopleData.slice(0, 1) : peopleData);
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEndpoints();
