/**
 * Server File for Math Game
 * @author Pierre Johner
 * @date 10.03.2017
 */
var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'),
    fs = require('fs');

// Game Rule
const maxIteration = 4;
const timePerIteration = 6000;
const port = 666;


//Global vars
var userMap = [];
var scoreMap = [];
var loseMap = [];
var currentResMap = [];
var result;
var time;

/**
 * Check if all users Ready
 * @return {boolean} True if all ready
 */
function checkReady(){
  var boolean = true;

  for(key in userMap){
    if(!userMap[key])
      boolean = false;
  }
  return boolean;
}

/**
 * Random Natural Number Generator
 * @param  {integer} low  range
 * @param  {integer} high range
 * @return {integer}      random number
 */
function random (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

/**
 * Game iteration calcul
 */
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

/**
 * Check if users response
 */
function checkIfResponse(){
  for(key in currentResMap){
    if(currentResMap[key]==0){
      loseMap[key] = 1;
    }
  }
}

/**
 * Reset Response for each iteration
 */
function resetResponse(){
  for(key in currentResMap){
    currentResMap[key]=0;
  }
}

/**
 * Iteration Game Control
 * @param  {integer} counter round
 */
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

/**
 * Game Iteration Loop
 */
function start(){
  for (var i = 1; i <= maxIteration+1; i++) {
    setTimeout(iteration, i*timePerIteration ,i);
  }
}

/**
 * Translate Score in HTML table
 * @return {string} html code
 */
function scoreToTable(){
  var table = '<h2 id="title" class="text-center">Scores</h2><table class="table table-striped">';
  for(key in scoreMap){
    table += '<tr><td>'+key+'</td><td>'+scoreMap[key]+'</td></tr>';
  }
  table+='</table>';
  return table;
}

/**
 * Translate Users ready in html
 * @return {string} html code
 */
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

//Link Server
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});

//Socket behavior
io.sockets.on('connection', function (socket, pseudo) {

    // When user disconnect make him lose
    socket.on('disconnect', function() {
      pseudo = socket.pseudo;
      loseMap[pseudo]=1;
    });

    //When new user add him in vars and send him others
    socket.on('newUser', function(pseudo) {
        pseudo = ent.encode(pseudo);
        socket.pseudo = pseudo;
        userMap[pseudo] = false;
        io.sockets.emit('usersList',usersToTable());
    });

    //When user respond data
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

    //When user is ready init vars
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
            start();
        }
    });

    //When user want reset current game
    socket.on('reset',  function() {
      userMap = [];
      scoreMap=[];
      loseMap=[];
      currentResMap=[];
    });

});

// Set Port where lisen
server.listen(port);
