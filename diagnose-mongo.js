
const { MongoClient } = require('mongodb');

async function diagnose() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  console.log('--- MongoDB Connectivity Diagnostic ---');
  console.log(`URI defined: ${uri ? 'Yes (hidden)' : 'No'}`);
  console.log(`DB Name defined: ${dbName || '(Not set, will use default from URI)'}`);

  if (!uri) {
    console.error('ERROR: MONGODB_URI is not set.');
    process.exit(1);
  }

  const client = new MongoClient(uri.trim());

  try {
    console.log('\nConnecting to MongoDB...');
    await client.connect();
    console.log('OK: Connected successfully.');

    const db = dbName ? client.db(dbName) : client.db();
    console.log(`Using database: ${db.databaseName}`);

    console.log('\nTesting "find" command on "users" collection...');
    // NextAuth usually uses "users" collection
    try {
      const count = await db.collection('users').countDocuments();
      console.log(`OK: Successfully queried "users" collection. Count: ${count}`);
    } catch (e) {
      console.error(`FAIL: Could not query "users" collection.`);
      console.error(`Error message: ${e.message}`);
      if (e.message.includes('requires authentication')) {
        console.log('\nSUGGESTION: Your user might not have permissions for this database, or you need to specify ?authSource=admin in your URI.');
      }
    }

    console.log('\nTesting listCollections...');
    try {
      const collections = await db.listCollections().toArray();
      console.log(`OK: Found ${collections.length} collections.`);
    } catch (e) {
      console.error(`FAIL: Could not list collections.`);
      console.error(`Error message: ${e.message}`);
    }

  } catch (e) {
    console.error('\nFATAL ERROR during connection:');
    console.error(e.message);
  } finally {
    await client.close();
    console.log('\n--- Diagnostic Complete ---');
  }
}

diagnose();
