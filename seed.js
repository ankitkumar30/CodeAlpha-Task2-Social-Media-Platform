
const db = require('./db');
const bcrypt = require('bcryptjs');

function run(q, p=[]) {
  return new Promise((res,rej)=>{
    db.run(q, p, function(err){ if(err) rej(err); else res(this); });
  });
}

(async () => {
  try {
    const pw = bcrypt.hashSync('demo1234', 10);
    await run("INSERT OR IGNORE INTO users (name,email,password_hash) VALUES (?,?,?)", ["Alice","alice@example.com",pw]);
    await run("INSERT OR IGNORE INTO users (name,email,password_hash) VALUES (?,?,?)", ["Bob","bob@example.com",pw]);
    await run("INSERT OR IGNORE INTO posts (user_id,content) VALUES (?,?)", [1,"Hello, this is Alice's first post!"]);
    await run("INSERT OR IGNORE INTO posts (user_id,content) VALUES (?,?)", [2,"Hey there, Bob here."]);

    console.log("Seed complete. Users: alice@example.com / demo1234 , bob@example.com / demo1234");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
