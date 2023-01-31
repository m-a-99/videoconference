const http = require('http');
const express = require('express');
const socketio = require('socket.io')
let app = express();

//const https = require('https');
// const fs = require('fs')
// const options = {
//     key: fs.readFileSync(__dirname + '/key.pem'),
//     cert: fs.readFileSync(__dirname + '/cert.pem')
// };
//let server = https.createServer(options,app)
let server = http.createServer(app)
let io = new socketio.Server(server, { cors: { 'origin': '*' } })

app.get("/client.js", (req, res) => {
    res.sendFile(__dirname + "/client.js")
})


app.get('/:room', (req, res) => {
    res.sendFile(__dirname + "/index.html");
})

app.get('/' , (req , res)=>{

    res.redirect("/" + Math.floor(Math.random() * Date.now()))
})
io.use((socket,next)=>{
    socket.id = "i" + Math.floor(Math.random() * Date.now())+"d";
    next()
})

io.on("connection", (socket) => {
    console.log(socket.id);
    console.log(socket.handshake.query.room)
    socket.join(socket.handshake.query.room)
    socket.to(socket.handshake.query.room).emit("peer connect", socket.id)

    socket.on("ready to get offer",(id)=>{
        socket.to(id).emit("ready to get offer",socket.id)
    })
    socket.on("be ready to get offer", (id) => {
        socket.to(id).emit("be ready to get offer", socket.id)
    })
 
    socket.on("answer done",(id)=>{
        socket.to(id).emit("answer done",socket.id)
    })
   
    socket.on("stop screenshare",()=>{
        socket.to(socket.handshake.query.room).emit("stop screenshare",socket.id)
    })
    socket.on("offer", (offer, id,type) => {
       socket.to(id).emit("offer", offer, socket.id,type);
    })
    socket.on("answer", (answer, id,type) => {
        socket.to(id).emit("answer", answer, socket.id,type)
    })
    socket.on("candidate", (candidate, id,type) => {
        socket.to(id).emit("candidate", candidate, socket.id, type)
    })
    socket.on("disconnect",(reason)=>{
        console.log(socket.id+" disconnect")
        socket.to(socket.handshake.query.room).emit("leave",socket.id)
    })
})


server.listen(process.env.PORT||5000);
