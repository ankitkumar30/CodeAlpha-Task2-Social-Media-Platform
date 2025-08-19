
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: 'social-secret',
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

// helpers
function all(q,p=[]) { return new Promise((res,rej)=>db.all(q,p,(e,r)=>e?rej(e):res(r))); }
function get(q,p=[]) { return new Promise((res,rej)=>db.get(q,p,(e,r)=>e?rej(e):res(r))); }
function run(q,p=[]) { return new Promise((res,rej)=>db.run(q,p,function(e){e?rej(e):res(this);})); }

function requireAuth(req,res,next){ if(req.session.user) next(); else res.status(401).json({error:'Login required'}); }

// Auth routes
app.post('/api/register', async (req,res)=>{
  const {name,email,password} = req.body;
  if(!name||!email||!password) return res.status(400).json({error:"Missing"});
  try{
    const hash = bcrypt.hashSync(password,10);
    await run("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",[name,email,hash]);
    res.json({message:"Registered"});
  }catch(e){res.status(400).json({error:"Email exists"});}
});
app.post('/api/login', async (req,res)=>{
  const {email,password} = req.body;
  const user = await get("SELECT * FROM users WHERE email=?",[email]);
  if(!user) return res.status(401).json({error:"Invalid"});
  if(!bcrypt.compareSync(password,user.password_hash)) return res.status(401).json({error:"Invalid"});
  req.session.user={id:user.id,name:user.name,email:user.email};
  res.json({user:req.session.user});
});
app.post('/api/logout',(req,res)=>{req.session.destroy(()=>res.json({message:"Logged out"}));});

app.get('/api/me',(req,res)=>res.json({user:req.session.user||null}));

// Posts
app.post('/api/posts', requireAuth, async (req,res)=>{
  const r=await run("INSERT INTO posts (user_id,content) VALUES (?,?)",[req.session.user.id,req.body.content]);
  res.json({id:r.lastID});
});
app.get('/api/posts', async (req,res)=>{
  const posts = await all("SELECT p.*, u.name as author FROM posts p JOIN users u ON p.user_id=u.id ORDER BY p.created_at DESC");
  res.json(posts);
});

// Comments
app.post('/api/posts/:id/comments', requireAuth, async (req,res)=>{
  const r=await run("INSERT INTO comments (post_id,user_id,content) VALUES (?,?,?)",[req.params.id,req.session.user.id,req.body.content]);
  res.json({id:r.lastID});
});
app.get('/api/posts/:id/comments', async (req,res)=>{
  const c=await all("SELECT c.*, u.name as author FROM comments c JOIN users u ON c.user_id=u.id WHERE c.post_id=? ORDER BY c.created_at ASC",[req.params.id]);
  res.json(c);
});

// Likes
app.post('/api/posts/:id/like', requireAuth, async (req,res)=>{
  try { await run("INSERT INTO likes (user_id,post_id) VALUES (?,?)",[req.session.user.id,req.params.id]); }
  catch(e){ return res.json({message:"Already liked"}); }
  res.json({message:"Liked"});
});
app.post('/api/posts/:id/unlike', requireAuth, async (req,res)=>{
  await run("DELETE FROM likes WHERE user_id=? AND post_id=?",[req.session.user.id,req.params.id]);
  res.json({message:"Unliked"});
});
app.get('/api/posts/:id/likes', async (req,res)=>{
  const c=await all("SELECT u.name FROM likes l JOIN users u ON l.user_id=u.id WHERE l.post_id=?",[req.params.id]);
  res.json(c);
});

// Follows
app.post('/api/follow/:id', requireAuth, async (req,res)=>{
  try{await run("INSERT INTO follows (follower_id,followee_id) VALUES (?,?)",[req.session.user.id,req.params.id]);}
  catch(e){return res.json({message:"Already following"});}
  res.json({message:"Followed"});
});
app.post('/api/unfollow/:id', requireAuth, async (req,res)=>{
  await run("DELETE FROM follows WHERE follower_id=? AND followee_id=?",[req.session.user.id,req.params.id]);
  res.json({message:"Unfollowed"});
});
app.get('/api/users/:id/followers', async (req,res)=>{
  const f=await all("SELECT u.name FROM follows f JOIN users u ON f.follower_id=u.id WHERE f.followee_id=?",[req.params.id]);
  res.json(f);
});

app.listen(PORT,()=>console.log("Running http://localhost:"+PORT));
