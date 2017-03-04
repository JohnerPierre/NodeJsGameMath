var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'),
    fs = require('fs');

const maxIteration = 4;
const timePerIteration = 6000;

var userMap = [];
var scoreMap = [];
var loseMap = [];
var currentResMap = [];
var result;
var time;


function checkReady(){
  var boolean = true;

  for(key in userMap){
    if(!userMap[key])
      boolean = false;
  }

  return boolean;
}

function random (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function game(){
  var number1 = random(1,64);
  var number2 = random(1,64);
  var message;
  if(random(0,1)){//+
    message = number1+'+'+number2+'=?';
    result = number1+number2;
  }
  else{//-
    message = number1+'-'+number2+'=?';
    result = number1-number2;
  }

  for(key in io.sockets.sockets){
    var name = io.sockets.sockets[key].pseudo;
    if(loseMap[name]==1){
      io.sockets.sockets[key].emit('lose');
    }
    else{
      io.sockets.sockets[key].emit('iteration',message);
    }
  }
}

function checkIfResponse(){
  for(key in currentResMap){
    if(currentResMap[key]==0){
      loseMap[key] = 1;
    }
  }
}

function resetResponse(){
  for(key in currentResMap){
    currentResMap[key]=0;
  }
}

function iteration(counter){
  if(counter == maxIteration+1){
    io.sockets.emit('score',scoreToTable());
    io.sockets.emit('endGame');
  }else{
    if(counter!=1)
        checkIfResponse();
    resetResponse();

     time = new Date().getSeconds();
     game();
     console.log(result);
  }
}

function start(counter){
  for (var i = 1; i <= maxIteration+1; i++) {
    setTimeout(iteration, i*timePerIteration ,i);
  }
}

function scoreToTable(){
  var table = '<h2 id="title" class="text-center">Scores</h2><table class="table table-striped">';
  for(key in scoreMap){
    table += '<tr><td>'+key+'</td><td>'+scoreMap[key]+'</td></tr>';
  }
  table+='</table>';
  return table;
}

function usersToTable(){
  var table = '<h2 id="title" class="text-center">Users</h2>';
  for(key in userMap){
    if(userMap[key]==1)
      table += '<div class="alert alert-success">';
    else
      table += '<div class="alert alert-danger"> ';
    table += '<strong>'+key+'</strong>';
    table += '</div>';
  }
  return table;
}

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection', function (socket, pseudo) {

    socket.on('disconnect', function() {
      pseudo = socket.pseudo;
      loseMap[pseudo]=1;
    });

    socket.on('newUser', function(pseudo) {
        pseudo = ent.encode(pseudo);
        socket.pseudo = pseudo;
        userMap[pseudo] = false;
        io.sockets.emit('usersList',usersToTable());
    });

    socket.on('sendResu', function(data) {
      pseudo = ent.encode(data.pseudo);
      if(loseMap[pseudo]!=1){
        if(data.r == result.toString()){
          currentResMap[pseudo]= 1;
          scoreMap[pseudo]+=timePerIteration/1000-Math.abs(new Date().getSeconds()-time);
        }
        else{
          loseMap[pseudo] = 1;
        }
      }
        io.sockets.emit('score',scoreToTable());
    });

    socket.on('rdyUser', function(pseudo) {
        pseudo = ent.encode(pseudo);
        userMap[pseudo] = true;
        scoreMap[pseudo]=0;
        loseMap[pseudo]=0;
        currentResMap[pseudo]=0;
        socket.broadcast.emit('rdyMessage',pseudo);
        io.sockets.emit('usersList',usersToTable());
        if(checkReady()){
            io.sockets.emit('ready','All User Ready! Go!');
            start(0);
        }
    });

    socket.on('reset',  function() {
      userMap = [];
      scoreMap=[];
      loseMap=[];
      currentResMap=[];
    });

});

server.listen(666);
