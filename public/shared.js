
async function refreshMe(){
  const r=await fetch('/api/me'); const {user}=await r.json();
  const link=document.getElementById('meLink');
  if(link) link.textContent=user?('Hi, '+user.name):'Login';
  if(user && document.getElementById('newPost')) document.getElementById('newPost').style.display='block';
}
async function createPost(){
  const content=document.getElementById('postContent').value;
  await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content})});
  location.reload();
}
async function like(id){
  await fetch(`/api/posts/${id}/like`,{method:'POST'});
  alert("Liked!");
}
refreshMe();
